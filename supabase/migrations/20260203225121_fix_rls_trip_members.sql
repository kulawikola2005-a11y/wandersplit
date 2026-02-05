-- Fix: infinite recursion in RLS on trip_members
-- Cause: policy queried trip_members inside trip_members policy
-- Solution: use SECURITY DEFINER helper function (bypasses RLS as table owner)

create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = _trip_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

-- Replace recursive SELECT policy on trip_members
drop policy if exists "members_select_members" on public.trip_members;

create policy "members_select_members"
on public.trip_members
for select
using (
  auth.uid() is not null
  and (
    -- member can see all members of the same trip
    public.is_trip_member(trip_id)
    -- trip owner can see all members
    or exists (
      select 1 from public.trips t
      where t.id = trip_members.trip_id
        and t.owner_id = auth.uid()
    )
  )
);

-- (Optional but recommended) remove dependency of trips policy on trip_members
drop policy if exists "trips_select_members" on public.trips;

create policy "trips_select_members"
on public.trips
for select
using (
  auth.uid() is not null
  and (owner_id = auth.uid() or public.is_trip_member(id))
);
