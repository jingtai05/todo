-- Run this in Supabase SQL Editor for the TodoDesk "workspaces + tasks" upgrade.
-- This adds team/individual workspaces and replaces simple todos with workflow tasks.

-- Extensions (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text,
  join_code text not null unique,
  is_personal boolean not null default false,
  created_at timestamptz not null default now()
);

-- If the table already existed, ensure new columns exist
alter table public.workspaces
  add column if not exists owner_email text;

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);

-- 2) Workspace members (team)
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'owner' | 'admin' | 'member'
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);

-- 3) Tasks (workflow)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'ready', -- icebox|ready|in_progress|review|qa|done
  type text not null default 'feature', -- feature|bug|chore
  priority text not null default 'medium', -- low|medium|high
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_workspace_status_idx
  on public.tasks(workspace_id, status, sort_order, created_at desc);

-- RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;

-- Helper: is member of workspace
-- IMPORTANT: This is SECURITY DEFINER with row_security off to avoid RLS recursion
-- (policies call this function, and the function reads workspace_members).
create or replace function public.is_workspace_member(wid uuid)
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
    from public.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid()
  );
$$;

-- Helper: can write in workspace (non-viewer member)
create or replace function public.is_workspace_writer(wid uuid)
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
    from public.workspace_members m
    where m.workspace_id = wid
      and m.user_id = auth.uid()
      and coalesce(m.role, 'member') <> 'viewer'
  );
$$;

-- Policies: workspaces
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspaces' and policyname='workspaces select for members') then
    create policy "workspaces select for members"
    on public.workspaces
    for select
    to authenticated
    using (public.is_workspace_member(id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspaces' and policyname='workspaces insert owned') then
    create policy "workspaces insert owned"
    on public.workspaces
    for insert
    to authenticated
    with check (owner_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspaces' and policyname='workspaces update by owner') then
    create policy "workspaces update by owner"
    on public.workspaces
    for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspaces' and policyname='workspaces delete by owner') then
    create policy "workspaces delete by owner"
    on public.workspaces
    for delete
    to authenticated
    using (owner_id = auth.uid());
  end if;
end $$;

-- Policies: workspace_members
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='members select for members') then
    create policy "members select for members"
    on public.workspace_members
    for select
    to authenticated
    using (public.is_workspace_member(workspace_id));
  end if;

  -- Allow owner to add/remove members
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='members insert by owner') then
    create policy "members insert by owner"
    on public.workspace_members
    for insert
    to authenticated
    with check (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='members delete by owner') then
    create policy "members delete by owner"
    on public.workspace_members
    for delete
    to authenticated
    using (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    );
  end if;

  -- Allow a member to leave a workspace (delete own membership).
  -- Owner leaving is intentionally blocked (they should delete the workspace instead).
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='members delete self') then
    create policy "members delete self"
    on public.workspace_members
    for delete
    to authenticated
    using (
      user_id = auth.uid()
      and not exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    );
  end if;

  -- Allow owner to update member roles (e.g., viewer vs editor)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workspace_members' and policyname='members update by owner') then
    create policy "members update by owner"
    on public.workspace_members
    for update
    to authenticated
    using (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    );
  end if;
end $$;

-- Policies: tasks
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks select for workspace members') then
    create policy "tasks select for workspace members"
    on public.tasks
    for select
    to authenticated
    using (public.is_workspace_member(workspace_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks insert for workspace members') then
    create policy "tasks insert for workspace members"
    on public.tasks
    for insert
    to authenticated
    with check (public.is_workspace_writer(workspace_id) and created_by = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks update for workspace members') then
    create policy "tasks update for workspace members"
    on public.tasks
    for update
    to authenticated
    using (public.is_workspace_writer(workspace_id))
    with check (public.is_workspace_writer(workspace_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks delete for workspace members') then
    create policy "tasks delete for workspace members"
    on public.tasks
    for delete
    to authenticated
    using (public.is_workspace_writer(workspace_id));
  end if;
end $$;

-- IMPORTANT: if you ran an earlier version of this SQL, the old (more permissive)
-- policies may already exist. These ALTER statements tighten them in-place.
do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks insert for workspace members') then
    alter policy "tasks insert for workspace members"
    on public.tasks
    with check (public.is_workspace_writer(workspace_id) and created_by = auth.uid());
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks update for workspace members') then
    alter policy "tasks update for workspace members"
    on public.tasks
    using (public.is_workspace_writer(workspace_id))
    with check (public.is_workspace_writer(workspace_id));
  end if;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks delete for workspace members') then
    alter policy "tasks delete for workspace members"
    on public.tasks
    using (public.is_workspace_writer(workspace_id));
  end if;
end $$;

-- Grants (some projects have restricted defaults)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

-- RPC helpers: create/join workspace without leaking join_code via select policies.
create or replace function public.create_workspace(p_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
  code text;
  w public.workspaces;
  email_claim text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  email_claim := (auth.jwt() ->> 'email');

  code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (random() * 31)::int, 1), '')
    from generate_series(1, 10)
  );

  insert into public.workspaces(name, owner_id, owner_email, join_code, is_personal)
  values (trim(p_name), auth.uid(), email_claim, code, false)
  returning id into wid;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (wid, auth.uid(), 'owner')
  on conflict do nothing;

  select * into w from public.workspaces where id = wid;
  return w;
end;
$$;

create or replace function public.join_workspace(p_code text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into w
  from public.workspaces
  where join_code = upper(trim(p_code))
  limit 1;

  if w.id is null then
    raise exception 'workspace_not_found';
  end if;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (w.id, auth.uid(), 'member')
  on conflict do nothing;

  return w;
end;
$$;

create or replace function public.ensure_personal_workspace()
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.workspaces;
  wid uuid;
  code text;
  w public.workspaces;
  email_claim text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into existing
  from public.workspaces
  where owner_id = auth.uid() and is_personal = true
  limit 1;

  if existing.id is not null then
    return existing;
  end if;

  email_claim := (auth.jwt() ->> 'email');

  code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (random() * 31)::int, 1), '')
    from generate_series(1, 10)
  );

  insert into public.workspaces(name, owner_id, owner_email, join_code, is_personal)
  values ('Personal', auth.uid(), email_claim, code, true)
  returning id into wid;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (wid, auth.uid(), 'owner')
  on conflict do nothing;

  select * into w from public.workspaces where id = wid;
  return w;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.join_workspace(text) to authenticated;
grant execute on function public.ensure_personal_workspace() to authenticated;

-- 4) Create a personal workspace for each user (call from the app on first load)
-- The app will insert:
--   workspaces: owner_id=auth.uid(), is_personal=true, join_code=random
--   workspace_members: (workspace_id, auth.uid(), role='owner')

