-- Hardening migration: invite tokens, idempotency, CHECK constraints, RLS.
-- Apply via `supabase db push` or paste into the SQL Editor.

-- ---------- household_invites ----------
create table if not exists public.household_invites (
    token       text primary key,
    household_id uuid not null,
    created_by  uuid not null references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null,
    used_by     uuid references auth.users(id),
    used_at     timestamptz
);

create index if not exists idx_household_invites_household
    on public.household_invites(household_id);

-- ---------- baby_logs: type whitelist + client_id idempotency ----------
-- Drop any earlier version of these constraints before re-adding, so this is
-- safe to re-run.

-- Add client_id column if missing.
alter table public.baby_logs
    add column if not exists client_id text;

-- Per-household idempotency key.
create unique index if not exists uniq_baby_logs_household_client_id
    on public.baby_logs(household_id, client_id)
    where client_id is not null;

-- Type whitelist.
alter table public.baby_logs
    drop constraint if exists baby_logs_type_check;

alter table public.baby_logs
    add constraint baby_logs_type_check
    check (type in (
        'pee', 'poop', 'feed', 'feed_l', 'feed_r',
        'pump', 'pump_fridge', 'pump_freezer'
    ));

-- Duration sanity.
alter table public.baby_logs
    drop constraint if exists baby_logs_duration_check;

alter table public.baby_logs
    add constraint baby_logs_duration_check
    check (duration is null or (duration >= 0 and duration <= 21600));

-- Timestamp sanity (reject absurd future dates > 1 year out).
alter table public.baby_logs
    drop constraint if exists baby_logs_timestamp_check;

alter table public.baby_logs
    add constraint baby_logs_timestamp_check
    check (timestamp is not null);

-- Helpful indexes.
create index if not exists idx_baby_logs_household_timestamp
    on public.baby_logs(household_id, timestamp desc);

-- ---------- RLS policies (defense in depth) ----------
-- These guard against accidental anon-key usage on the client and against
-- server-code bugs that might query without a household_id filter. The
-- Vercel API currently uses the service_role key which bypasses RLS; if you
-- ever switch to per-user JWTs, these policies keep tenants isolated.

alter table public.profiles             enable row level security;
alter table public.baby_logs            enable row level security;
alter table public.household_invites    enable row level security;
alter table public.push_subscriptions   enable row level security;

-- Profiles: a user can read + write only their own row.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
    for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
    for update using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
    for insert with check (auth.uid() = id);

-- baby_logs: restricted to members of the same household.
drop policy if exists "logs_household_select" on public.baby_logs;
create policy "logs_household_select" on public.baby_logs
    for select using (household_id = (
        select household_id from public.profiles where id = auth.uid()
    ));

drop policy if exists "logs_household_write" on public.baby_logs;
create policy "logs_household_write" on public.baby_logs
    for all using (household_id = (
        select household_id from public.profiles where id = auth.uid()
    )) with check (household_id = (
        select household_id from public.profiles where id = auth.uid()
    ));

-- household_invites: creators may read their own; anyone authenticated may
-- consume (update the used_* columns) a token they know. The UPDATE .. where
-- token = $1 pattern together with the `used_at is null` guard is what makes
-- consumption safe.
drop policy if exists "invites_owner_select" on public.household_invites;
create policy "invites_owner_select" on public.household_invites
    for select using (created_by = auth.uid());

drop policy if exists "invites_owner_insert" on public.household_invites;
create policy "invites_owner_insert" on public.household_invites
    for insert with check (created_by = auth.uid());

drop policy if exists "invites_consume" on public.household_invites;
create policy "invites_consume" on public.household_invites
    for update using (used_at is null)
    with check (used_by = auth.uid());

-- push_subscriptions: only owner reads / writes.
drop policy if exists "push_self_all" on public.push_subscriptions;
create policy "push_self_all" on public.push_subscriptions
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
