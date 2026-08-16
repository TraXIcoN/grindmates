-- Grindmates — crew join codes.
--
-- Every crew gets an 8-digit code its members can share; anyone signed in can
-- join a crew by entering the code. Joining has to run SECURITY DEFINER:
-- before membership exists, RLS hides both the group row (so the code could
-- not be looked up) and blocks the group_members insert (the base policy only
-- lets owners add rows). The function is the one sanctioned door through that.

-- ---------------------------------------------------------------- column ----

alter table public.groups
  add column if not exists join_code text;

-- Backfill existing crews, avoiding collisions without assuming pgcrypto.
do $$
declare
  g record;
  candidate text;
begin
  for g in select id from public.groups where join_code is null loop
    loop
      candidate := lpad(floor(random() * 100000000)::text, 8, '0');
      exit when not exists (select 1 from public.groups where join_code = candidate);
    end loop;
    update public.groups set join_code = candidate where id = g.id;
  end loop;
end $$;

alter table public.groups
  alter column join_code set not null;

create unique index if not exists groups_join_code_idx
  on public.groups (join_code);

-- New crews get a code automatically. A trigger rather than a column default,
-- so a rare collision retries instead of failing the insert.
create or replace function public.assign_join_code()
returns trigger
language plpgsql
as $$
begin
  if new.join_code is null then
    loop
      new.join_code := lpad(floor(random() * 100000000)::text, 8, '0');
      exit when not exists (select 1 from public.groups where join_code = new.join_code);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_assign_join_code on public.groups;
create trigger groups_assign_join_code
  before insert on public.groups
  for each row execute function public.assign_join_code();

-- ------------------------------------------------------------------ join ----

create or replace function public.join_group_with_code(p_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  select * into g
  from public.groups
  where join_code = regexp_replace(p_code, '\D', '', 'g');

  if not found then
    raise exception 'No crew found with that code.';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = g.id and user_id = auth.uid()
  ) then
    raise exception 'You are already in this crew.';
  end if;

  insert into public.group_members (group_id, user_id)
  values (g.id, auth.uid());

  return g;
end;
$$;

revoke all on function public.join_group_with_code(text) from public;
grant execute on function public.join_group_with_code(text) to authenticated;
