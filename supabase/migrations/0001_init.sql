-- Aesthetic OS — initial schema
-- Principles: every row has user_id; RLS on every table; users can only touch
-- their own rows; secrets live in a table no client role can read; audit log is
-- append-only; before/after posts cannot be scheduled without valid consent.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  muse_can_use_client_data boolean not null default false,
  ai_provider text not null default 'local' check (ai_provider in ('local','claude')),
  reminders_push boolean not null default true,
  reminders_email boolean not null default false,
  region text not null default 'US' check (region in ('US','UK','EU','CA','AU','NZ','OTHER')),
  onboarded boolean not null default false
);

create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) <= 60),
  owner_first_name text check (char_length(owner_first_name) <= 30),
  niche text not null check (char_length(niche) <= 60),
  services jsonb not null default '[]'::jsonb,
  location_type text not null check (location_type in ('studio','mobile','home','virtual')),
  city text check (char_length(city) <= 60),
  region text not null default 'US' check (region in ('US','UK','EU','CA','AU','NZ','OTHER')),
  price_tier text not null check (price_tier in ('accessible','mid','premium','luxury')),
  ideal_client text not null check (char_length(ideal_client) <= 140),
  personality text[] not null default '{}',
  moods text[] not null default '{}',
  palette jsonb not null,
  typography jsonb not null,
  texture text,
  photo_style text,
  voice jsonb not null,
  booking_url text check (booking_url is null or booking_url ~ '^https://'),
  handle text check (char_length(handle) <= 40),
  monthly_income_goal numeric,
  monthly_fixed_costs numeric,
  hours_per_week numeric,
  currency text not null default 'USD',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_alias text not null check (char_length(client_alias) between 1 and 24),
  scope text[] not null,
  platforms jsonb not null default '"all"'::jsonb,
  allow_face boolean not null default false,
  allow_tagging boolean not null default false,
  consent_text_version text not null,
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  signature_svg text not null check (char_length(signature_svg) < 200000),
  signed_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pillar text not null,
  template_type text not null,
  source text not null,
  idea text not null check (char_length(idea) <= 500),
  status text not null default 'draft' check (status in ('idea','draft','review','approved','scheduled','published')),
  is_before_after boolean not null default false,
  has_material_connection boolean not null default false,
  consent_record_id uuid references public.consent_records(id) on delete set null,
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_user_status on public.posts(user_id, status);

create table public.post_variants (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  format_id text not null,
  slots jsonb not null default '{}'::jsonb,
  caption text not null default '' check (char_length(caption) <= 63206),
  hashtags text[] not null default '{}',
  alt_text text not null default '',
  cta_url text,
  suggested_time timestamptz,
  kind text not null default 'single',
  slides jsonb,
  script jsonb,
  compliance jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index post_variants_post on public.post_variants(post_id);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  variant_id uuid not null references public.post_variants(id) on delete cascade,
  platform text not null,
  scheduled_at timestamptz not null,
  mode text not null default 'ready_to_post' check (mode in ('direct','ready_to_post')),
  state text not null default 'pending' check (state in ('pending','reminded','published','failed','cancelled')),
  external_id text
);
create index schedule_due on public.schedule_items(state, scheduled_at);

-- Public metadata about a connection (visible to the user)…
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  account_label text not null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  revoked_at timestamptz
);
-- …and the encrypted tokens, which NO client role may read (service role only).
create table public.connected_account_secrets (
  account_id uuid primary key references public.connected_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz
);

create table public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) <= 60),
  value text not null check (char_length(value) <= 500),
  source text not null default 'user' check (source in ('user','muse','onboarding')),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null,
  title text not null check (char_length(title) <= 140),
  progress numeric not null default 0 check (progress between 0 and 1)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null check (char_length(title) <= 200),
  why text check (char_length(why) <= 500),
  due timestamptz,
  done boolean not null default false,
  origin text not null default 'user' check (origin in ('muse','user')),
  created_at timestamptz not null default now()
);

create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null,
  reach int not null default 0 check (reach >= 0),
  saves int not null default 0 check (saves >= 0),
  shares int not null default 0 check (shares >= 0),
  profile_visits int not null default 0 check (profile_visits >= 0),
  bookings int not null default 0 check (bookings >= 0),
  captured_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual','api'))
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text not null check (actor in ('user','muse','system')),
  action text not null check (char_length(action) <= 80),
  target text check (char_length(target) <= 120),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index audit_user_time on public.audit_log(user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://'),
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create trigger t_brand_updated before update on public.brand_profiles for each row execute function public.touch_updated_at();
create trigger t_posts_updated before update on public.posts for each row execute function public.touch_updated_at();
create trigger t_variants_updated before update on public.post_variants for each row execute function public.touch_updated_at();
create trigger t_memory_updated before update on public.agent_memory for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- integrity: child rows must belong to the same user as their parent
-- ---------------------------------------------------------------------------
create or replace function public.enforce_child_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is distinct from new.user_id then raise exception 'post does not belong to user'; end if;
  return new;
end $$;

create or replace function public.enforce_post_consent_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if new.consent_record_id is not null then
    select user_id into owner from public.consent_records where id = new.consent_record_id;
    if owner is distinct from new.user_id then raise exception 'consent record does not belong to user'; end if;
  end if;
  return new;
end $$;

create trigger t_variant_owner before insert or update on public.post_variants for each row execute function public.enforce_child_owner();
create trigger t_schedule_owner before insert or update on public.schedule_items for each row execute function public.enforce_child_owner();
create trigger t_metric_owner before insert or update on public.metric_snapshots for each row execute function public.enforce_child_owner();
create trigger t_post_owner before insert or update on public.posts for each row execute function public.enforce_post_consent_owner();

-- ---------------------------------------------------------------------------
-- consent gate: a before/after post cannot reach 'scheduled'/'published', and
-- cannot get a schedule item, without a valid (unrevoked, unexpired,
-- before-after-scoped) consent record. Enforced in the database so no app
-- bug or direct API call can bypass it.
-- ---------------------------------------------------------------------------
create or replace function public.consent_is_valid(p_consent uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consent_records c
    where c.id = p_consent and c.user_id = p_user
      and c.revoked_at is null
      and (c.expires_at is null or c.expires_at > now())
      and 'before-after' = any(c.scope)
  );
$$;

create or replace function public.enforce_consent_on_post() returns trigger
language plpgsql as $$
begin
  if new.is_before_after and new.status in ('scheduled','published')
     and (new.consent_record_id is null or not public.consent_is_valid(new.consent_record_id, new.user_id)) then
    raise exception 'CONSENT_REQUIRED: before/after posts need a valid client consent record before scheduling'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_post_consent before insert or update on public.posts for each row execute function public.enforce_consent_on_post();

create or replace function public.enforce_consent_on_schedule() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select is_before_after, consent_record_id, user_id into p from public.posts where id = new.post_id;
  if p.is_before_after and new.state <> 'cancelled'
     and (p.consent_record_id is null or not public.consent_is_valid(p.consent_record_id, p.user_id)) then
    raise exception 'CONSENT_REQUIRED: before/after posts need a valid client consent record before scheduling'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_schedule_consent before insert or update on public.schedule_items for each row execute function public.enforce_consent_on_schedule();

-- When consent is revoked: pull every pending schedule item for posts using it
-- and move those posts back to review.
create or replace function public.on_consent_revoked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.revoked_at is not null and old.revoked_at is null then
    update public.schedule_items s set state = 'cancelled'
      from public.posts p
      where s.post_id = p.id and p.consent_record_id = new.id and s.state in ('pending','reminded');
    update public.posts set status = 'review' where consent_record_id = new.id and status in ('approved','scheduled');
  end if;
  return new;
end $$;
create trigger t_consent_revoked after update on public.consent_records for each row execute function public.on_consent_revoked();

-- Consent records are evidence: only revocation (and expiry edits) may change.
create or replace function public.consent_immutable() returns trigger
language plpgsql as $$
begin
  if new.client_alias <> old.client_alias or new.scope <> old.scope or new.evidence_hash <> old.evidence_hash
     or new.signature_svg <> old.signature_svg or new.signed_at <> old.signed_at or new.platforms <> old.platforms
     or new.consent_text_version <> old.consent_text_version then
    raise exception 'consent records are immutable; revoke and create a new one';
  end if;
  return new;
end $$;
create trigger t_consent_immutable before update on public.consent_records for each row execute function public.consent_immutable();

-- ---------------------------------------------------------------------------
-- row-level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['user_settings','brand_profiles','consent_records','posts','post_variants','schedule_items',
                           'connected_accounts','agent_memory','goals','tasks','metric_snapshots','push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy own_delete on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Audit log: users can read and append their own entries, never edit or delete.
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;
create policy audit_select on public.audit_log for select to authenticated using (user_id = (select auth.uid()));
create policy audit_insert on public.audit_log for insert to authenticated with check (user_id = (select auth.uid()));

-- Secrets: RLS on with NO policies => invisible to anon/authenticated. Service role bypasses RLS.
alter table public.connected_account_secrets enable row level security;
alter table public.connected_account_secrets force row level security;
revoke all on public.connected_account_secrets from anon, authenticated;

-- Least privilege for the anon role: nothing.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.user_settings, public.brand_profiles, public.consent_records, public.posts, public.post_variants,
  public.schedule_items, public.connected_accounts, public.agent_memory, public.goals, public.tasks,
  public.metric_snapshots, public.push_subscriptions to authenticated;
grant select, insert on public.audit_log to authenticated;
-- Consent records cannot be deleted by the user directly (revoke instead); account deletion runs as service role.
revoke delete on public.consent_records from authenticated;
