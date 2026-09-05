-- =============================================================================
-- 0014  app.student_access() - the single access spine
-- =============================================================================
-- EVERY student-scoped read and write in the product resolves through this one
-- function. RLS policies call it; they never re-implement access logic. Adding
-- a role means teaching this function about the role, not editing 40 policies.
--
-- Seven sources of access, highest wins:
--   1. the student themself                                  -> read
--   2. an active guardian                                    -> write | admin
--   3. an explicit staff assignment                          -> read | write
--   4. staffing a class the student is actively enrolled in  -> write
--   5. org_admin of an organization with an ACTIVE membership -> admin
--   6. a time-boxed grant (evaluator, provider, transfer)    -> read | write
--   7. an open break-glass support session                   -> read
-- A `deny` override in user_permissions ('student.access') beats all of them.
-- =============================================================================

create or replace function app.student_access(p_student uuid, p_user uuid default null)
returns app.access_level
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user  uuid := coalesce(p_user, auth.uid());
  v_level app.access_level;
begin
  if p_student is null or v_user is null then
    return 'none'::app.access_level;
  end if;

  if app.permission_override(v_user, 'student', p_student, 'student.access') = 'deny' then
    return 'none'::app.access_level;
  end if;

  select lvl into v_level from (
    -- 1. the student's own record
    select 'read'::app.access_level as lvl
      from public.students s
     where s.id = p_student and s.user_id = v_user and s.deleted_at is null

    union all
    -- 2. guardian: 'full' guardians administer, others write
    select case sg.access_level
             when 'full' then 'admin'::app.access_level
             when 'standard' then 'write'::app.access_level
             else 'read'::app.access_level
           end
      from public.student_guardians sg
     where sg.student_id = p_student and sg.user_id = v_user and sg.revoked_at is null

    union all
    -- 3. explicit staff assignment
    select ssa.access_level
      from public.student_staff_assignments ssa
     where ssa.student_id = p_student and ssa.user_id = v_user
       and ssa.active and ssa.revoked_at is null
       and (ssa.starts_on is null or ssa.starts_on <= current_date)
       and (ssa.ends_on is null or ssa.ends_on >= current_date)

    union all
    -- 4. derived from shared class membership
    select 'write'::app.access_level
      from public.class_students cs
      join public.class_staff cst on cst.class_id = cs.class_id and cst.active
      join public.classes c on c.id = cs.class_id and c.deleted_at is null
     where cs.student_id = p_student and cs.active and cst.user_id = v_user

    union all
    -- 5. organization administrator, only while the membership is active
    select 'admin'::app.access_level
      from public.student_organization_memberships som
      join public.organization_members om
        on om.organization_id = som.organization_id
       and om.user_id = v_user
       and om.status = 'active'
       and om.role = 'org_admin'
     where som.student_id = p_student
       and som.status = 'active'

    union all
    -- 6. time-boxed grant
    select sag.access_level
      from public.student_access_grants sag
     where sag.student_id = p_student
       and sag.grantee_user_id = v_user
       and sag.status = 'active'
       and sag.revoked_at is null
       and sag.expires_at > now()

    union all
    -- 7. break-glass platform support
    select 'read'::app.access_level
     where app.is_platform_support(null, p_student, v_user)
  ) candidates
  order by lvl desc
  limit 1;

  return coalesce(v_level, 'none'::app.access_level);
end;
$$;

comment on function app.student_access(uuid, uuid) is
  'Resolves a user''s access to a student: none < read < write < admin. '
  'The single source of truth for every student-scoped RLS policy.';

create or replace function app.can_read_student(p_student uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student, p_user) >= 'read'::app.access_level;
$$;

create or replace function app.can_write_student(p_student uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student, p_user) >= 'write'::app.access_level;
$$;

create or replace function app.can_admin_student(p_student uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student, p_user) >= 'admin'::app.access_level;
$$;

-- Fast path for child tables. Policies on high-volume tables use
--   student_id in (select app.my_student_ids())
-- so access is resolved once per statement instead of once per row.
create or replace function app.my_student_ids(
  p_user uuid default null, p_min_level app.access_level default 'read')
returns setof uuid language sql stable security definer set search_path = '' as $$
  with u as (select coalesce(p_user, auth.uid()) as uid)
  select distinct s.id
    from public.students s, u
   where s.deleted_at is null
     and (
       s.user_id = u.uid
       or exists (select 1 from public.student_guardians sg
                   where sg.student_id = s.id and sg.user_id = u.uid and sg.revoked_at is null)
       or exists (select 1 from public.student_staff_assignments ssa
                   where ssa.student_id = s.id and ssa.user_id = u.uid and ssa.active
                     and ssa.revoked_at is null
                     and (ssa.ends_on is null or ssa.ends_on >= current_date))
       or exists (select 1 from public.class_students cs
                    join public.class_staff cst on cst.class_id = cs.class_id and cst.active
                   where cs.student_id = s.id and cs.active and cst.user_id = u.uid)
       or exists (select 1 from public.student_organization_memberships som
                    join public.organization_members om
                      on om.organization_id = som.organization_id and om.user_id = u.uid
                     and om.status = 'active' and om.role = 'org_admin'
                   where som.student_id = s.id and som.status = 'active')
       or exists (select 1 from public.student_access_grants sag
                   where sag.student_id = s.id and sag.grantee_user_id = u.uid
                     and sag.status = 'active' and sag.revoked_at is null and sag.expires_at > now())
       or app.is_platform_support(null, s.id, u.uid))
     and app.student_access(s.id, u.uid) >= p_min_level;
$$;

-- Students of a given organization that the caller may see (org dashboards).
create or replace function app.org_student_ids(p_organization uuid, p_user uuid default null)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct som.student_id
    from public.student_organization_memberships som
   where som.organization_id = p_organization
     and som.status = 'active'
     and som.student_id in (select app.my_student_ids(p_user));
$$;

grant execute on function
  app.student_access(uuid, uuid),
  app.can_read_student(uuid, uuid),
  app.can_write_student(uuid, uuid),
  app.can_admin_student(uuid, uuid),
  app.my_student_ids(uuid, app.access_level),
  app.org_student_ids(uuid, uuid)
to authenticated, service_role;
