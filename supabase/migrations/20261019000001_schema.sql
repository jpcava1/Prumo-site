-- =============================================================================
-- Prumo — esquema do banco (Supabase / Postgres 15+)
-- Regras do projeto refletidas aqui:
--   * Não existe tabela de pedidos de farmácia nem preço de fórmula.
--   * Repasse do profissional = atendimentos realizados × valor fixo.
--     Nenhuma coluna liga repasse a receita (clinical_documents) ou a farmácia.
--   * Dado de saúde (triagem, documentos) com acesso restrito por RLS (migration 2).
-- =============================================================================

create extension if not exists btree_gist;

-- Tipos ----------------------------------------------------------------------
create type public.app_role as enum ('patient', 'staff', 'doctor', 'medical_director', 'admin');
create type public.consent_type as enum ('termos', 'privacidade', 'dados_saude', 'tcle', 'cancelamento', 'marketing');
create type public.care_line_status as enum ('ativa', 'fase2', 'fora');
create type public.professional_kind as enum ('medico', 'nutricionista');
create type public.appointment_kind as enum ('primeira', 'retorno');
create type public.appointment_status as enum
  ('reservado', 'pago', 'confirmado', 'realizado', 'nao_compareceu', 'cancelado', 'estornado', 'expirado');
create type public.payment_status as enum ('pendente', 'pago', 'recusado', 'estornado', 'expirado');
create type public.document_kind as enum ('receita', 'orientacao', 'pedido_exame', 'encaminhamento');
create type public.outcome_kind as enum ('orientacao', 'receita_emitida', 'pedido_exame', 'encaminhamento', 'fora_escopo');
create type public.pharmacy_choice as enum ('farmashop', 'baixou_pdf');
create type public.triage_status as enum ('rascunho', 'enviada');

-- Utilitário de updated_at --------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Perfis ----------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'patient',
  full_name text,
  cpf text unique check (cpf is null or cpf ~ '^\d{11}$'),
  birth_date date,
  phone text check (phone is null or phone ~ '^\d{10,11}$'),
  email text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Consentimentos (versão + momento + IP) -------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.consent_type not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  revoked_at timestamptz
);
create index consents_user_idx on public.consents (user_id, type);

-- Linhas de cuidado (preço editável no painel) -----------------------------------
create table public.care_lines (
  slug text primary key,
  name text not null,
  short text not null default '',
  status public.care_line_status not null default 'ativa',
  price_cents integer not null check (price_cents > 0),
  return_price_cents integer not null check (return_price_cents > 0),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger care_lines_touch before update on public.care_lines
  for each row execute function public.touch_updated_at();

-- Triagem versionada --------------------------------------------------------------
create table public.triage_versions (
  id uuid primary key default gen_random_uuid(),
  care_line text not null references public.care_lines (slug),
  version integer not null,
  definition jsonb not null,
  published_at timestamptz,
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (care_line, version)
);

create table public.triage_responses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  care_line text not null references public.care_lines (slug),
  version_id uuid not null references public.triage_versions (id),
  answers jsonb not null default '{}'::jsonb,
  alerts jsonb not null default '[]'::jsonb,   -- visível só para médico e diretor técnico
  status public.triage_status not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index triage_responses_patient_idx on public.triage_responses (patient_id);
create trigger triage_responses_touch before update on public.triage_responses
  for each row execute function public.touch_updated_at();

-- Profissionais ---------------------------------------------------------------------
-- Dados públicos (nome, CRM, foto). O valor pago fica em professional_fees (só admin).
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  kind public.professional_kind not null default 'medico',
  full_name text not null,
  council text not null check (council in ('CRM', 'CRN')),
  council_number text not null,
  council_uf char(2) not null,
  rqe text,
  specialty text,
  photo_url text,
  bio text,
  care_lines text[] not null default '{}',  -- vazio = atende todas as linhas ativas
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.professional_fees (
  professional_id uuid primary key references public.professionals (id) on delete cascade,
  first_consult_cents integer not null default 6000 check (first_consult_cents >= 0),
  return_consult_cents integer not null default 4000 check (return_consult_cents >= 0),
  updated_at timestamptz not null default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index availability_prof_idx on public.availability (professional_id, weekday);

-- Agendamentos ----------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id),
  professional_id uuid not null references public.professionals (id),
  care_line text not null references public.care_lines (slug),
  kind public.appointment_kind not null default 'primeira',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'reservado',
  hold_expires_at timestamptz,
  room_url text,
  external_ref text unique,             -- id da consulta na plataforma de telemedicina
  price_cents integer not null,
  triage_response_id uuid references public.triage_responses (id),
  refund_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at),
  -- Dois pacientes nunca ocupam o mesmo horário do mesmo profissional.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('reservado', 'pago', 'confirmado', 'realizado', 'nao_compareceu'))
);
create index appointments_patient_idx on public.appointments (patient_id, starts_at desc);
create index appointments_prof_idx on public.appointments (professional_id, starts_at);
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Pagamentos (só da consulta, na conta da Prumo) -------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id),
  patient_id uuid not null references public.profiles (id),
  gateway text not null default 'asaas',
  gateway_id text unique,
  status public.payment_status not null default 'pendente',
  method text check (method in ('pix', 'cartao')),
  amount_cents integer not null,
  invoice_url text,
  pix_qr_base64 text,
  pix_copy_paste text,
  nfse_id text,
  nfse_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_appointment_idx on public.payments (appointment_id);

-- Documentos clínicos (gerados pela plataforma certificada) -------------------------
create table public.clinical_documents (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id),
  patient_id uuid not null references public.profiles (id),
  professional_id uuid not null references public.professionals (id),
  kind public.document_kind not null,
  title text not null,
  pdf_path text,              -- caminho no bucket privado clinical-docs
  external_id text,
  issued_at timestamptz not null default now()
);
create index clinical_documents_patient_idx on public.clinical_documents (patient_id, issued_at desc);

-- Desfecho marcado pelo profissional (qualidade; NÃO entra no repasse) -------------
create table public.outcomes (
  appointment_id uuid primary key references public.appointments (id),
  professional_id uuid not null references public.professionals (id),
  outcome public.outcome_kind not null,
  return_days integer check (return_days is null or return_days between 7 and 365),
  created_at timestamptz not null default now()
);

-- Escolha de farmácia (prova de que a escolha é real; só agregado) ---------------
create table public.pharmacy_choice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_id uuid not null references public.clinical_documents (id),
  choice public.pharmacy_choice not null,
  created_at timestamptz not null default now()
);

-- Auditoria, LGPD e notificações --------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text,
  record_id text,
  ip text,
  at timestamptz not null default now()
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'concluido'))
);

create table public.notifications_log (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id),
  kind text not null check (kind in ('confirmacao', 'lembrete_24h', 'lembrete_1h', 'documentos', 'retorno')),
  channel text not null check (channel in ('email', 'whatsapp')),
  sent_at timestamptz not null default now(),
  unique (appointment_id, kind, channel)
);
