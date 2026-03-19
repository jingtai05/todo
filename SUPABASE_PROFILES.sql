-- Run this in Supabase SQL Editor (after workspaces/tasks SQL).
-- Adds a simple public profile with a username for workspace user management.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);

alter table public.profiles enable row level security;

-- Updated-at helper (safe no-op if already exists elsewhere)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- SECURITY DEFINER helper to check if the current user shares a workspace
-- with a given user id (for safe profile visibility inside workspaces).
create or replace function public.shares_workspace(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select auth.uid() is not null
  and exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them
      on them.workspace_id = me.workspace_id
    where me.user_id = auth.uid()
      and them.user_id = other_user
  );
$$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles select for self or shared workspace') then
    create policy "profiles select for self or shared workspace"
    on public.profiles
    for select
    to authenticated
    using (id = auth.uid() or public.shares_workspace(id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles insert self') then
    create policy "profiles insert self"
    on public.profiles
    for insert
    to authenticated
    with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles update self') then
    create policy "profiles update self"
    on public.profiles
    for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;
end $$;

grant select, insert, update on public.profiles to authenticated;

