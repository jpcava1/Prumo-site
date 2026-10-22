-- Personal trainer (CREF) na equipe, para a linha Treino.
-- Profissional de educação física entrega plano de treino (documento de orientação);
-- receita e pedido de exame continuam só com CRM ou CRN.

alter type public.professional_kind add value if not exists 'educador_fisico';

alter table public.professionals drop constraint if exists professionals_council_check;
alter table public.professionals add constraint professionals_council_check check (council in ('CRM', 'CRN', 'CREF'));

create or replace function public.check_document_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_council text;
begin
  select council into v_council from public.professionals where id = new.professional_id;
  if v_council = 'CREF' and new.kind in ('receita', 'pedido_exame') then
    raise exception 'cref_nao_prescreve';
  end if;
  return new;
end;
$$;

drop trigger if exists clinical_documents_author_check on public.clinical_documents;
create trigger clinical_documents_author_check before insert or update on public.clinical_documents
  for each row execute function public.check_document_author();

-- Cadastro pelo próprio profissional: CREF para personal trainer e linhas padrão por profissão.
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
    case p_kind when 'nutricionista' then 'CRN' when 'educador_fisico' then 'CREF' else 'CRM' end,
    btrim(p_council_number), p_council_uf, nullif(btrim(p_rqe), ''), nullif(btrim(p_specialty), ''), nullif(btrim(p_bio), ''),
    -- Linhas padrão por profissão (o admin pode mudar no painel).
    case p_kind
      when 'nutricionista' then array['dieta', 'suplementacao']
      when 'educador_fisico' then array['treino']
      else array['energia-e-disposicao', 'suplementacao']
    end,
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
