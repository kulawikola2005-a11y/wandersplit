-- Etap 9: public read-only share links

create extension if not exists pgcrypto;

create table if not exists public.trip_public_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,

  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  is_enabled boolean not null default true,
  expires_at timestamptz null,

  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trip_public_shares_trip_idx on public.trip_public_shares(trip_id);
create index if not exists trip_public_shares_token_idx on public.trip_public_shares(token);

alter table public.trip_public_shares enable row level security;

-- Tylko owner tripa może zarządzać share linkami
create policy "shares_select_owner"
on public.trip_public_shares for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_public_shares.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "shares_insert_owner"
on public.trip_public_shares for insert
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.trips t
    where t.id = trip_public_shares.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "shares_update_owner"
on public.trip_public_shares for update
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_public_shares.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "shares_delete_owner"
on public.trip_public_shares for delete
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_public_shares.trip_id
      and t.owner_id = (select auth.uid())
  )
);
