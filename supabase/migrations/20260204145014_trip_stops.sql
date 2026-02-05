-- Etap 5: stops na trasie (pod pogodę + mapę)

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  sort_order int not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trip_stops_trip_idx on public.trip_stops(trip_id, sort_order);

alter table public.trip_stops enable row level security;

-- SELECT = każdy członek tripa
create policy "stops_select_members"
on public.trip_stops for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = trip_stops.trip_id
      and m.user_id = (select auth.uid())
  )
);

-- INSERT = członek tripa, ale created_by = auth.uid()
create policy "stops_insert_members"
on public.trip_stops for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = trip_stops.trip_id
      and m.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

-- UPDATE/DELETE = creator albo owner tripa
create policy "stops_update_creator_or_owner"
on public.trip_stops for update
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = trip_stops.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "stops_delete_creator_or_owner"
on public.trip_stops for delete
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = trip_stops.trip_id
      and t.owner_id = (select auth.uid())
  )
);
