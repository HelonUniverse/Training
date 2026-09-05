-- =============================================================================
-- 0029  Read-scope helper functions used by RLS policies
-- =============================================================================
-- Every helper is SECURITY DEFINER so a policy that calls it does not recurse
-- into the RLS of the tables it inspects (notably message_thread_participants,
-- whose own policy must ask "is the caller in this thread?").
-- =============================================================================

create or replace function app.can_read_profile(p_profile uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  with u as (select coalesce(p_user, auth.uid()) as uid)
  select exists (select 1 from u where p_profile = u.uid)
      or exists (
        select 1 from public.organization_members a
          join public.organization_members b on b.organization_id = a.organization_id
          , u
         where a.user_id = u.uid and a.status = 'active'
           and b.user_id = p_profile and b.status = 'active')
      or exists (
        select 1 from public.student_guardians sg
         where sg.user_id = p_profile and sg.revoked_at is null
           and app.can_read_student(sg.student_id, (select uid from u)))
      or exists (
        select 1 from public.student_staff_assignments ssa
         where ssa.user_id = p_profile and ssa.active
           and app.can_read_student(ssa.student_id, (select uid from u)))
      or exists (
        select 1 from public.message_thread_participants p1
          join public.message_thread_participants p2 on p2.thread_id = p1.thread_id
          , u
         where p1.user_id = u.uid and p1.left_at is null
           and p2.user_id = p_profile and p2.left_at is null)
      or app.is_platform_support(null, null, (select uid from u));
$$;

-- A family can see an organization it is connected to; an organization member
-- can see their own organization.
create or replace function app.can_view_organization(p_org uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org is not null and (
    app.is_org_member(p_org, null, p_user)
    or app.is_platform_support(p_org, null, p_user)
    or exists (
      select 1 from public.family_organization_memberships fom
       where fom.organization_id = p_org
         and fom.status in ('pending', 'active', 'paused')
         and app.is_family_member(fom.family_id, p_user))
    or exists (
      select 1 from public.student_organization_memberships som
       where som.organization_id = p_org
         and som.student_id in (select app.my_student_ids(p_user))));
$$;

-- Organization staff may read the family record of a student they can reach.
create or replace function app.can_read_family(p_family uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_family is not null and (
    app.is_family_member(p_family, p_user)
    or exists (
      select 1 from public.students s
       where s.family_id = p_family
         and s.deleted_at is null
         and s.id in (select app.my_student_ids(p_user)))
    or app.is_platform_support(null, null, p_user));
$$;

create or replace function app.can_read_class(p_class uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_class is not null and exists (
    select 1 from public.classes c
     where c.id = p_class
       and c.deleted_at is null
       and (app.can_read_org(c.organization_id, p_user)
            or exists (select 1 from public.class_students cs
                        where cs.class_id = c.id and cs.active
                          and cs.student_id in (select app.my_student_ids(p_user)))));
$$;

create or replace function app.can_manage_class(p_class uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_class is not null and exists (
    select 1 from public.classes c
     where c.id = p_class
       and c.deleted_at is null
       and (app.is_org_admin(c.organization_id, p_user)
            or exists (select 1 from public.class_staff cst
                        where cst.class_id = c.id and cst.active
                          and cst.user_id = coalesce(p_user, auth.uid())
                          and cst.role in ('lead', 'assistant'))));
$$;

create or replace function app.is_thread_participant(p_thread uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_thread is not null and exists (
    select 1 from public.message_thread_participants p
     where p.thread_id = p_thread
       and p.user_id = coalesce(p_user, auth.uid())
       and p.left_at is null);
$$;

-- Document readability, reused by document_versions and document_ai_analysis.
-- A document that failed malware scanning is unreadable by everyone.
create or replace function app.can_read_document(p_document uuid, p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
     where d.id = p_document
       and d.deleted_at is null
       and d.scan_status <> 'infected'
       and (d.uploaded_by = coalesce(p_user, auth.uid())
            or (d.student_id is not null and app.can_read_student(d.student_id, p_user))
            or (d.family_id is not null and app.is_family_member(d.family_id, p_user))
            or (d.owner_organization_id is not null
                and d.record_class = 'organization_operational'
                and app.is_org_member(d.owner_organization_id, null, p_user))
            or app.is_platform_support(d.organization_id, d.student_id, p_user)));
$$;

-- Family-scoped rows: "this row belongs to a family I am part of".
create or replace function app.can_read_family_row(p_family uuid, p_student uuid, p_org uuid,
                                                   p_user uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_student is not null and app.can_read_student(p_student, p_user))
      or (p_family is not null and app.is_family_member(p_family, p_user))
      or (p_org is not null and app.is_org_member(p_org, null, p_user));
$$;

grant execute on function
  app.can_read_profile(uuid, uuid),
  app.can_view_organization(uuid, uuid),
  app.can_read_family(uuid, uuid),
  app.can_read_class(uuid, uuid),
  app.can_manage_class(uuid, uuid),
  app.is_thread_participant(uuid, uuid),
  app.can_read_document(uuid, uuid),
  app.can_read_family_row(uuid, uuid, uuid, uuid)
to authenticated, service_role;
