-- Move pg_net out of the public schema (Supabase advisor: extension_in_public).
-- pg_net does not support ALTER EXTENSION ... SET SCHEMA, so it is reinstalled
-- in the extensions schema. Its functions stay in the `net` schema, so callers
-- such as the reminder cron job (net.http_get) are unaffected. Pending queued
-- requests and stored responses are discarded. No-op when pg_net is absent or
-- already outside public.
do $$
begin
  if exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net' and n.nspname = 'public'
  ) then
    drop extension pg_net;
    create schema if not exists extensions;
    create extension pg_net with schema extensions;
  end if;
end $$;
