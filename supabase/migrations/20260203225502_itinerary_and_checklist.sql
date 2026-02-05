-- Etap 2: itinerary + checklist + RLS

-- ITINERARY (plan)
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_date date not null,
  start_time time null,
  title text not null,
  place_name text null,
  lat double precision null,
  lng double precision null,
  link text null,
  notes text null,
  status text not null default 'plan' check (status in ('plan','booked','done')),
  sort_order int not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists itinerary_trip_day_idx
on public.itinerary_items(trip_id, day_date, start_time, sort_order);

-- CHECKLIST
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  assigned_to uuid null references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists checklist_trip_idx on public.checklist_items(trip_id, done);

-- RLS
alter table public.itinerary_items enable row level security;
alter table public.checklist_items enable row level security;

-- ITINERARY policies
create policy "itinerary_select_members"
on public.itinerary_items for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = itinerary_items.trip_id
      and m.user_id = (select auth.uid())
  )
);

create policy "itinerary_insert_members"
on public.itinerary_items for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = itinerary_items.trip_id
      and m.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "itinerary_update_creator_or_owner"
on public.itinerary_items for update
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = itinerary_items.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "itinerary_delete_creator_or_owner"
on public.itinerary_items for delete
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = itinerary_items.trip_id
      and t.owner_id = (select auth.uid())
  )
);

-- CHECKLIST policies
create policy "checklist_select_members"
on public.checklist_items for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = checklist_items.trip_id
      and m.user_id = (select auth.uid())
  )
);

create policy "checklist_insert_members"
on public.checklist_items for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = checklist_items.trip_id
      and m.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

create policy "checklist_update_creator_or_owner"
on public.checklist_items for update
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = checklist_items.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "checklist_delete_creator_or_owner"
on public.checklist_items for delete
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = checklist_items.trip_id
      and t.owner_id = (select auth.uid())
  )
);
