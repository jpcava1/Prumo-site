-- =============================================================================
-- Cadastro do profissional pelo próprio site + horários por dia
--   * O médico ou nutricionista cria a conta, responde o questionário e fica
--     "pendente" (inativo) até a Prumo conferir o registro no conselho.
--   * Ele abre horários em dias específicos (availability_dates).
--   * available_slots passa a somar as regras semanais e os horários por dia.
--   * O papel (role) do perfil não muda: o acesso de profissional vem do vínculo
--     professionals.user_id = auth.uid(), como já acontece nas regras de RLS.
-- =============================================================================

alter table public.professionals
  add column approval text not null default 'aprovado' check (approval in ('pendente', 'aprovado', 'recusado')),
  add column graduation_institution text check (graduation_institution is null or length(graduation_institution) <= 120),
  add column graduation_year integer check (graduation_year is null or graduation_year between 1950 and 2100);

-- Horários abertos pelo profissional em dias específicos (horário de Brasília) ------
create table public.availability_dates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  day date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index availability_dates_prof_day_idx on public.availability_dates (professional_id, day);

alter table public.availability_dates enable row level security;

create policy availability_dates_self_all on public.availability_dates for all
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy availability_dates_staff_select on public.availability_dates for select
  using (public.has_role('staff', 'admin', 'medical_director'));
create policy availability_dates_admin_all on public.availability_dates for all
  using (public.has_role('admin', 'staff')) with check (public.has_role('admin', 'staff'));

-- Cadastro do profissional ------------------------------------------------------------
create or replace function public.register_professional(
  p_kind public.professional_kind,
  p_full_name text,
  p_council_number text,
  p_council_uf text,
  p_graduation_institution text,
  p_graduation_year integer,
  p_specialty text default null,
  p_rqe text default null,
  p_bio text default null,
  p_phone text default null
) returns public.professionals
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prof public.professionals;
begin
  if v_uid is null then raise exception 'login_necessario'; end if;
  if exists (select 1 from public.professionals where user_id = v_uid) then raise exception 'profissional_ja_cadastrado'; end if;
  if coalesce(btrim(p_full_name), '') = '' or coalesce(btrim(p_council_number), '') = ''
     or p_council_uf !~ '^[A-Z]{2}$' or coalesce(btrim(p_graduation_institution), '') = '' or p_graduation_year is null then
    raise exception 'cadastro_profissional_incompleto';
  end if;
  if nullif(btrim(p_specialty), '') is not null and nullif(btrim(p_rqe), '') is null then
    raise exception 'especialidade_sem_rqe';
  end if;

  insert into public.professionals (
    user_id, kind, full_name, council, council_number, council_uf, rqe, specialty, bio,
    care_lines, active, approval, graduation_institution, graduation_year
  ) values (
    v_uid, p_kind, btrim(p_full_name),
    case when p_kind = 'nutricionista' then 'CRN' else 'CRM' end,
    btrim(p_council_number), p_council_uf, nullif(btrim(p_rqe), ''), nullif(btrim(p_specialty), ''), nullif(btrim(p_bio), ''),
    -- Nutricionista prescreve suplemento, não medicamento: atende só a linha de suplementação.
    case when p_kind = 'nutricionista' then array['suplementacao'] else '{}'::text[] end,
    false, 'pendente', btrim(p_graduation_institution), p_graduation_year
  ) returning * into v_prof;

  insert into public.professional_fees (professional_id) values (v_prof.id);

  update public.profiles
     set full_name = coalesce(full_name, btrim(p_full_name)),
         phone = coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''), phone)
   where id = v_uid;

  perform public.audit('cadastro_profissional', 'professionals', v_prof.id::text);
  return v_prof;
end $$;

revoke all on function public.register_professional(public.professional_kind, text, text, text, text, integer, text, text, text, text) from public;
grant execute on function public.register_professional(public.professional_kind, text, text, text, text, integer, text, text, text, text) to authenticated;

-- Horários disponíveis: regras semanais + horários por dia ---------------------------
create or replace function public.available_slots(p_care_line text, p_from date, p_days integer default 14)
returns table (professional_id uuid, starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with days as (
    select (p_from + g)::date as day
    from generate_series(0, least(greatest(p_days, 1), 31) - 1) g
  ),
  blocks as (
    select a.professional_id, d.day, a.start_time, a.end_time
      from days d join public.availability a on a.weekday = extract(dow from d.day)
    union
    select ad.professional_id, ad.day, ad.start_time, ad.end_time
      from public.availability_dates ad join days d on d.day = ad.day
  ),
  candidates as (
    select distinct b.professional_id,
           (t.local_ts at time zone 'America/Sao_Paulo') as starts_at
    from blocks b
    join public.professionals p on p.id = b.professional_id and p.active and p.approval = 'aprovado'
      and (cardinality(p.care_lines) = 0 or p_care_line = any(p.care_lines))
    cross join lateral generate_series(
      b.day + b.start_time, b.day + b.end_time - interval '30 minutes', interval '30 minutes'
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
