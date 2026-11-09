-- Security hardening from the Supabase database advisor.
-- 1. Pin search_path on every function (prevents search_path hijacking).
alter function public.touch_updated_at() set search_path = public;
alter function public.consent_immutable() set search_path = public;
-- The consent gate now runs as its owner, so callers no longer need EXECUTE
-- on consent_is_valid.
alter function public.enforce_consent_on_post() security definer set search_path = public;

-- 2. Internal helpers and trigger functions must not be callable through the
--    REST API (/rest/v1/rpc/...). Triggers still fire: Postgres doesn't check
--    EXECUTE on trigger functions for the user whose write fires them.
do $$
declare f text;
begin
  foreach f in array array[
    'public.consent_is_valid(uuid, uuid)', 'public.enforce_child_owner()', 'public.enforce_post_consent_owner()',
    'public.enforce_consent_on_post()', 'public.enforce_consent_on_schedule()', 'public.on_consent_revoked()',
    'public.consent_immutable()', 'public.touch_updated_at()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- Note: connected_account_secrets intentionally has RLS on and no policies,
-- so only the server-side service role can read OAuth tokens.
