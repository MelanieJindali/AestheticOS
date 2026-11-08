-- Optional: run the reminder worker every 5 minutes from Supabase itself (free).
-- Requires the pg_cron and pg_net extensions (Database → Extensions).
-- Replace the URL and secret, then run in the SQL editor. Store the secret in Vault in production.
select cron.schedule(
  'aesthetic-os-reminders',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-APP-DOMAIN/api/cron/reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
     ); $$
);
