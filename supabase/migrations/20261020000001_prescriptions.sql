-- =============================================================================
-- Receita montada na consulta + tabela de ativos do médico
--   * doctor_actives: lista privada de cada profissional (ninguém mais lê).
--   * prescriptions: rascunho só do médico autor; o paciente lê depois de emitida.
--   * Staff e admin nunca leem. Sem preço, sem farmácia, sem ligação com repasse.
-- =============================================================================

create table public.doctor_actives (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  default_dose text check (default_dose is null or length(default_dose) <= 60),
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index doctor_actives_prof_idx on public.doctor_actives (professional_id, name);
create trigger doctor_actives_touch before update on public.doctor_actives
  for each row execute function public.touch_updated_at();

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id),
  patient_id uuid not null references public.profiles (id),
  professional_id uuid not null references public.professionals (id),
  document_id uuid unique references public.clinical_documents (id),
  form text not null default '',
  quantity text not null default '',
  directions text not null default '',
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger prescriptions_touch before update on public.prescriptions
  for each row execute function public.touch_updated_at();

alter table public.doctor_actives enable row level security;
alter table public.prescriptions enable row level security;

-- doctor_actives: só o próprio profissional
create policy actives_self_all on public.doctor_actives for all
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

-- prescriptions: o médico da consulta lê e edita o rascunho (antes de emitir); o paciente lê a emitida;
-- o diretor técnico lê. Emissão só pela função finish_consultation.
create policy rx_author_select on public.prescriptions for select
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy rx_author_insert on public.prescriptions for insert
  with check (
    document_id is null and issued_at is null
    and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid())
    and exists (
      select 1 from public.appointments a
       where a.id = appointment_id and a.professional_id = prescriptions.professional_id
         and a.patient_id = prescriptions.patient_id and a.status in ('confirmado', 'realizado')
    ));
create policy rx_author_update_draft on public.prescriptions for update
  using (document_id is null and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (document_id is null and issued_at is null
    and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy rx_patient_select on public.prescriptions for select
  using (patient_id = auth.uid() and document_id is not null);
create policy rx_director_select on public.prescriptions for select using (public.has_role('medical_director'));

-- Encerrar a consulta ------------------------------------------------------------------
-- Marca como realizada, grava o desfecho e, se vier receita, emite o documento do paciente.
create or replace function public.finish_consultation(
  p_appointment_id uuid,
  p_outcome public.outcome_kind,
  p_return_days integer,
  p_prescription jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt public.appointments;
  v_items jsonb;
  v_doc uuid;
  v_existing public.prescriptions;
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null then raise exception 'consulta_nao_encontrada'; end if;
  if not exists (select 1 from public.professionals p where p.id = v_appt.professional_id and p.user_id = auth.uid()) then
    raise exception 'sem_permissao';
  end if;
  if v_appt.status not in ('confirmado', 'realizado') then raise exception 'consulta_nao_encerravel'; end if;
  if p_outcome = 'receita_emitida' and p_prescription is null then raise exception 'receita_vazia'; end if;

  select * into v_existing from public.prescriptions where appointment_id = p_appointment_id;
  if v_existing.document_id is not null then raise exception 'receita_ja_emitida'; end if;

  update public.appointments set status = 'realizado' where id = p_appointment_id;
  insert into public.outcomes (appointment_id, professional_id, outcome, return_days)
       values (p_appointment_id, v_appt.professional_id, p_outcome, p_return_days)
  on conflict (appointment_id) do update set outcome = excluded.outcome, return_days = excluded.return_days;

  insert into public.clinical_documents (appointment_id, patient_id, professional_id, kind, title)
       values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, 'orientacao', 'Orientações da consulta');

  if p_prescription is null then
    return jsonb_build_object('document_id', null);
  end if;

  v_items := coalesce(p_prescription -> 'items', '[]'::jsonb);
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then raise exception 'receita_vazia'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_items) i
     where coalesce(btrim(i ->> 'name'), '') = '' or coalesce(btrim(i ->> 'dose'), '') = ''
  ) or coalesce(btrim(p_prescription ->> 'form'), '') = ''
    or coalesce(btrim(p_prescription ->> 'quantity'), '') = ''
    or coalesce(btrim(p_prescription ->> 'directions'), '') = '' then
    raise exception 'receita_incompleta';
  end if;

  -- O PDF assinado (ICP-Brasil) chega depois pela plataforma de telemedicina (telemed-webhook preenche pdf_path).
  insert into public.clinical_documents (appointment_id, patient_id, professional_id, kind, title)
       values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, 'receita', 'Receita de suplemento manipulado')
    returning id into v_doc;

  insert into public.prescriptions (appointment_id, patient_id, professional_id, document_id, form, quantity, directions, items, issued_at)
       values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, v_doc,
               btrim(p_prescription ->> 'form'), btrim(p_prescription ->> 'quantity'), btrim(p_prescription ->> 'directions'),
               v_items, now())
  on conflict (appointment_id) do update
     set document_id = excluded.document_id, form = excluded.form, quantity = excluded.quantity,
         directions = excluded.directions, items = excluded.items, issued_at = excluded.issued_at;

  perform public.audit('emitiu_receita', 'prescriptions', p_appointment_id::text);
  return jsonb_build_object('document_id', v_doc);
end $$;

revoke all on function public.finish_consultation(uuid, public.outcome_kind, integer, jsonb) from public;
grant execute on function public.finish_consultation(uuid, public.outcome_kind, integer, jsonb) to authenticated;
