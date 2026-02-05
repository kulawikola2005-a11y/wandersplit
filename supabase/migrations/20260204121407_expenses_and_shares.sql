-- Etap 3: budżet (expenses + expense_shares) + RLS

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,

  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  category text not null default 'other',

  paid_by uuid not null references auth.users(id) on delete cascade,
  spent_on date not null default current_date,

  note text null,

  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_spent_idx on public.expenses(trip_id, spent_on);
create index if not exists expenses_trip_created_idx on public.expenses(trip_id, created_at);
create index if not exists expenses_paid_by_idx on public.expenses(paid_by);

create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  share_amount numeric(12,2) not null check (share_amount >= 0),
  primary key (expense_id, user_id)
);

create index if not exists expense_shares_user_idx on public.expense_shares(user_id);

-- RLS
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;

-- expenses: SELECT = members of trip
create policy "expenses_select_members"
on public.expenses for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = expenses.trip_id
      and m.user_id = (select auth.uid())
  )
);

-- expenses: INSERT = members, but must be created_by = auth.uid()
create policy "expenses_insert_members"
on public.expenses for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.trip_members m
    where m.trip_id = expenses.trip_id
      and m.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
);

-- expenses: UPDATE/DELETE = creator or trip owner
create policy "expenses_update_creator_or_owner"
on public.expenses for update
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = expenses.trip_id
      and t.owner_id = (select auth.uid())
  )
);

create policy "expenses_delete_creator_or_owner"
on public.expenses for delete
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.trips t
    where t.id = expenses.trip_id
      and t.owner_id = (select auth.uid())
  )
);

-- shares: SELECT = members of trip (po expensie)
create policy "shares_select_members"
on public.expense_shares for select
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.expenses e
    join public.trip_members m on m.trip_id = e.trip_id
    where e.id = expense_shares.expense_id
      and m.user_id = (select auth.uid())
  )
);

-- shares: INSERT/UPDATE/DELETE = creator or owner (po expensie)
create policy "shares_insert_creator_or_owner"
on public.expense_shares for insert
with check (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.expenses e
    where e.id = expense_shares.expense_id
      and (
        e.created_by = (select auth.uid())
        or exists (select 1 from public.trips t where t.id = e.trip_id and t.owner_id = (select auth.uid()))
      )
  )
);

create policy "shares_update_creator_or_owner"
on public.expense_shares for update
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.expenses e
    where e.id = expense_shares.expense_id
      and (
        e.created_by = (select auth.uid())
        or exists (select 1 from public.trips t where t.id = e.trip_id and t.owner_id = (select auth.uid()))
      )
  )
);

create policy "shares_delete_creator_or_owner"
on public.expense_shares for delete
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.expenses e
    where e.id = expense_shares.expense_id
      and (
        e.created_by = (select auth.uid())
        or exists (select 1 from public.trips t where t.id = e.trip_id and t.owner_id = (select auth.uid()))
      )
  )
);
