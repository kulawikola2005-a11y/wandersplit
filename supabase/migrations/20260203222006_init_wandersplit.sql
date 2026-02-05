-- WanderSplit MVP schema (Etap 1): trips + members + RLS

create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  base_currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  nickname text null,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index if not exists trip_members_user_idx on public.trip_members(user_id);
create index if not exists trips_owner_idx on public.trips(owner_id);

create or replace function public.handle_trip_created()
returns trigger language plpgsql as $$
begin
  insert into public.trip_members(trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_trip_created on public.trips;
create trigger trg_trip_created
after insert on public.trips
for each row execute function public.handle_trip_created();

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy "trips_select_members"
on public.trips for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = trips.id and m.user_id = (select auth.uid())
  )
);

create policy "trips_insert_owner"
on public.trips for insert
with check (
  (select auth.uid()) is not null
  and owner_id = (select auth.uid())
);

create policy "trips_update_owner"
on public.trips for update
using ((select auth.uid()) is not null and owner_id = (select auth.uid()));

create policy "trips_delete_owner"
on public.trips for delete
using ((select auth.uid()) is not null and owner_id = (select auth.uid()));

create policy "members_select_members"
on public.trip_members for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = trip_members.trip_id and m.user_id = (select auth.uid())
  )
);

create policy "members_insert_owner"
on public.trip_members for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id and t.owner_id = (select auth.uid())
  )
);

create policy "members_update_owner"
on public.trip_members for update
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id and t.owner_id = (select auth.uid())
  )
);

create policy "members_delete_owner"
on public.trip_members for delete
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_members.trip_id and t.owner_id = (select auth.uid())
  )
);
