-- =============================================================================
-- 0041  STEP 2.5 - the authorization function layer
-- =============================================================================
-- Two deliberate changes to the shape of the API:
--
-- 1. NO FUNCTION TAKES A `p_user` ARGUMENT ANY MORE.
--    A helper that answers "what may THIS OTHER USER do?" is itself an
--    escalation and enumeration surface: `app.my_student_ids(<victim>)` would
--    have returned another family's student ids to any authenticated caller.
--    Because these run SECURITY DEFINER, an in-function check on current_user
--    cannot distinguish the caller (current_user is already the function owner),
--    so the parameter is removed rather than guarded. Every function now answers
--    only for auth.uid().
--
-- 2. CLASS MEMBERSHIP NO LONGER RESOLVES TO STUDENT-LEVEL WRITE.
--    It resolves to `read` at the student level, and academic write authority
--    comes from the capability matrix instead. See app.student_access() below.
--
-- All policies and the old function signatures are dropped and rebuilt: policy
-- expressions bind to a function OID, so the signatures cannot change underneath
-- them.
-- =============================================================================

-- --- drop every policy; 0042 rebuilds the complete surface -------------------
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname
             from pg_policies where schemaname in ('public', 'storage')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- The AI telemetry projection binds to these functions; it is rebuilt below.
drop view if exists public.ai_usage_summary;

-- --- drop the user-parameterised helpers ------------------------------------
drop function if exists app.permission_override(uuid, text, uuid, text);
drop function if exists app.is_platform_support(uuid, uuid, uuid);
drop function if exists app.my_org_ids(uuid);
drop function if exists app.is_org_member(uuid, app.org_role[], uuid);
drop function if exists app.is_org_admin(uuid, uuid);
drop function if exists app.can_read_org(uuid, uuid);
drop function if exists app.my_family_ids(uuid);
drop function if exists app.is_family_member(uuid, uuid);
drop function if exists app.student_access(uuid, uuid);
drop function if exists app.can_read_student(uuid, uuid);
drop function if exists app.can_write_student(uuid, uuid);
drop function if exists app.can_admin_student(uuid, uuid);
drop function if exists app.my_student_ids(uuid, app.access_level);
drop function if exists app.org_student_ids(uuid, uuid);
drop function if exists app.can_read_profile(uuid, uuid);
drop function if exists app.can_view_organization(uuid, uuid);
drop function if exists app.can_read_family(uuid, uuid);
drop function if exists app.can_read_class(uuid, uuid);
drop function if exists app.can_manage_class(uuid, uuid);
drop function if exists app.is_thread_participant(uuid, uuid);
drop function if exists app.can_read_document(uuid, uuid);
drop function if exists app.can_read_family_row(uuid, uuid, uuid, uuid);
drop function if exists app.can_upload_to_prefix(text, uuid);

-- Student-scope overrides may only ever NARROW authority. An 'allow' row must
-- not be able to widen what the capability matrix grants.
alter table public.user_permissions
  add constraint user_permissions_student_deny_only_ck
  check (scope_type <> 'student' or effect = 'deny');

-- Break-glass sessions must name a scope.
alter table public.support_access_sessions
  add constraint sas_scope_ck check (num_nonnulls(student_id, organization_id) >= 1);

-- =============================================================================
-- scope helpers (all answer for auth.uid() only)
-- =============================================================================
create or replace function app.permission_override(
  p_scope_type text, p_scope_id uuid, p_permission text)
returns text language sql stable security definer set search_path = '' as $$
  select up.effect
    from public.user_permissions up
   where up.user_id = auth.uid()
     and up.scope_type = p_scope_type
     and up.scope_id = p_scope_id
     and up.permission = p_permission
     and (up.expires_at is null or up.expires_at > now())
   order by case up.effect when 'deny' then 0 else 1 end
   limit 1;
$$;

create or replace function app.is_platform_support(
  p_organization uuid default null, p_student uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.support_access_sessions s
      join public.profiles p on p.id = s.user_id and p.is_super_admin
     where s.user_id = auth.uid()
       and s.closed_at is null
       and s.expires_at > now()
       and (s.organization_id is null or p_organization is null or s.organization_id = p_organization)
       and (s.student_id is null or p_student is null or s.student_id = p_student));
$$;

create or replace function app.my_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select om.organization_id from public.organization_members om
   where om.user_id = auth.uid() and om.status = 'active';
$$;

create or replace function app.is_org_member(p_organization uuid, p_roles app.org_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
     where om.organization_id = p_organization
       and om.user_id = auth.uid()
       and om.status = 'active'
       and (p_roles is null or om.role = any (p_roles)));
$$;

create or replace function app.is_org_admin(p_organization uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.is_org_member(p_organization, array['org_admin']::app.org_role[]);
$$;

create or replace function app.can_read_org(p_organization uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_organization is not null
     and (app.is_org_member(p_organization) or app.is_platform_support(p_organization));
$$;

create or replace function app.my_family_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select fm.family_id from public.family_members fm where fm.user_id = auth.uid()
  union
  select s.family_id
    from public.student_guardians sg
    join public.students s on s.id = sg.student_id
   where sg.user_id = auth.uid() and sg.revoked_at is null;
$$;

create or replace function app.is_family_member(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_family is not null and p_family in (select app.my_family_ids());
$$;

-- =============================================================================
-- Q1: can this user reach this student at all?
-- =============================================================================
-- The relationship set is the single input to both Q1 and Q2.
create or replace function app.my_student_relationships()
returns table (student_id uuid, relationship app.relationship_kind, sections app.resource_type[])
language sql stable security definer set search_path = '' as $$
  -- the student themself
  select s.id, 'student_self'::app.relationship_kind, null::app.resource_type[]
    from public.students s
   where s.user_id = auth.uid() and s.deleted_at is null

  union all
  -- guardian, split by recorded access level
  select sg.student_id,
         (case sg.access_level
            when 'full'     then 'guardian_full'
            when 'standard' then 'guardian_standard'
            else                 'guardian_view_only'
          end)::app.relationship_kind,
         null
    from public.student_guardians sg
   where sg.user_id = auth.uid() and sg.revoked_at is null

  union all
  -- explicit staff assignment, date bounded
  select ssa.student_id,
         (case ssa.access_level
            when 'write' then 'staff_assigned_write'
            else              'staff_assigned_read'
          end)::app.relationship_kind,
         null
    from public.student_staff_assignments ssa
   where ssa.user_id = auth.uid() and ssa.active and ssa.revoked_at is null
     and (ssa.starts_on is null or ssa.starts_on <= current_date)
     and (ssa.ends_on is null or ssa.ends_on >= current_date)

  union all
  -- derived from co-membership of a class
  select cs.student_id, 'class_staff'::app.relationship_kind, null
    from public.class_students cs
    join public.class_staff cst on cst.class_id = cs.class_id and cst.active
    join public.classes c on c.id = cs.class_id and c.deleted_at is null
   where cs.active and cst.user_id = auth.uid()

  union all
  -- organization administrator, only while the enrolment is active
  select som.student_id, 'org_admin'::app.relationship_kind, null
    from public.student_organization_memberships som
    join public.organization_members om
      on om.organization_id = som.organization_id
     and om.status = 'active' and om.role = 'org_admin'
   where om.user_id = auth.uid() and som.status = 'active'

  union all
  -- time-boxed grant, carrying its section list
  select sag.student_id,
         (case sag.kind
            when 'evaluation' then 'grant_evaluator'
            when 'provider'   then 'grant_provider'
            when 'transfer'   then 'grant_transfer'
            else                   'grant_review'
          end)::app.relationship_kind,
         sag.sections
    from public.student_access_grants sag
   where sag.grantee_user_id = auth.uid() and sag.status = 'active'
     and sag.revoked_at is null and sag.expires_at > now()

  union all
  -- break-glass, student scoped
  select sas.student_id, 'platform_support'::app.relationship_kind, null
    from public.support_access_sessions sas
    join public.profiles p on p.id = sas.user_id and p.is_super_admin
   where sas.user_id = auth.uid() and sas.closed_at is null
     and sas.expires_at > now() and sas.student_id is not null

  union all
  -- break-glass, organization scoped
  select som.student_id, 'platform_support'::app.relationship_kind, null
    from public.support_access_sessions sas
    join public.profiles p on p.id = sas.user_id and p.is_super_admin
    join public.student_organization_memberships som
      on som.organization_id = sas.organization_id and som.status = 'active'
   where sas.user_id = auth.uid() and sas.closed_at is null
     and sas.expires_at > now() and sas.student_id is null and sas.organization_id is not null;
$$;

comment on function app.my_student_relationships() is
  'Every relationship the current user has to any student. The single input to '
  'app.student_access() (Q1) and app.can_student_action() (Q2).';

create or replace function app.student_access(p_student uuid)
returns app.access_level
language plpgsql stable security definer set search_path = '' as $$
declare v_level app.access_level;
begin
  if p_student is null or auth.uid() is null then
    return 'none'::app.access_level;
  end if;
  if app.permission_override('student', p_student, 'student.access') = 'deny' then
    return 'none'::app.access_level;
  end if;

  select lvl into v_level from (
    select (case r.relationship
              when 'student_self'         then 'read'
              when 'guardian_full'        then 'admin'
              when 'guardian_standard'    then 'write'
              when 'guardian_view_only'   then 'read'
              when 'staff_assigned_write' then 'write'
              when 'staff_assigned_read'  then 'read'
              -- STEP 2.5: class membership is READ at the student level.
              -- Academic write comes from app.capabilities, not from here.
              when 'class_staff'          then 'read'
              when 'org_admin'            then 'admin'
              when 'platform_support'     then 'read'
              -- grant-based relationships never confer generic student write
              else 'read'
            end)::app.access_level as lvl
      from app.my_student_relationships() r
     where r.student_id = p_student
  ) candidates
  order by lvl desc
  limit 1;

  return coalesce(v_level, 'none'::app.access_level);
end;
$$;

comment on function app.student_access(uuid) is
  'Q1 - can this user reach this student at all, and how broadly. It is a GATE, '
  'not the final authorization: every resource policy also asks '
  'app.can_student_action(). Class membership deliberately resolves to read.';

create or replace function app.can_read_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student) >= 'read'::app.access_level;
$$;
create or replace function app.can_write_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student) >= 'write'::app.access_level;
$$;
create or replace function app.can_admin_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.student_access(p_student) >= 'admin'::app.access_level;
$$;

create or replace function app.my_student_ids(p_min_level app.access_level default 'read')
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct r.student_id
    from app.my_student_relationships() r
   where app.student_access(r.student_id) >= p_min_level;
$$;

-- =============================================================================
-- Q2: may this user perform this ACTION on this RESOURCE for this student?
-- =============================================================================
create or replace function app.can_student_action(
  p_student uuid, p_resource app.resource_type, p_action app.resource_action)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_student is not null
     and auth.uid() is not null
     and app.permission_override('student', p_student, 'student.access') is distinct from 'deny'
     and app.permission_override('student', p_student,
           p_resource::text || '.' || p_action::text) is distinct from 'deny'
     and exists (
       select 1
         from app.my_student_relationships() r
         join app.capabilities c
           on c.relationship = r.relationship
          and c.resource = p_resource
          and c.action = p_action
        where r.student_id = p_student
          and (not c.requires_section
               or p_resource = any (coalesce(r.sections, '{}'::app.resource_type[]))));
$$;

comment on function app.can_student_action(uuid, app.resource_type, app.resource_action) is
  'Q2 - the resource/action gate. Authority comes only from app.capabilities; '
  'user_permissions may narrow it (deny) but never widen it.';

-- Set form for RLS: resolved once per statement instead of once per row.
create or replace function app.my_student_ids_for(
  p_resource app.resource_type, p_action app.resource_action)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct r.student_id
    from app.my_student_relationships() r
    join app.capabilities c
      on c.relationship = r.relationship
     and c.resource = p_resource
     and c.action = p_action
   where (not c.requires_section
          or p_resource = any (coalesce(r.sections, '{}'::app.resource_type[])))
     and not exists (
       select 1 from public.user_permissions up
        where up.user_id = auth.uid()
          and up.scope_type = 'student'
          and up.scope_id = r.student_id
          and up.effect = 'deny'
          and up.permission in ('student.access', p_resource::text || '.' || p_action::text)
          and (up.expires_at is null or up.expires_at > now()));
$$;

comment on function app.my_student_ids_for(app.resource_type, app.resource_action) is
  'The students for which the caller may perform this action. Use this in RLS '
  'USING clauses: `student_id in (select app.my_student_ids_for(...))` is a '
  'single hashed subplan per statement.';

create or replace function app.org_student_ids(p_organization uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct som.student_id
    from public.student_organization_memberships som
   where som.organization_id = p_organization
     and som.status = 'active'
     and som.student_id in (select app.my_student_ids_for('student_profile', 'read'));
$$;

-- =============================================================================
-- other read-scope helpers
-- =============================================================================
create or replace function app.can_read_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile = auth.uid()
      or exists (
        select 1 from public.organization_members a
          join public.organization_members b on b.organization_id = a.organization_id
         where a.user_id = auth.uid() and a.status = 'active'
           and b.user_id = p_profile and b.status = 'active')
      or exists (
        select 1 from public.student_guardians sg
         where sg.user_id = p_profile and sg.revoked_at is null
           and sg.student_id in (select app.my_student_ids_for('guardian', 'read')))
      or exists (
        select 1 from public.student_staff_assignments ssa
         where ssa.user_id = p_profile and ssa.active
           and ssa.student_id in (select app.my_student_ids_for('student_profile', 'read')))
      or exists (
        select 1 from public.message_thread_participants p1
          join public.message_thread_participants p2 on p2.thread_id = p1.thread_id
         where p1.user_id = auth.uid() and p1.left_at is null
           and p2.user_id = p_profile and p2.left_at is null)
      or app.is_platform_support();
$$;

create or replace function app.can_view_organization(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org is not null and (
    app.is_org_member(p_org)
    or app.is_platform_support(p_org)
    or exists (select 1 from public.family_organization_memberships fom
                where fom.organization_id = p_org
                  and fom.status in ('pending', 'active', 'paused')
                  and fom.family_id in (select app.my_family_ids()))
    or exists (select 1 from public.student_organization_memberships som
                where som.organization_id = p_org
                  and som.student_id in (select app.my_student_ids_for('organization_enrollment', 'read'))));
$$;

create or replace function app.can_read_family(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_family is not null and (
    app.is_family_member(p_family)
    or exists (select 1 from public.students s
                where s.family_id = p_family and s.deleted_at is null
                  and s.id in (select app.my_student_ids_for('student_profile', 'read')))
    or app.is_platform_support());
$$;

create or replace function app.can_read_class(p_class uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_class is not null and exists (
    select 1 from public.classes c
     where c.id = p_class and c.deleted_at is null
       and (app.can_read_org(c.organization_id)
            or exists (select 1 from public.class_students cs
                        where cs.class_id = c.id and cs.active
                          and cs.student_id in (select app.my_student_ids_for('academic_record', 'read')))));
$$;

create or replace function app.can_manage_class(p_class uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_class is not null and exists (
    select 1 from public.classes c
     where c.id = p_class and c.deleted_at is null
       and (app.is_org_admin(c.organization_id)
            or exists (select 1 from public.class_staff cst
                        where cst.class_id = c.id and cst.active
                          and cst.user_id = auth.uid()
                          and cst.role in ('lead', 'assistant'))));
$$;

create or replace function app.is_thread_participant(p_thread uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_thread is not null and exists (
    select 1 from public.message_thread_participants p
     where p.thread_id = p_thread and p.user_id = auth.uid() and p.left_at is null);
$$;

-- =============================================================================
-- document readability: student access AND visibility AND explicit shares
-- =============================================================================
-- Reaching a student never implies reading every document belonging to them.
create or replace function app.can_read_document(p_document uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.documents d
     where d.id = p_document
       and d.deleted_at is null
       and d.scan_status <> 'infected'
       and (
         -- the uploader always sees their own upload
         d.uploaded_by = auth.uid()

         -- an explicit, unexpired share
         or exists (select 1 from public.document_shares sh
                     where sh.document_id = d.id
                       and sh.revoked_at is null
                       and (sh.expires_at is null or sh.expires_at > now())
                       and (sh.shared_with_user_id = auth.uid()
                            or sh.shared_with_grant_id in (
                                 select g.id from public.student_access_grants g
                                  where g.grantee_user_id = auth.uid()
                                    and g.status = 'active' and g.revoked_at is null
                                    and g.expires_at > now())
                            or (sh.shared_with_organization_id is not null
                                and app.is_org_member(sh.shared_with_organization_id))))

         -- Organization operational documents (contracts, HR, internal admin)
         -- are for organization ADMINISTRATORS, not every member of staff.
         -- Wider staff access is granted by an explicit, audited share above.
         or (d.visibility = 'organization_operational'
             and d.owner_organization_id is not null
             and app.is_org_admin(d.owner_organization_id))

         -- otherwise: visibility decides, on top of resource authorization
         or (d.student_id is not null
             and d.student_id in (select app.my_student_ids_for('document', 'read'))
             and case d.visibility
                   when 'family_private' then
                     -- uploader plus FULL guardians only
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship = 'guardian_full')
                   when 'family_shared' then
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship in ('guardian_full','guardian_standard',
                                                       'guardian_view_only','student_self'))
                   when 'academic_shared' then
                     -- family and staff with academic access. Deliberately NOT
                     -- grant holders: an evaluator reads documents the parent
                     -- selected (evaluator_shared or an explicit share), never
                     -- every academic document by default.
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship in ('guardian_full','guardian_standard',
                                                       'guardian_view_only','student_self',
                                                       'staff_assigned_read','staff_assigned_write',
                                                       'class_staff','org_admin','platform_support'))
                   when 'assigned_staff' then
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship in ('guardian_full','guardian_standard',
                                                       'guardian_view_only',
                                                       'staff_assigned_read','staff_assigned_write'))
                   when 'evaluator_shared' then
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship in ('guardian_full','guardian_standard',
                                                       'guardian_view_only','grant_evaluator'))
                   when 'system_compliance' then
                     exists (select 1 from app.my_student_relationships() r
                              where r.student_id = d.student_id
                                and r.relationship in ('guardian_full','guardian_standard',
                                                       'guardian_view_only','platform_support'))
                   else false
                 end)

         -- family-level documents not yet attached to a student
         or (d.student_id is null and d.family_id is not null
             and d.family_id in (select app.my_family_ids()))

         or app.is_platform_support(d.organization_id, d.student_id)));
$$;

comment on function app.can_read_document(uuid) is
  'Document readability is student authorization AND visibility AND explicit '
  'shares. A teacher who can reach a student cannot read that student''s '
  'family_private documents.';

-- Retention and legal hold are a guardian_full capability (document.approve).
create or replace function app.protect_document_retention()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.legal_hold is distinct from old.legal_hold
      or new.retention_until is distinct from old.retention_until)
     and new.student_id is not null
     and not app.can_student_action(new.student_id, 'document', 'approve')
     and auth.uid() is not null then
    raise exception 'changing retention or legal hold requires document.approve authority'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger protect_document_retention
  before update on public.documents
  for each row execute function app.protect_document_retention();

-- --- storage prefix ownership ------------------------------------------------
create or replace function app.can_upload_to_prefix(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  with parts as (select storage.foldername(p_name) as f)
  select case
           when (select array_length(f, 1) from parts) is null then false
           when (select f[1] from parts) !~ '^[0-9a-fA-F-]{36}$' then false
           else app.is_family_member((select f[1] from parts)::uuid)
             or app.is_org_member((select f[1] from parts)::uuid)
         end;
$$;

-- --- rebuild the AI telemetry projection ------------------------------------
-- Provider, model, prompt version and error text stay out of it by design.
create view public.ai_usage_summary as
select e.id, e.feature, e.organization_id, e.family_id, e.student_id,
       e.input_tokens, e.output_tokens, e.cached_tokens, e.estimated_cost_usd,
       e.latency_ms, e.status, e.created_at
  from public.ai_usage_events e
 where (e.organization_id is not null and app.is_org_admin(e.organization_id))
    or app.is_platform_support(e.organization_id, e.student_id);

comment on view public.ai_usage_summary is
  'Cost and usage for organization administrators. Provider internals are omitted.';
