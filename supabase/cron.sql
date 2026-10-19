-- =============================================================================
-- Agendamento dos lembretes (rode UMA vez no SQL Editor do Supabase, depois do deploy).
-- Requer as extensões pg_cron e pg_net (Database > Extensions).
-- Troque <PROJECT_REF> e <CRON_SECRET> pelos valores reais. Não versione o segredo.
-- =============================================================================
select cron.schedule(
  'prumo-lembretes',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
