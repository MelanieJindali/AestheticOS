-- The server-side service role (cron worker, account deletion, token custody)
-- needs explicit table privileges. It bypasses RLS by design; it is only ever
-- used server-side (see lib/db/supabase.ts → supabaseAdmin).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
