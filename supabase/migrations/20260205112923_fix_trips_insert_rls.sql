-- Fix RLS so authenticated users can INSERT their own trips
-- and membership checks don't cause recursion.

-- Ensure RLS is on
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

-- IMPORTANT: keep param name _trip_id if function already exists with that name
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.trip_members
    where trip_id = _trip_id
      and user_id = auth.uid()
  );
$$;

-- ===== TRIPS policies =====
drop policy if exists "trips_select_members" on public.trips;
drop policy if exists "trips_insert_owner" on public.trips;
drop policy if exists "trips_update_owner" on public.trips;
drop policy if exists "trips_delete_owner" on public.trips;

-- SELECT: members can see trip
create policy "trips_select_members"
on public.trips
for select
to authenticated
using (
  public.is_trip_member(trips.id)
);

-- INSERT: user creates own trip (must set owner_id = auth.uid())
create policy "trips_insert_owner"
on public.trips
for insert
to authenticated
with check (
  owner_id = auth.uid()
);

-- UPDATE: only owner
create policy "trips_update_owner"
on public.trips
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- DELETE: only owner
create policy "trips_delete_owner"
on public.trips
for delete
to authenticated
using (owner_id = auth.uid());

-- ===== TRIP_MEMBERS policies =====
drop policy if exists "members_select_members" on public.trip_members;
drop policy if exists "members_insert_owner" on public.trip_members;
drop policy if exists "members_update_owner" on public.trip_members;
drop policy if exists "members_delete_owner" on public.trip_members;

-- SELECT: members see members (no recursion thanks to is_trip_member)
create policy "members_select_members"
on public.trip_members
for select
to authenticated
using (
  public.is_trip_member(trip_members.trip_id)
);

-- INSERT/UPDATE/DELETE: only trip owner manages members
create policy "members_insert_owner"
on public.trip_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id
      and t.owner_id = auth.uid()
  )
);

create policy "members_update_owner"
on public.trip_members
for update
to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id
      and t.owner_id = auth.uid()
  )
);

create policy "members_delete_owner"
on public.trip_members
for delete
to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id
      and t.owner_id = auth.uid()
  )
);
