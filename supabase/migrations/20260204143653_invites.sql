-- Etap 4: invites (share link/code) + RPC accept_trip_invite

create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,

  code text not null unique default encode(gen_random_bytes(6), 'hex'), -- 12 znaków
  max_uses int null,
  uses int not null default 0,
  expires_at timestamptz null,

  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trip_invites_trip_idx on public.trip_invites(trip_id);
create index if not exists trip_invites_code_idx on public.trip_invites(code);

alter table public.trip_invites enable row level security;

-- tylko owner może widzieć/zarządzać invite do swojego tripa
create policy "invites_select_owner"
on public.trip_invites for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_invites.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "invites_insert_owner"
on public.trip_invites for insert
with check (
  (select auth.uid()) is not null
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.trips t
    where t.id = trip_invites.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "invites_update_owner"
on public.trip_invites for update
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_invites.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "invites_delete_owner"
on public.trip_invites for delete
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trips t
    where t.id = trip_invites.trip_id
      and t.owner_id = (select auth.uid())
  )
);

-- RPC: dołącz do tripa po kodzie (bypassing RLS dzięki SECURITY DEFINER)
create or replace function public.accept_trip_invite(p_code text, p_nickname text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_max int;
  v_uses int;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select trip_id, max_uses, uses, expires_at
    into v_trip_id, v_max, v_uses, v_expires
  from public.trip_invites
  where code = p_code;

  if v_trip_id is null then
    raise exception 'invalid_code';
  end if;

  if v_expires is not null and v_expires < now() then
    raise exception 'invite_expired';
  end if;

  if v_max is not null and v_uses >= v_max then
    raise exception 'invite_used_up';
  end if;

  -- jeśli już jest członkiem, nie nabijamy użyć
  if exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = auth.uid()
  ) then
    return v_trip_id;
  end if;

  insert into public.trip_members(trip_id, user_id, role, nickname)
  values (v_trip_id, auth.uid(), 'member', nullif(trim(p_nickname), ''));

  update public.trip_invites
    set uses = uses + 1
  where code = p_code;

  return v_trip_id;
end;
$$;
