-- Grindmates — bodyweight tracking.
--
-- One row per person per day; logging again the same day overwrites. Strictly
-- private: unlike check-ins, bodyweight is never visible to crew mates.

create table public.body_weights (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  measured_on date not null default current_date,
  kg          numeric(5, 2) not null check (kg > 20 and kg < 400),
  created_at  timestamptz not null default now(),
  primary key (user_id, measured_on)
);

alter table public.body_weights enable row level security;

create policy "own weights: select" on public.body_weights
  for select using (user_id = auth.uid());

create policy "own weights: insert" on public.body_weights
  for insert with check (user_id = auth.uid());

create policy "own weights: update" on public.body_weights
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own weights: delete" on public.body_weights
  for delete using (user_id = auth.uid());

-- Supabase grants these via default privileges; stated explicitly so the
-- migration also works on a bare Postgres.
grant select, insert, update, delete on public.body_weights to authenticated;
