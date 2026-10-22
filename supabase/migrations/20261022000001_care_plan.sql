-- =============================================================================
-- "Seu Plano" do paciente + biblioteca de itens prontos do profissional
--   * plan_templates: itens salvos por cada profissional (refeições, rotina,
--     cuidados, metas, exames). Só o próprio profissional lê.
--   * care_plans: rascunho só do profissional da consulta; o paciente lê depois
--     de emitido. Documento separado da receita (document_kind 'plano').
--   * finish_consultation passa a emitir também o plano.
-- =============================================================================

alter type public.document_kind add value if not exists 'plano';

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  section text not null check (section in ('objetivo', 'meta', 'cafe', 'almoco', 'lanche', 'jantar', 'rotina', 'cuidado', 'exame')),
  title text not null check (length(btrim(title)) between 1 and 140),
  detail text check (detail is null or length(detail) <= 400),
  created_at timestamptz not null default now()
);
create index plan_templates_prof_idx on public.plan_templates (professional_id, section);

create table public.care_plans (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id),
  patient_id uuid not null references public.profiles (id),
  professional_id uuid not null references public.professionals (id),
  document_id uuid unique references public.clinical_documents (id),
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger care_plans_touch before update on public.care_plans
  for each row execute function public.touch_updated_at();

alter table public.plan_templates enable row level security;
alter table public.care_plans enable row level security;

create policy plan_templates_self_all on public.plan_templates for all
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

create policy plan_author_select on public.care_plans for select
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy plan_author_insert on public.care_plans for insert
  with check (
    document_id is null and issued_at is null
    and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid())
    and exists (
      select 1 from public.appointments a
       where a.id = appointment_id and a.professional_id = care_plans.professional_id
         and a.patient_id = care_plans.patient_id and a.status in ('pago', 'confirmado', 'realizado')
    ));
create policy plan_author_update_draft on public.care_plans for update
  using (document_id is null and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (document_id is null and issued_at is null
    and exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy plan_patient_select on public.care_plans for select
  using (patient_id = auth.uid() and document_id is not null);
create policy plan_director_select on public.care_plans for select using (public.has_role('medical_director'));

-- O médico (ou nutricionista) da consulta lê o próprio documento emitido, para enviar por e-mail.
-- (docs_author_select já cobre clinical_documents.)

-- Encerrar a consulta: agora também emite o "Seu Plano" ------------------------------
drop function if exists public.finish_consultation(uuid, public.outcome_kind, integer, jsonb);

create or replace function public.finish_consultation(
  p_appointment_id uuid,
  p_outcome public.outcome_kind,
  p_return_days integer,
  p_prescription jsonb,
  p_plan jsonb default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_appt public.appointments;
  v_items jsonb;
  v_doc uuid;
  v_plan_doc uuid;
  v_existing public.prescriptions;
  v_existing_plan public.care_plans;
begin
  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if v_appt is null then raise exception 'consulta_nao_encontrada'; end if;
  if not exists (select 1 from public.professionals p where p.id = v_appt.professional_id and p.user_id = auth.uid()) then
    raise exception 'sem_permissao';
  end if;
  if v_appt.status not in ('pago', 'confirmado', 'realizado') then raise exception 'consulta_nao_encerravel'; end if;
  if p_outcome = 'receita_emitida' and p_prescription is null then raise exception 'receita_vazia'; end if;

  select * into v_existing from public.prescriptions where appointment_id = p_appointment_id;
  if v_existing.document_id is not null then raise exception 'receita_ja_emitida'; end if;
  select * into v_existing_plan from public.care_plans where appointment_id = p_appointment_id;
  if v_existing_plan.document_id is not null then raise exception 'plano_ja_emitido'; end if;

  -- Valida o plano antes de gravar qualquer coisa.
  if p_plan is not null then
    if jsonb_typeof(p_plan) <> 'array' or jsonb_array_length(p_plan) > 60 then raise exception 'plano_invalido'; end if;
    if exists (
      select 1 from jsonb_array_elements(p_plan) i
       where coalesce(btrim(i ->> 'title'), '') = ''
          or (i ->> 'section') not in ('objetivo', 'meta', 'cafe', 'almoco', 'lanche', 'jantar', 'rotina', 'cuidado', 'exame')
    ) then
      raise exception 'plano_invalido';
    end if;
  end if;

  update public.appointments set status = 'realizado' where id = p_appointment_id;
  insert into public.outcomes (appointment_id, professional_id, outcome, return_days)
       values (p_appointment_id, v_appt.professional_id, p_outcome, p_return_days)
  on conflict (appointment_id) do update set outcome = excluded.outcome, return_days = excluded.return_days;

  insert into public.clinical_documents (appointment_id, patient_id, professional_id, kind, title)
       values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, 'orientacao', 'Orientações da consulta');

  if p_plan is not null and jsonb_array_length(p_plan) > 0 then
    insert into public.clinical_documents (appointment_id, patient_id, professional_id, kind, title)
         values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, 'plano', 'Seu Plano')
      returning id into v_plan_doc;
    insert into public.care_plans (appointment_id, patient_id, professional_id, document_id, items, issued_at)
         values (p_appointment_id, v_appt.patient_id, v_appt.professional_id, v_plan_doc, p_plan, now())
    on conflict (appointment_id) do update
       set document_id = excluded.document_id, items = excluded.items, issued_at = excluded.issued_at;
  end if;

  if p_prescription is null then
    return jsonb_build_object('document_id', null, 'plan_document_id', v_plan_doc);
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
  return jsonb_build_object('document_id', v_doc, 'plan_document_id', v_plan_doc);
end $$;

revoke all on function public.finish_consultation(uuid, public.outcome_kind, integer, jsonb, jsonb) from public;
grant execute on function public.finish_consultation(uuid, public.outcome_kind, integer, jsonb, jsonb) to authenticated;
