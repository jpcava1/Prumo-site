-- =============================================================================
-- Prumo — funções de negócio e Row Level Security
-- =============================================================================

-- Papel do usuário logado -----------------------------------------------------------
create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = any(roles) from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.request_ip() returns text
language sql stable as $$
  select nullif(split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for'), ''), ',', 1), '')
$$;

-- Cria o perfil quando alguém se cadastra -------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ninguém muda o próprio papel; só admin -------------------------------------------
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.has_role('admin') and auth.uid() is not null then
    raise exception 'sem_permissao_para_mudar_papel';
  end if;
  if new.id is distinct from old.id then
    raise exception 'id_imutavel';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- IP e momento do consentimento são definidos pelo servidor --------------------------
create or replace function public.stamp_consent() returns trigger
language plpgsql as $$
begin
  new.accepted_at := now();
  new.ip := coalesce(public.request_ip(), new.ip);
  return new;
end $$;
create trigger consents_stamp before insert on public.consents
  for each row execute function public.stamp_consent();

-- Auditoria ---------------------------------------------------------------------
create or replace function public.audit(p_action text, p_table text, p_record text) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, table_name, record_id, ip)
  values (auth.uid(), p_action, p_table, p_record, public.request_ip())
$$;

-- Horários disponíveis -----------------------------------------------------------
-- Retorna só horários livres (nenhum dado de paciente). Fuso: America/Sao_Paulo.
create or replace function public.available_slots(p_care_line text, p_from date, p_days integer default 14)
returns table (professional_id uuid, starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with days as (
    select (p_from + g)::date as day
    from generate_series(0, least(greatest(p_days, 1), 31) - 1) g
  ),
  candidates as (
    select a.professional_id,
           (t.local_ts at time zone 'America/Sao_Paulo') as starts_at
    from days d
    join public.availability a on a.weekday = extract(dow from d.day)
    join public.professionals p on p.id = a.professional_id and p.active
      and (cardinality(p.care_lines) = 0 or p_care_line = any(p.care_lines))
    cross join lateral generate_series(
      d.day + a.start_time, d.day + a.end_time - interval '30 minutes', interval '30 minutes'
    ) as t(local_ts)
  )
  select c.professional_id, c.starts_at
  from candidates c
  where c.starts_at >= now() + interval '60 minutes'
    and exists (select 1 from public.care_lines cl where cl.slug = p_care_line and cl.status = 'ativa')
    and not exists (
      select 1 from public.appointments ap
      where ap.professional_id = c.professional_id
        and ap.status in ('reservado', 'pago', 'confirmado', 'realizado', 'nao_compareceu')
        and not (ap.status = 'reservado' and ap.hold_expires_at < now())
        and tstzrange(ap.starts_at, ap.ends_at, '[)') && tstzrange(c.starts_at, c.starts_at + interval '30 minutes', '[)')
    )
  order by c.starts_at, c.professional_id
$$;

-- Reserva de horário (trava de 15 minutos) ------------------------------------------
create or replace function public.reserve_slot(
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_care_line text,
  p_kind public.appointment_kind default 'primeira',
  p_triage_response_id uuid default null
) returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_line public.care_lines;
  v_appt public.appointments;
begin
  if v_uid is null then raise exception 'login_necessario'; end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.full_name is null or v_profile.cpf is null or v_profile.birth_date is null then
    raise exception 'cadastro_incompleto';
  end if;
  if v_profile.birth_date > (current_date - interval '18 years')::date then
    raise exception 'menor_de_idade';
  end if;
  if not exists (
    select 1 from public.consents c
    where c.user_id = v_uid and c.type = 'dados_saude' and c.revoked_at is null
  ) then
    raise exception 'consentimento_dados_saude_ausente';
  end if;

  select * into v_line from public.care_lines where slug = p_care_line;
  if v_line is null or v_line.status <> 'ativa' then raise exception 'linha_indisponivel'; end if;

  if p_kind = 'primeira' then
    if p_triage_response_id is null or not exists (
      select 1 from public.triage_responses tr
      where tr.id = p_triage_response_id and tr.patient_id = v_uid
        and tr.status = 'enviada' and tr.care_line = p_care_line
    ) then
      raise exception 'triagem_necessaria';
    end if;
  else
    if not exists (
      select 1 from public.appointments x
      where x.patient_id = v_uid and x.status = 'realizado'
    ) then
      raise exception 'retorno_sem_consulta_anterior';
    end if;
  end if;

  -- O horário precisa ser um dos horários livres oferecidos.
  if not exists (
    select 1 from public.available_slots(p_care_line, (p_starts_at at time zone 'America/Sao_Paulo')::date, 1) s
    where s.professional_id = p_professional_id and s.starts_at = p_starts_at
  ) then
    raise exception 'horario_indisponivel';
  end if;

  -- Libera travas vencidas e a trava anterior deste paciente.
  update public.appointments set status = 'expirado'
   where status = 'reservado' and (hold_expires_at < now() or patient_id = v_uid);

  begin
    insert into public.appointments (
      patient_id, professional_id, care_line, kind, starts_at, ends_at, status,
      hold_expires_at, price_cents, triage_response_id
    ) values (
      v_uid, p_professional_id, p_care_line, p_kind, p_starts_at, p_starts_at + interval '30 minutes', 'reservado',
      now() + interval '15 minutes',
      case when p_kind = 'primeira' then v_line.price_cents else v_line.return_price_cents end,
      p_triage_response_id
    ) returning * into v_appt;
  exception when exclusion_violation then
    raise exception 'horario_indisponivel';
  end;

  return v_appt;
end $$;

-- Cancelamento: grátis até 2 h antes -------------------------------------------
create or replace function public.cancel_appointment(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt public.appointments;
begin
  select * into v_appt from public.appointments where id = p_id and patient_id = auth.uid() for update;
  if v_appt is null then raise exception 'consulta_nao_encontrada'; end if;

  if v_appt.status = 'reservado' then
    update public.appointments set status = 'cancelado', cancelled_at = now() where id = p_id;
    return jsonb_build_object('charged', false);
  end if;

  if v_appt.status not in ('pago', 'confirmado') then
    raise exception 'consulta_nao_cancelavel';
  end if;

  if v_appt.starts_at - now() < interval '2 hours' then
    -- Dentro de 2 h a consulta é cobrada; o horário continua reservado para o paciente.
    return jsonb_build_object('charged', true);
  end if;

  update public.appointments
     set status = 'cancelado', cancelled_at = now(), refund_requested = true
   where id = p_id;
  return jsonb_build_object('charged', false);
end $$;

-- Triagem para o médico (com registro de auditoria) --------------------------------
create or replace function public.get_triage_for_appointment(p_appointment_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt public.appointments;
  v_resp public.triage_responses;
  v_def jsonb;
  v_patient public.profiles;
  v_is_owner boolean;
begin
  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt is null then raise exception 'consulta_nao_encontrada'; end if;

  select exists (
    select 1 from public.professionals p where p.id = v_appt.professional_id and p.user_id = auth.uid()
  ) into v_is_owner;

  if not (v_is_owner or public.has_role('medical_director')) then
    raise exception 'sem_permissao';
  end if;

  select * into v_resp from public.triage_responses where id = v_appt.triage_response_id;
  select definition into v_def from public.triage_versions where id = v_resp.version_id;
  select * into v_patient from public.profiles where id = v_appt.patient_id;

  perform public.audit('abriu_triagem', 'triage_responses', coalesce(v_resp.id::text, 'sem_triagem'));

  return jsonb_build_object(
    'definition', v_def,
    'answers', coalesce(v_resp.answers, '{}'::jsonb),
    'alerts', coalesce(v_resp.alerts, '[]'::jsonb),
    'patient', jsonb_build_object(
      'full_name', v_patient.full_name,
      'age', case when v_patient.birth_date is null then null
                  else extract(year from age(v_patient.birth_date))::int end,
      'sex', v_resp.answers ->> 'sexo'
    )
  );
end $$;

-- Publicar nova versão da triagem (só diretor técnico) -----------------------------
create or replace function public.publish_triage_version(p_care_line text, p_definition jsonb)
returns public.triage_versions
language plpgsql security definer set search_path = public as $$
declare
  v_row public.triage_versions;
  v_next integer;
begin
  if not public.has_role('medical_director') then raise exception 'sem_permissao'; end if;
  if p_definition ->> 'care_line' is distinct from p_care_line then raise exception 'linha_divergente'; end if;
  if jsonb_typeof(p_definition -> 'questions') <> 'array' or jsonb_array_length(p_definition -> 'questions') = 0 then
    raise exception 'definicao_invalida';
  end if;
  select coalesce(max(version), 0) + 1 into v_next from public.triage_versions where care_line = p_care_line;
  insert into public.triage_versions (care_line, version, definition, published_at, author_id)
  values (p_care_line, v_next, p_definition, now(), auth.uid())
  returning * into v_row;
  perform public.audit('publicou_triagem', 'triage_versions', v_row.id::text);
  return v_row;
end $$;

-- Mudar papel de um usuário (só admin) --------------------------------------------
create or replace function public.admin_set_role(p_email text, p_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'sem_permissao'; end if;
  update public.profiles set role = p_role where lower(email) = lower(p_email);
  if not found then raise exception 'usuario_nao_encontrado'; end if;
  perform public.audit('mudou_papel:' || p_role::text, 'profiles', p_email);
end $$;

-- Relatório do painel (só agregados) ---------------------------------------------
-- Repasse = atendimentos REALIZADOS × valor fixo. Não olha receita nem farmácia.
create or replace function public.report_summary(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  if not public.has_role('staff', 'admin', 'medical_director') then raise exception 'sem_permissao'; end if;

  select jsonb_build_object(
    'consultsByDay', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'count', n) order by d) from (
        select to_char(starts_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') d, count(*) n
        from public.appointments
        where starts_at >= p_from and starts_at < p_to and status in ('confirmado', 'realizado', 'nao_compareceu')
        group by 1) s), '[]'::jsonb),
    'consultsByLine', coalesce((
      select jsonb_agg(jsonb_build_object('care_line', care_line, 'count', n)) from (
        select care_line, count(*) n from public.appointments
        where starts_at >= p_from and starts_at < p_to and status in ('confirmado', 'realizado', 'nao_compareceu')
        group by 1) s), '[]'::jsonb),
    'noShowRate', coalesce((
      select round(count(*) filter (where status = 'nao_compareceu')::numeric
                   / nullif(count(*) filter (where status in ('realizado', 'nao_compareceu')), 0), 4)
      from public.appointments where starts_at >= p_from and starts_at < p_to), 0),
    'occupancy', null,
    'funnel', jsonb_build_array(
      jsonb_build_object('step', 'triagens_enviadas', 'count',
        (select count(*) from public.triage_responses where submitted_at >= p_from and submitted_at < p_to)),
      jsonb_build_object('step', 'horarios_reservados', 'count',
        (select count(*) from public.appointments where created_at >= p_from and created_at < p_to)),
      jsonb_build_object('step', 'consultas_pagas', 'count',
        (select count(*) from public.payments where status = 'pago' and paid_at >= p_from and paid_at < p_to)),
      jsonb_build_object('step', 'consultas_realizadas', 'count',
        (select count(*) from public.appointments where status = 'realizado' and starts_at >= p_from and starts_at < p_to))
    ),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'professional_id', p.id, 'full_name', p.full_name,
        'consults', x.n_first + x.n_return,
        'unit_cents', coalesce(f.first_consult_cents, 6000),
        'total_cents', x.n_first * coalesce(f.first_consult_cents, 6000) + x.n_return * coalesce(f.return_consult_cents, 4000)))
      from (
        select professional_id,
               count(*) filter (where kind = 'primeira') n_first,
               count(*) filter (where kind = 'retorno') n_return
        from public.appointments
        where status = 'realizado' and starts_at >= p_from and starts_at < p_to
        group by 1) x
      join public.professionals p on p.id = x.professional_id
      left join public.professional_fees f on f.professional_id = p.id), '[]'::jsonb),
    'pharmacyChoice', jsonb_build_object(
      'farmashop', (select count(*) from public.pharmacy_choice_events where choice = 'farmashop' and created_at >= p_from and created_at < p_to),
      'baixou_pdf', (select count(*) from public.pharmacy_choice_events where choice = 'baixou_pdf' and created_at >= p_from and created_at < p_to))
  ) into v;
  return v;
end $$;

-- Rotina: apaga triagens de quem não agendou (90 dias) ------------------------------
create or replace function public.purge_stale_triage() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.triage_responses tr
   where tr.created_at < now() - interval '90 days'
     and not exists (select 1 from public.appointments a where a.triage_response_id = tr.id);
  get diagnostics n = row_count;
  return n;
end $$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.care_lines enable row level security;
alter table public.triage_versions enable row level security;
alter table public.triage_responses enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_fees enable row level security;
alter table public.availability enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.clinical_documents enable row level security;
alter table public.outcomes enable row level security;
alter table public.pharmacy_choice_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.notifications_log enable row level security;

-- profiles: cada um vê e edita o seu; equipe vê nomes/contatos para operar a agenda
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_staff_select on public.profiles for select
  using (public.has_role('staff', 'admin', 'medical_director'));
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update using (public.has_role('admin'));

-- consents: o paciente registra e vê os seus; diretor técnico audita
create policy consents_self_insert on public.consents for insert with check (user_id = auth.uid());
create policy consents_self_select on public.consents for select using (user_id = auth.uid());
create policy consents_self_revoke on public.consents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_director_select on public.consents for select using (public.has_role('medical_director'));

-- care_lines: leitura pública; edição só admin
create policy care_lines_public_select on public.care_lines for select using (true);
create policy care_lines_admin_update on public.care_lines for update using (public.has_role('admin'));

-- triage_versions: versões publicadas são públicas (não têm dado pessoal)
create policy triage_versions_public_select on public.triage_versions for select
  using (published_at is not null or public.has_role('medical_director'));

-- triage_responses: SÓ o paciente dono e o diretor técnico.
-- Médico lê pela função get_triage_for_appointment (que registra auditoria). Staff e admin: nunca.
create policy triage_self_select on public.triage_responses for select using (patient_id = auth.uid());
create policy triage_self_insert on public.triage_responses for insert with check (patient_id = auth.uid() and status = 'rascunho');
create policy triage_self_update on public.triage_responses for update
  using (patient_id = auth.uid() and status = 'rascunho') with check (patient_id = auth.uid());
create policy triage_director_select on public.triage_responses for select using (public.has_role('medical_director'));

-- professionals: ativos são públicos; admin gerencia
create policy professionals_public_select on public.professionals for select
  using (active or public.has_role('staff', 'admin', 'medical_director') or user_id = auth.uid());
create policy professionals_admin_all on public.professionals for all
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- professional_fees: só admin e o próprio profissional
create policy fees_admin_all on public.professional_fees for all
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy fees_self_select on public.professional_fees for select using (
  exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

-- availability: equipe e o próprio profissional
create policy availability_staff_select on public.availability for select
  using (public.has_role('staff', 'admin', 'medical_director')
         or exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy availability_admin_all on public.availability for all
  using (public.has_role('admin', 'staff')) with check (public.has_role('admin', 'staff'));
create policy availability_self_all on public.availability for all
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

-- appointments: paciente vê as suas; profissional vê a própria agenda; equipe opera.
-- Criação e cancelamento pelo paciente só via funções (reserve_slot / cancel_appointment).
create policy appointments_self_select on public.appointments for select using (patient_id = auth.uid());
create policy appointments_prof_select on public.appointments for select using (
  exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy appointments_staff_select on public.appointments for select
  using (public.has_role('staff', 'admin', 'medical_director'));
create policy appointments_staff_update on public.appointments for update
  using (public.has_role('staff', 'admin')) with check (public.has_role('staff', 'admin'));

-- payments: paciente vê os seus; equipe vê. Escrita só pelo servidor (service role).
create policy payments_self_select on public.payments for select using (patient_id = auth.uid());
create policy payments_staff_select on public.payments for select using (public.has_role('staff', 'admin'));

-- clinical_documents: paciente dono, profissional autor e diretor técnico. Staff/admin: nunca.
create policy docs_self_select on public.clinical_documents for select using (patient_id = auth.uid());
create policy docs_author_select on public.clinical_documents for select using (
  exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy docs_director_select on public.clinical_documents for select using (public.has_role('medical_director'));

-- outcomes: o profissional da consulta grava; diretor técnico lê
create policy outcomes_prof_all on public.outcomes for all
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (
    exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid())
    and exists (select 1 from public.appointments a where a.id = appointment_id and a.professional_id = outcomes.professional_id)
  );
create policy outcomes_director_select on public.outcomes for select using (public.has_role('medical_director'));

-- pharmacy_choice_events: o paciente registra a própria escolha. Leitura só agregada (report_summary).
create policy choice_self_insert on public.pharmacy_choice_events for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.clinical_documents d where d.id = document_id and d.patient_id = auth.uid()));

-- audit_log: só diretor técnico lê
create policy audit_director_select on public.audit_log for select using (public.has_role('medical_director'));

-- deletion_requests: paciente pede e acompanha; admin processa
create policy deletion_self_insert on public.deletion_requests for insert with check (user_id = auth.uid());
create policy deletion_self_select on public.deletion_requests for select using (user_id = auth.uid());
create policy deletion_admin_all on public.deletion_requests for all using (public.has_role('admin'));

-- notifications_log: sem política = só o servidor (service role) acessa.

-- Funções expostas ao front-end ------------------------------------------------------
revoke all on function public.purge_stale_triage() from public;
grant execute on function public.available_slots(text, date, integer) to anon, authenticated;
grant execute on function public.reserve_slot(uuid, timestamptz, text, public.appointment_kind, uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid) to authenticated;
grant execute on function public.get_triage_for_appointment(uuid) to authenticated;
grant execute on function public.publish_triage_version(text, jsonb) to authenticated;
grant execute on function public.admin_set_role(text, public.app_role) to authenticated;
grant execute on function public.report_summary(timestamptz, timestamptz) to authenticated;
