-- Fix: infinite recursion in RLS policy for trip_members
-- Use SECURITY DEFINER function to check membership without RLS recursion.
-- IMPORTANT: keep parameter name _trip_id (Postgres disallows changing param names via CREATE OR REPLACE).

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

-- Recreate policies to consistently use is_trip_member()

drop policy if exists "members_select_members" on public.trip_members;
create policy "members_select_members"
on public.trip_members for select
using (
  (select auth.uid()) is not null
  and public.is_trip_member(trip_members.trip_id)
);

drop policy if exists "trips_select_members" on public.trips;
create policy "trips_select_members"
on public.trips for select
using (
  (select auth.uid()) is not null
  and public.is_trip_member(trips.id)
);
