-- =============================================================================
-- 0010  Permission overrides and organization/family scope helpers
-- =============================================================================
-- All helpers are SECURITY DEFINER + STABLE + `search_path = ''`:
--   * SECURITY DEFINER so a policy that calls them does not recurse into the
--     RLS of the tables they read;
--   * STABLE so PostgreSQL can cache the result within a statement;
--   * empty search_path so a hostile session cannot shadow a table name.
-- Note: tables are NOT declared FORCE ROW LEVEL SECURITY. FORCE applies RLS to
-- the table owner as well, which would make these definer functions recurse
-- into the very policies that call them. Isolation instead comes from the app
-- never connecting as an owner role (it connects as `authenticated`).
-- =============================================================================

create table public.user_permissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  scope_type    text not null check (scope_type in ('organization', 'family', 'student', 'class')),
  scope_id      uuid not null,
  permission    text not null,                        -- e.g. 'documents.view', 'compliance.submit'
  effect        text not null default 'allow' check (effect in ('allow', 'deny')),
  reason        text,
  granted_by    uuid references public.profiles(id),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, scope_type, scope_id, permission)
);
create index user_permissions_lookup_idx
  on public.user_permissions (user_id, scope_type, scope_id);
select app.attach_updated_at('public.user_permissions');
alter table public.user_permissions enable row level security;

comment on table public.user_permissions is
  'Targeted overrides layered on top of role defaults. DENY always wins over ALLOW.';

-- 'allow' | 'deny' | null (no override)
create or replace function app.permission_override(
  p_user uuid, p_scope_type text, p_scope_id uuid, p_permission text)
returns text language sql stable security definer set search_path = '' as $$
  select up.effect
    from public.user_permissions up
   where up.user_id = p_user
     and up.scope_type = p_scope_type
     and up.scope_id = p_scope_id
     and up.permission = p_permission
     and (up.expires_at is null or up.expires_at > now())
   order by case up.effect when 'deny' then 0 else 1 end
   limit 1;
$$;

-- --- platform support (break-glass) -----------------------------------------
create or replace function app.is_platform_support(
  p_organization uuid default null, p_student uuid default null, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.support_access_sessions s
      join public.profiles p on p.id = s.user_id and p.is_super_admin
     where s.user_id = coalesce(p_user, auth.uid())
       and s.closed_at is null
       and s.expires_at > now()
       and (s.organization_id is null or s.organization_id = p_organization or p_organization is null)
       and (s.student_id is null or s.student_id = p_student or p_student is null));
$$;

-- --- organization scope ------------------------------------------------------
create or replace function app.my_org_ids(p_user uuid default null)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select om.organization_id
    from public.organization_members om
   where om.user_id = coalesce(p_user, auth.uid())
     and om.status = 'active';
$$;

create or replace function app.is_org_member(
  p_organization uuid, p_roles app.org_role[] default null, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.organization_members om
     where om.organization_id = p_organization
       and om.user_id = coalesce(p_user, auth.uid())
       and om.status = 'active'
       and (p_roles is null or om.role = any (p_roles)));
$$;

create or replace function app.is_org_admin(p_organization uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_org_member(p_organization, array['org_admin']::app.org_role[], p_user);
$$;

create or replace function app.can_read_org(p_organization uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_organization is not null
     and (app.is_org_member(p_organization, null, p_user)
          or app.is_platform_support(p_organization, null, p_user));
$$;

-- --- family scope ------------------------------------------------------------
-- A user belongs to a family either as a recorded family member or by being an
-- active guardian of one of its students.
create or replace function app.my_family_ids(p_user uuid default null)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select fm.family_id
    from public.family_members fm
   where fm.user_id = coalesce(p_user, auth.uid())
  union
  select s.family_id
    from public.student_guardians sg
    join public.students s on s.id = sg.student_id
   where sg.user_id = coalesce(p_user, auth.uid())
     and sg.revoked_at is null;
$$;

create or replace function app.is_family_member(p_family uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_family is not null
     and p_family in (select app.my_family_ids(p_user));
$$;

grant execute on function
  app.permission_override(uuid, text, uuid, text),
  app.is_platform_support(uuid, uuid, uuid),
  app.my_org_ids(uuid),
  app.is_org_member(uuid, app.org_role[], uuid),
  app.is_org_admin(uuid, uuid),
  app.can_read_org(uuid, uuid),
  app.my_family_ids(uuid),
  app.is_family_member(uuid, uuid),
  app.has_consent(app.consent_type, uuid, uuid, uuid)
to authenticated, service_role;
