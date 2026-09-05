-- =============================================================================
-- 0048  STEP 2.5 - set-based authorization for the large tables
-- =============================================================================
-- Measured at scale (10k students, 30k documents, 40k calendar instances):
--
--   parent document inbox      38,304 ms   -> can_read_document() per row
--   org admin document list    47,708 ms   -> can_read_document() per row
--   calendar week query         2,957 ms   -> can_read_class() per row
--   everything else              3-9 ms
--
-- A scalar authorization function in a policy USING clause is evaluated once
-- per candidate row, so it must never appear on a table that can grow. The fix
-- is the same pattern used everywhere else: resolve the authorized set ONCE per
-- statement and let the planner hash it.
--
-- The scalar helpers are kept for single-row checks in application code and
-- tests, and are rewritten to read from the same source as the set functions so
-- the two can never disagree.
-- =============================================================================

-- --- scope sets --------------------------------------------------------------
create or replace function app.my_admin_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select om.organization_id from public.organization_members om
   where om.user_id = auth.uid() and om.status = 'active' and om.role = 'org_admin';
$$;

create or replace function app.my_class_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select cst.class_id
    from public.class_staff cst
   where cst.user_id = auth.uid() and cst.active
  union
  select c.id
    from public.classes c
   where c.deleted_at is null and c.organization_id in (select app.my_org_ids())
  union
  select cs.class_id
    from public.class_students cs
   where cs.active
     and cs.student_id in (select app.my_student_ids_for('academic_record', 'read'));
$$;

create or replace function app.my_manageable_class_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.classes c
   where c.deleted_at is null and c.organization_id in (select app.my_admin_org_ids())
  union
  select cst.class_id from public.class_staff cst
   where cst.user_id = auth.uid() and cst.active and cst.role in ('lead', 'assistant');
$$;

create or replace function app.my_shared_document_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select sh.document_id
    from public.document_shares sh
   where sh.revoked_at is null
     and (sh.expires_at is null or sh.expires_at > now())
     and (sh.shared_with_user_id = auth.uid()
          or sh.shared_with_organization_id in (select app.my_org_ids())
          or sh.shared_with_grant_id in (
               select g.id from public.student_access_grants g
                where g.grantee_user_id = auth.uid() and g.status = 'active'
                  and g.revoked_at is null and g.expires_at > now()));
$$;

-- --- the document visibility matrix, as a set -------------------------------
-- One row per (student, visibility) the caller may read. This is the single
-- definition of which relationship sees which visibility; both the policy and
-- app.can_read_document() read it, so they cannot drift apart.
create or replace function app.my_document_visibilities()
returns table (student_id uuid, visibility app.document_visibility)
language sql stable security definer set search_path = '' as $$
  select r.student_id, v.visibility
    from app.my_student_relationships() r
    join app.capabilities c
      on c.relationship = r.relationship
     and c.resource = 'document'
     and c.action = 'read'
     and (not c.requires_section
          or 'document' = any (coalesce(r.sections, '{}'::app.resource_type[])))
    cross join lateral (
      select unnest(
        case r.relationship
          -- the uploader and full guardians are the only readers of a private upload
          when 'guardian_full'        then array['family_private','family_shared','academic_shared',
                                                 'assigned_staff','evaluator_shared','system_compliance']
          when 'guardian_standard'    then array['family_shared','academic_shared',
                                                 'assigned_staff','evaluator_shared','system_compliance']
          when 'guardian_view_only'   then array['family_shared','academic_shared',
                                                 'assigned_staff','evaluator_shared','system_compliance']
          when 'student_self'         then array['family_shared','academic_shared']
          when 'staff_assigned_read'  then array['academic_shared','assigned_staff']
          when 'staff_assigned_write' then array['academic_shared','assigned_staff']
          -- class staff see academic work only; never family or evaluator material
          when 'class_staff'          then array['academic_shared']
          when 'org_admin'            then array['academic_shared']
          -- an evaluator sees what the parent selected for the evaluation
          when 'grant_evaluator'      then array['evaluator_shared']
          when 'grant_provider'       then array['evaluator_shared']
          when 'grant_review'         then array['evaluator_shared']
          when 'grant_transfer'       then array['academic_shared']
          when 'platform_support'     then array['academic_shared','system_compliance']
          else array[]::text[]
        end)::app.document_visibility as visibility
    ) v;
$$;

comment on function app.my_document_visibilities() is
  'The (student, visibility) pairs the caller may read. The single definition of '
  'the document visibility matrix, used by both the RLS policy and can_read_document().';

-- --- scalar check, rebuilt on the same source --------------------------------
create or replace function app.can_read_document(p_document uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
     where d.id = p_document
       and d.deleted_at is null
       and d.scan_status <> 'infected'
       and (d.uploaded_by = auth.uid()
            or (d.student_id, d.visibility) in
                 (select mv.student_id, mv.visibility from app.my_document_visibilities() mv)
            or d.id in (select app.my_shared_document_ids())
            or (d.visibility = 'organization_operational'
                and d.owner_organization_id in (select app.my_admin_org_ids()))
            or (d.student_id is null and d.family_id in (select app.my_family_ids()))));
$$;

-- --- rebuild the policies that were per-row ----------------------------------
drop policy documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (deleted_at is null
         and scan_status <> 'infected'
         and (uploaded_by = auth.uid()
              or (student_id, visibility) in
                   (select mv.student_id, mv.visibility from app.my_document_visibilities() mv)
              or id in (select app.my_shared_document_ids())
              or (visibility = 'organization_operational'
                  and owner_organization_id in (select app.my_admin_org_ids()))
              or (student_id is null and family_id is not null
                  and family_id in (select app.my_family_ids()))));

drop policy cei_select on public.calendar_event_instances;
create policy cei_select on public.calendar_event_instances
  for select to authenticated
  using (family_id in (select app.my_family_ids())
         or organization_id in (select app.my_org_ids())
         or class_id in (select app.my_class_ids()));

drop policy calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (deleted_at is null
         and (family_id in (select app.my_family_ids())
              or organization_id in (select app.my_org_ids())
              or class_id in (select app.my_class_ids())
              or id in (select ep.event_id from public.event_participants ep
                         where ep.student_id in (select app.my_student_ids_for('calendar', 'read')))));

drop policy classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (deleted_at is null and id in (select app.my_class_ids()));
drop policy classes_update on public.classes;
create policy classes_update on public.classes
  for update to authenticated
  using (id in (select app.my_manageable_class_ids()))
  with check (id in (select app.my_manageable_class_ids()));

drop policy class_students_select on public.class_students;
create policy class_students_select on public.class_students
  for select to authenticated
  using (class_id in (select app.my_class_ids())
         or student_id in (select app.my_student_ids_for('academic_record', 'read')));
drop policy class_students_write on public.class_students;
create policy class_students_write on public.class_students
  for all to authenticated
  using (class_id in (select app.my_manageable_class_ids()))
  with check (class_id in (select app.my_manageable_class_ids()));

drop policy class_staff_select on public.class_staff;
create policy class_staff_select on public.class_staff
  for select to authenticated
  using (user_id = auth.uid() or class_id in (select app.my_class_ids()));
drop policy class_staff_write on public.class_staff;
create policy class_staff_write on public.class_staff
  for all to authenticated
  using (class_id in (select app.my_manageable_class_ids()))
  with check (class_id in (select app.my_manageable_class_ids()));

drop policy lesson_groups_select on public.lesson_groups;
create policy lesson_groups_select on public.lesson_groups
  for select to authenticated using (class_id in (select app.my_class_ids()));
drop policy lesson_groups_write on public.lesson_groups;
create policy lesson_groups_write on public.lesson_groups
  for all to authenticated
  using (class_id in (select app.my_manageable_class_ids()))
  with check (class_id in (select app.my_manageable_class_ids()));

drop policy lessons_select on public.lessons;
create policy lessons_select on public.lessons
  for select to authenticated
  using (deleted_at is null
         and (family_id in (select app.my_family_ids())
              or organization_id in (select app.my_org_ids())
              or class_id in (select app.my_class_ids())
              or id in (select ls.lesson_id from public.lesson_students ls
                         where ls.student_id in (select app.my_student_ids_for('academic_record', 'read')))));

drop policy assignments_select on public.assignments;
create policy assignments_select on public.assignments
  for select to authenticated
  using (deleted_at is null
         and (family_id in (select app.my_family_ids())
              or organization_id in (select app.my_org_ids())
              or class_id in (select app.my_class_ids())
              or id in (select a2.assignment_id from public.assignment_students a2
                         where a2.student_id in (select app.my_student_ids_for('assignment', 'read')))));

drop policy event_participants_select on public.event_participants;
create policy event_participants_select on public.event_participants
  for select to authenticated
  using (user_id = auth.uid()
         or student_id in (select app.my_student_ids_for('calendar', 'read'))
         or class_id in (select app.my_class_ids()));


-- A FOR ALL policy's USING clause also applies to SELECT, so the write policies
-- on large tables have to be set-based as well.
create or replace function app.my_staff_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select om.organization_id from public.organization_members om
   where om.user_id = auth.uid() and om.status = 'active'
     and om.role in ('org_admin', 'teacher', 'tutor', 'staff');
$$;

create or replace function app.my_teaching_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select om.organization_id from public.organization_members om
   where om.user_id = auth.uid() and om.status = 'active'
     and om.role in ('org_admin', 'teacher', 'tutor');
$$;

drop policy calendar_events_write on public.calendar_events;
create policy calendar_events_write on public.calendar_events
  for all to authenticated
  using (family_id in (select app.my_family_ids())
         or organization_id in (select app.my_staff_org_ids()))
  with check (family_id in (select app.my_family_ids())
              or organization_id in (select app.my_staff_org_ids()));

drop policy lessons_write on public.lessons;
create policy lessons_write on public.lessons
  for all to authenticated
  using (family_id in (select app.my_family_ids())
         or organization_id in (select app.my_teaching_org_ids()))
  with check (family_id in (select app.my_family_ids())
              or organization_id in (select app.my_teaching_org_ids()));

drop policy assignments_write on public.assignments;
create policy assignments_write on public.assignments
  for all to authenticated
  using (family_id in (select app.my_family_ids())
         or class_id in (select app.my_manageable_class_ids())
         or organization_id in (select app.my_teaching_org_ids()))
  with check (family_id in (select app.my_family_ids())
              or class_id in (select app.my_manageable_class_ids())
              or organization_id in (select app.my_teaching_org_ids()));

drop policy event_participants_write on public.event_participants;
create policy event_participants_write on public.event_participants
  for all to authenticated
  using (event_id in (select e.id from public.calendar_events e
                       where e.family_id in (select app.my_family_ids())
                          or e.organization_id in (select app.my_org_ids())))
  with check (event_id in (select e.id from public.calendar_events e
                            where e.family_id in (select app.my_family_ids())
                               or e.organization_id in (select app.my_org_ids())));

revoke all on function app.my_staff_org_ids(), app.my_teaching_org_ids()
  from public, anon, authenticated;
grant execute on function app.my_staff_org_ids(), app.my_teaching_org_ids()
  to authenticated, service_role;

-- --- supporting indexes ------------------------------------------------------
create index if not exists documents_student_visibility_date_idx
  on public.documents (student_id, visibility, document_date desc) where deleted_at is null;
create index if not exists class_students_class_active_idx
  on public.class_students (class_id) where active;
create index if not exists cei_class_idx on public.calendar_event_instances (class_id, starts_at);

-- --- privileges for the new helpers -----------------------------------------
revoke all on function
  app.my_admin_org_ids(), app.my_class_ids(), app.my_manageable_class_ids(),
  app.my_shared_document_ids(), app.my_document_visibilities()
from public, anon, authenticated;
grant execute on function
  app.my_admin_org_ids(), app.my_class_ids(), app.my_manageable_class_ids(),
  app.my_shared_document_ids(), app.my_document_visibilities()
to authenticated, service_role;
