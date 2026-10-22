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
