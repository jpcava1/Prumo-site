-- =============================================================================
-- Prumo — arquivos privados (Supabase Storage)
--   triage-files : fotos e PDFs enviados na triagem  -> {patient_id}/{response_id}/{arquivo}
--   clinical-docs: PDFs emitidos pela plataforma      -> {patient_id}/{appointment_id}/{arquivo}
-- Nenhum bucket é público. O front-end usa URL assinada de 10 minutos.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('triage-files', 'triage-files', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']),
  ('clinical-docs', 'clinical-docs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- triage-files: o paciente envia e lê os próprios arquivos (pasta = seu id)
create policy "triage files: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'triage-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "triage files: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'triage-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- O médico da consulta e o diretor técnico leem os arquivos da triagem ligada à consulta
create policy "triage files: médico da consulta lê" on storage.objects for select to authenticated
  using (
    bucket_id = 'triage-files' and (
      public.has_role('medical_director') or exists (
        select 1
        from public.appointments a
        join public.professionals p on p.id = a.professional_id
        where p.user_id = auth.uid()
          and a.triage_response_id::text = (storage.foldername(name))[2]
      )
    )
  );

-- clinical-docs: paciente dono, profissional autor e diretor técnico leem. Escrita só pelo servidor.
create policy "clinical docs: leitura restrita" on storage.objects for select to authenticated
  using (
    bucket_id = 'clinical-docs' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role('medical_director')
      or exists (
        select 1
        from public.appointments a
        join public.professionals p on p.id = a.professional_id
        where p.user_id = auth.uid() and a.id::text = (storage.foldername(name))[2]
      )
    )
  );
