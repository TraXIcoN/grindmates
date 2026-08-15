-- =============================================================================
-- Vitals — initial schema
-- Tables, foreign keys, indexes, RLS policies, and storage bucket policies.
-- Run with: supabase db push   (or paste into the SQL editor)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- 1 = Light (Pump) · 2 = Moderate (Working) · 3 = Heavy (To failure)
create type public.effort_level as enum ('1', '2', '3');

create type public.muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'quads', 'hamstrings', 'glutes', 'calves'
);

create type public.reaction_type as enum ('fire', 'five');

create type public.set_type as enum ('warmup', 'working', 'drop', 'failure');

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (char_length(username) between 2 and 32),
  avatar_url   text,
  streak_count integer not null default 0 check (streak_count >= 0),
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- groups — small, closed crews (4-12 people) per the design brief
-- -----------------------------------------------------------------------------

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 40),
  emblem     text not null default 'F',          -- single glyph on the switcher pill
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- -----------------------------------------------------------------------------
-- check_ins
-- -----------------------------------------------------------------------------

create table public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  group_id      uuid references public.groups (id) on delete cascade,
  photo_url     text,                              -- null => "log without a photo"
  caption       text check (caption is null or char_length(caption) <= 280),
  workout_label text check (workout_label is null or char_length(workout_label) <= 24),
  strain        numeric(4, 1) check (strain is null or (strain >= 0 and strain <= 21)),
  created_at    timestamptz not null default now()
);

create index check_ins_group_created_idx on public.check_ins (group_id, created_at desc);
create index check_ins_user_created_idx  on public.check_ins (user_id, created_at desc);

-- One post per person per day, per the "no algorithm, no infinite scroll" brief.
-- The extra paren pair is required: an index element that is an expression must
-- be wrapped in its own parens, or the trailing cast is a syntax error.
create unique index check_ins_one_per_day_idx
  on public.check_ins (user_id, group_id, (((created_at at time zone 'utc')::date)));

-- -----------------------------------------------------------------------------
-- muscle_logs
-- -----------------------------------------------------------------------------

create table public.muscle_logs (
  id           uuid primary key default gen_random_uuid(),
  check_in_id  uuid not null references public.check_ins (id) on delete cascade,
  muscle_group public.muscle_group not null,
  effort_level public.effort_level not null,
  unique (check_in_id, muscle_group)
);

create index muscle_logs_check_in_idx on public.muscle_logs (check_in_id);

-- -----------------------------------------------------------------------------
-- reactions
-- -----------------------------------------------------------------------------

create table public.reactions (
  id          uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references public.check_ins (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (check_in_id, user_id, type)
);

create index reactions_check_in_idx on public.reactions (check_in_id);

-- =============================================================================
-- Helpers (SECURITY DEFINER so RLS policies don't recurse through group_members)
-- =============================================================================

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.can_see_check_in(cid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.check_ins c
    where c.id = cid
      and (c.user_id = auth.uid() or public.is_group_member(c.group_id))
  );
$$;

-- Create a profile row automatically for every new auth user (incl. anonymous).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'athlete_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owner is always a member of their own group.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.check_ins     enable row level security;
alter table public.muscle_logs   enable row level security;
alter table public.reactions     enable row level security;

-- profiles -------------------------------------------------------------------
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups ---------------------------------------------------------------------
create policy "members read their groups"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id) or owner_id = auth.uid());

create policy "users create groups they own"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "owners update their groups"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete their groups"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- group_members --------------------------------------------------------------
create policy "members read the roster of their groups"
  on public.group_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id));

create policy "users join groups as themselves"
  on public.group_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users leave groups themselves"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- check_ins ------------------------------------------------------------------
create policy "read check-ins from your groups"
  on public.check_ins for select
  to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id));

create policy "post your own check-ins to groups you're in"
  on public.check_ins for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );

create policy "edit your own check-ins"
  on public.check_ins for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "delete your own check-ins"
  on public.check_ins for delete
  to authenticated
  using (user_id = auth.uid());

-- muscle_logs ----------------------------------------------------------------
create policy "read muscle logs you can see the check-in for"
  on public.muscle_logs for select
  to authenticated
  using (public.can_see_check_in(check_in_id));

create policy "write muscle logs on your own check-ins"
  on public.muscle_logs for insert
  to authenticated
  with check (
    exists (select 1 from public.check_ins c where c.id = check_in_id and c.user_id = auth.uid())
  );

create policy "update muscle logs on your own check-ins"
  on public.muscle_logs for update
  to authenticated
  using (exists (select 1 from public.check_ins c where c.id = check_in_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.check_ins c where c.id = check_in_id and c.user_id = auth.uid()));

create policy "delete muscle logs on your own check-ins"
  on public.muscle_logs for delete
  to authenticated
  using (exists (select 1 from public.check_ins c where c.id = check_in_id and c.user_id = auth.uid()));

-- reactions ------------------------------------------------------------------
create policy "read reactions on visible check-ins"
  on public.reactions for select
  to authenticated
  using (public.can_see_check_in(check_in_id));

create policy "react as yourself on visible check-ins"
  on public.reactions for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_see_check_in(check_in_id));

create policy "remove your own reactions"
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- Storage: checkin-photos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'checkin-photos',
  'checkin-photos',
  true,                                   -- public read keeps the feed fast (no signing round-trip)
  8388608,                                -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored at:  checkin-photos/<user_id>/<uuid>.jpg
create policy "check-in photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'checkin-photos');

create policy "users upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Streak maintenance — bump on the day's first check-in, reset if a day is missed
-- =============================================================================

create or replace function public.bump_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_day date;
  today    date := (new.created_at at time zone 'utc')::date;
begin
  select max((created_at at time zone 'utc')::date)
    into last_day
  from public.check_ins
  where user_id = new.user_id and id <> new.id;

  update public.profiles
     set streak_count = case
       when last_day is null                then 1
       when last_day = today - 1            then streak_count + 1
       when last_day = today                then streak_count
       else 1
     end
   where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_check_in_created on public.check_ins;
create trigger on_check_in_created
  after insert on public.check_ins
  for each row execute function public.bump_streak();

-- =============================================================================
-- post_check_in — the check-in and its muscle logs in ONE transaction
--
-- Two round trips would let the feed's realtime listener fetch the new row
-- before the muscle_logs land, rendering a card with an empty muscle strip.
-- SECURITY INVOKER (the default), so every RLS policy above still applies.
-- =============================================================================

create or replace function public.post_check_in(
  p_group_id      uuid,
  p_photo_url     text,
  p_caption       text,
  p_workout_label text,
  p_strain        numeric,
  p_muscles       jsonb  -- [{"muscle_group":"chest","effort_level":"3"}, ...]
)
returns public.check_ins
language plpgsql
set search_path = public
as $$
declare
  v_row public.check_ins;
begin
  insert into public.check_ins (user_id, group_id, photo_url, caption, workout_label, strain)
  values (
    auth.uid(),
    p_group_id,
    nullif(btrim(coalesce(p_photo_url, '')), ''),
    nullif(btrim(coalesce(p_caption, '')), ''),
    nullif(btrim(coalesce(p_workout_label, '')), ''),
    p_strain
  )
  returning * into v_row;

  insert into public.muscle_logs (check_in_id, muscle_group, effort_level)
  select
    v_row.id,
    (m ->> 'muscle_group')::public.muscle_group,
    (m ->> 'effort_level')::public.effort_level
  from jsonb_array_elements(coalesce(p_muscles, '[]'::jsonb)) as m;

  return v_row;
end;
$$;

grant execute on function public.post_check_in(uuid, text, text, text, numeric, jsonb)
  to authenticated;

-- =============================================================================
-- Realtime
-- =============================================================================

alter publication supabase_realtime add table public.check_ins;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.muscle_logs;
-- profiles is published too, so the streak badge updates without a refetch.
alter publication supabase_realtime add table public.profiles;
