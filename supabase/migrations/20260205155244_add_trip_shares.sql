create table if not exists public.trip_shares (
  token text primary key,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- włącz RLS, ale bez policy (i tak czytamy/zapisujemy przez service_role w API)
alter table public.trip_shares enable row level security;
