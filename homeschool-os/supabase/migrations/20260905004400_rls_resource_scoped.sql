-- =============================================================================
-- 0042  STEP 2.5 - the complete RLS surface, resource-scoped
-- =============================================================================
-- Supersedes the policy sets in 0030-0034 (all of which were dropped in 0041).
-- The whole policy surface now lives in ONE file so a reviewer can read it end
-- to end.
--
-- Patterns:
--   SELECT  student_id in (select app.my_student_ids_for('<resource>','read'))
--   INSERT  with check (app.can_student_action(student_id,'<resource>','create'))
--   UPDATE  using (... my_student_ids_for(...,'update')) with check (can_student_action(...))
--   DELETE  using (... my_student_ids_for(...,'delete'))
--
-- The set form resolves authorization once per statement; the scalar form is
-- used only in WITH CHECK, which sees only the rows actually being written.
-- =============================================================================

-- =============================== reference ===================================
create policy locales_select on public.locales for select to authenticated using (true);

create policy content_translations_select on public.content_translations
  for select to authenticated
  using (organization_id is null or app.can_view_organization(organization_id));
create policy content_translations_write on public.content_translations
  for all to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id))
  with check (organization_id is not null and app.is_org_admin(organization_id));

create policy data_ownership_registry_select on public.data_ownership_registry
  for select to authenticated using (true);

-- =============================== identity ====================================
create policy profiles_select on public.profiles
  for select to authenticated using (app.can_read_profile(id));
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select on public.organizations
  for select to authenticated using (deleted_at is null and app.can_view_organization(id));
create policy organizations_insert on public.organizations
  for insert to authenticated with check (created_by = auth.uid());
create policy organizations_update on public.organizations
  for update to authenticated using (app.is_org_admin(id)) with check (app.is_org_admin(id));

create policy org_locations_select on public.organization_locations
  for select to authenticated using (deleted_at is null and app.can_view_organization(organization_id));
create policy org_locations_write on public.organization_locations
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy org_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or app.is_org_member(organization_id) or app.is_platform_support(organization_id));
create policy org_members_write on public.organization_members
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy invitations_select on public.invitations
  for select to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id))
         or lower(email) = lower((select p.email from public.profiles p where p.id = auth.uid())));
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check ((organization_id is not null and app.is_org_admin(organization_id))
              or (family_id is not null and app.is_family_member(family_id)));
create policy invitations_update on public.invitations
  for update to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id))
         or lower(email) = lower((select p.email from public.profiles p where p.id = auth.uid())))
  with check (true);

create policy families_select on public.families
  for select to authenticated using (deleted_at is null and app.can_read_family(id));
create policy families_insert on public.families
  for insert to authenticated with check (created_by = auth.uid());
create policy families_update on public.families
  for update to authenticated using (app.is_family_member(id)) with check (app.is_family_member(id));

create policy family_members_select on public.family_members
  for select to authenticated using (app.can_read_family(family_id));
create policy family_members_write on public.family_members
  for all to authenticated
  using (app.is_family_member(family_id)) with check (app.is_family_member(family_id));

create policy family_org_memberships_select on public.family_organization_memberships
  for select to authenticated
  using (app.can_read_family(family_id) or app.can_read_org(organization_id));
create policy family_org_memberships_write on public.family_organization_memberships
  for all to authenticated
  using (app.is_family_member(family_id) or app.is_org_admin(organization_id))
  with check (app.is_family_member(family_id) or app.is_org_admin(organization_id));

create policy user_permissions_select on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid()
         or (scope_type = 'organization' and app.is_org_admin(scope_id))
         or (scope_type = 'student' and scope_id in (select app.my_student_ids_for('access_grant','read')))
         or (scope_type = 'family' and app.is_family_member(scope_id)));
create policy user_permissions_write on public.user_permissions
  for all to authenticated
  using ((scope_type = 'organization' and app.is_org_admin(scope_id))
         or (scope_type = 'student' and app.can_student_action(scope_id, 'access_grant', 'update'))
         or (scope_type = 'family' and app.is_family_member(scope_id)))
  with check ((scope_type = 'organization' and app.is_org_admin(scope_id))
              or (scope_type = 'student' and app.can_student_action(scope_id, 'access_grant', 'update'))
              or (scope_type = 'family' and app.is_family_member(scope_id)));

-- =============================== students ====================================
create policy students_select on public.students
  for select to authenticated
  using (deleted_at is null and id in (select app.my_student_ids_for('student_profile', 'read')));
create policy students_insert on public.students
  for insert to authenticated
  with check (app.is_family_member(family_id)
              or exists (select 1 from public.family_organization_memberships fom
                          where fom.family_id = students.family_id
                            and fom.status = 'active'
                            and app.is_org_admin(fom.organization_id)));
create policy students_update on public.students
  for update to authenticated
  using (id in (select app.my_student_ids_for('student_profile', 'update')))
  with check (app.can_student_action(id, 'student_profile', 'update'));

-- guardians: only a full guardian manages the guardian set
create policy student_guardians_select on public.student_guardians
  for select to authenticated
  using (user_id = auth.uid() or student_id in (select app.my_student_ids_for('guardian', 'read')));
create policy student_guardians_insert on public.student_guardians
  for insert to authenticated with check (app.can_student_action(student_id, 'guardian', 'create'));
create policy student_guardians_update on public.student_guardians
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('guardian', 'update')))
  with check (app.can_student_action(student_id, 'guardian', 'update'));
create policy student_guardians_delete on public.student_guardians
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('guardian', 'delete')));

-- enrolment history: organization-operational, but the family sees and keeps it
create policy som_select on public.student_organization_memberships
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('organization_enrollment', 'read'))
         or app.is_org_member(organization_id));
create policy som_insert on public.student_organization_memberships
  for insert to authenticated
  with check (app.can_student_action(student_id, 'organization_enrollment', 'create')
              or app.is_org_admin(organization_id));
create policy som_update on public.student_organization_memberships
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('organization_enrollment', 'update'))
         or app.is_org_admin(organization_id))
  with check (app.can_student_action(student_id, 'organization_enrollment', 'update')
              or app.is_org_admin(organization_id));

-- staff assignments are an organization-operational act over an enrolment
create policy ssa_select on public.student_staff_assignments
  for select to authenticated
  using (user_id = auth.uid()
         or student_id in (select app.my_student_ids_for('organization_enrollment', 'read'))
         or (organization_id is not null and app.is_org_admin(organization_id)));
create policy ssa_write on public.student_staff_assignments
  for all to authenticated
  using (app.can_student_action(student_id, 'organization_enrollment', 'update')
         or (organization_id is not null and app.is_org_admin(organization_id)))
  with check (app.can_student_action(student_id, 'organization_enrollment', 'update')
              or (organization_id is not null and app.is_org_admin(organization_id)));

-- access grants: ONLY a full guardian shares a child onward
create policy sag_select on public.student_access_grants
  for select to authenticated
  using (grantee_user_id = auth.uid()
         or student_id in (select app.my_student_ids_for('access_grant', 'read')));
create policy sag_insert on public.student_access_grants
  for insert to authenticated with check (app.can_student_action(student_id, 'access_grant', 'create'));
create policy sag_update on public.student_access_grants
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('access_grant', 'update')))
  with check (app.can_student_action(student_id, 'access_grant', 'update'));
create policy sag_delete on public.student_access_grants
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('access_grant', 'delete')));

create policy support_sessions_select on public.support_access_sessions
  for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
create policy support_sessions_insert on public.support_access_sessions
  for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
create policy support_sessions_update on public.support_access_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================== consent =====================================
create policy consent_policies_select on public.consent_policies
  for select to authenticated
  using (organization_id is null or app.can_view_organization(organization_id));
create policy consent_policies_write on public.consent_policies
  for all to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id))
  with check (organization_id is not null and app.is_org_admin(organization_id));

create policy consents_select on public.consents
  for select to authenticated
  using (subject_user_id = auth.uid()
         or guardian_id = auth.uid()
         or (subject_student_id is not null
             and subject_student_id in (select app.my_student_ids_for('consent', 'read'))));
create policy consents_insert on public.consents
  for insert to authenticated
  with check (subject_user_id = auth.uid()
              or (subject_student_id is not null
                  and app.can_student_action(subject_student_id, 'consent', 'create')));

-- =============================== academics ===================================
create policy academic_years_select on public.academic_years
  for select to authenticated
  using ((organization_id is not null and app.can_read_org(organization_id))
         or (family_id is not null and app.can_read_family(family_id)));
create policy academic_years_write on public.academic_years
  for all to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id)))
  with check ((organization_id is not null and app.is_org_admin(organization_id))
              or (family_id is not null and app.is_family_member(family_id)));

create policy subjects_select on public.subjects
  for select to authenticated
  using ((organization_id is null and family_id is null)
         or (organization_id is not null and app.can_read_org(organization_id))
         or (family_id is not null and app.can_read_family(family_id)));
create policy subjects_write on public.subjects
  for all to authenticated
  using (not is_system and ((organization_id is not null and app.is_org_admin(organization_id))
                            or (family_id is not null and app.is_family_member(family_id))))
  with check (not is_system and ((organization_id is not null and app.is_org_admin(organization_id))
                                 or (family_id is not null and app.is_family_member(family_id))));

create policy skills_select on public.skills
  for select to authenticated using (organization_id is null or app.can_read_org(organization_id));
create policy skills_write on public.skills
  for all to authenticated
  using (not is_system and organization_id is not null and app.is_org_admin(organization_id))
  with check (not is_system and organization_id is not null and app.is_org_admin(organization_id));

-- skill map
create policy student_skills_select on public.student_skills
  for select to authenticated using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy student_skills_insert on public.student_skills
  for insert to authenticated with check (app.can_student_action(student_id, 'skill', 'create'));
create policy student_skills_update on public.student_skills
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'update')))
  with check (app.can_student_action(student_id, 'skill', 'update'));
create policy student_skills_delete on public.student_skills
  for delete to authenticated using (student_id in (select app.my_student_ids_for('skill', 'delete')));

create policy sse_select on public.student_skill_events
  for select to authenticated using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy sse_insert on public.student_skill_events
  for insert to authenticated with check (app.can_student_action(student_id, 'skill', 'create'));

-- classes
create policy classes_select on public.classes
  for select to authenticated using (deleted_at is null and app.can_read_class(id));
create policy classes_insert on public.classes
  for insert to authenticated with check (app.is_org_admin(organization_id));
create policy classes_update on public.classes
  for update to authenticated using (app.can_manage_class(id)) with check (app.can_manage_class(id));

create policy class_students_select on public.class_students
  for select to authenticated
  using (app.can_read_class(class_id)
         or student_id in (select app.my_student_ids_for('academic_record', 'read')));
create policy class_students_write on public.class_students
  for all to authenticated
  using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

create policy class_staff_select on public.class_staff
  for select to authenticated using (user_id = auth.uid() or app.can_read_class(class_id));
create policy class_staff_write on public.class_staff
  for all to authenticated
  using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

-- calendar
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or (class_id is not null and app.can_read_class(class_id))
              or exists (select 1 from public.event_participants ep
                          where ep.event_id = calendar_events.id
                            and ep.student_id in (select app.my_student_ids_for('calendar', 'read')))));
create policy calendar_events_write on public.calendar_events
  for all to authenticated
  using ((family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null
             and app.is_org_member(organization_id,
                   array['org_admin','teacher','tutor','staff']::app.org_role[])))
  with check ((family_id is not null and app.is_family_member(family_id))
              or (organization_id is not null
                  and app.is_org_member(organization_id,
                        array['org_admin','teacher','tutor','staff']::app.org_role[])));

create policy cei_select on public.calendar_event_instances
  for select to authenticated
  using ((family_id is not null and app.can_read_family(family_id))
         or (organization_id is not null and app.can_read_org(organization_id))
         or (class_id is not null and app.can_read_class(class_id)));

create policy event_participants_select on public.event_participants
  for select to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('calendar', 'read')))
         or user_id = auth.uid()
         or (class_id is not null and app.can_read_class(class_id)));
create policy event_participants_write on public.event_participants
  for all to authenticated
  using (exists (select 1 from public.calendar_events e
                  where e.id = event_participants.event_id
                    and ((e.family_id is not null and app.is_family_member(e.family_id))
                         or (e.organization_id is not null and app.is_org_member(e.organization_id)))))
  with check (exists (select 1 from public.calendar_events e
                       where e.id = event_participants.event_id
                         and ((e.family_id is not null and app.is_family_member(e.family_id))
                              or (e.organization_id is not null and app.is_org_member(e.organization_id)))));

-- lessons (academic_record)
create policy lessons_select on public.lessons
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or (class_id is not null and app.can_read_class(class_id))
              or exists (select 1 from public.lesson_students ls
                          where ls.lesson_id = lessons.id
                            and ls.student_id in (select app.my_student_ids_for('academic_record', 'read')))));
create policy lessons_write on public.lessons
  for all to authenticated
  using ((family_id is not null and app.is_family_member(family_id))
         or (class_id is not null and app.can_read_class(class_id)
             and app.is_org_member(organization_id,
                   array['org_admin','teacher','tutor']::app.org_role[]))
         or (organization_id is not null
             and app.is_org_member(organization_id,
                   array['org_admin','teacher','tutor']::app.org_role[])))
  with check ((family_id is not null and app.is_family_member(family_id))
              or (organization_id is not null
                  and app.is_org_member(organization_id,
                        array['org_admin','teacher','tutor']::app.org_role[])));

create policy lesson_students_select on public.lesson_students
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('academic_record', 'read')));
create policy lesson_students_insert on public.lesson_students
  for insert to authenticated with check (app.can_student_action(student_id, 'academic_record', 'create'));
create policy lesson_students_update on public.lesson_students
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('academic_record', 'update')))
  with check (app.can_student_action(student_id, 'academic_record', 'update'));
create policy lesson_students_delete on public.lesson_students
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('academic_record', 'delete')));

create policy lesson_groups_select on public.lesson_groups
  for select to authenticated using (app.can_read_class(class_id));
create policy lesson_groups_write on public.lesson_groups
  for all to authenticated using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

-- assignments
create policy assignments_select on public.assignments
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (class_id is not null and app.can_read_class(class_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or exists (select 1 from public.assignment_students a2
                          where a2.assignment_id = assignments.id
                            and a2.student_id in (select app.my_student_ids_for('assignment', 'read')))));
create policy assignments_write on public.assignments
  for all to authenticated
  using ((family_id is not null and app.is_family_member(family_id))
         or (class_id is not null and app.can_manage_class(class_id))
         or (organization_id is not null
             and app.is_org_member(organization_id,
                   array['org_admin','teacher','tutor']::app.org_role[])))
  with check ((family_id is not null and app.is_family_member(family_id))
              or (class_id is not null and app.can_manage_class(class_id))
              or (organization_id is not null
                  and app.is_org_member(organization_id,
                        array['org_admin','teacher','tutor']::app.org_role[])));

create policy assignment_students_select on public.assignment_students
  for select to authenticated using (student_id in (select app.my_student_ids_for('assignment', 'read')));
create policy assignment_students_insert on public.assignment_students
  for insert to authenticated with check (app.can_student_action(student_id, 'assignment', 'create'));
create policy assignment_students_update on public.assignment_students
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('assignment', 'update')))
  with check (app.can_student_action(student_id, 'assignment', 'update'));
create policy assignment_students_delete on public.assignment_students
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('assignment', 'delete')));

create policy assignment_submissions_select on public.assignment_submissions
  for select to authenticated using (student_id in (select app.my_student_ids_for('assignment', 'read')));
create policy assignment_submissions_insert on public.assignment_submissions
  for insert to authenticated with check (app.can_student_action(student_id, 'assignment', 'create'));
create policy assignment_submissions_update on public.assignment_submissions
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('assignment', 'update')))
  with check (app.can_student_action(student_id, 'assignment', 'update'));

-- assessments
create policy assessments_select on public.assessments
  for select to authenticated
  using (deleted_at is null
         and ((student_id is not null and student_id in (select app.my_student_ids_for('assessment', 'read')))
              or (class_id is not null and app.can_read_class(class_id))));
create policy assessments_insert on public.assessments
  for insert to authenticated
  with check ((student_id is not null and app.can_student_action(student_id, 'assessment', 'create'))
              or (class_id is not null and app.can_manage_class(class_id)));
create policy assessments_update on public.assessments
  for update to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('assessment', 'update')))
         or (class_id is not null and app.can_manage_class(class_id)))
  with check ((student_id is not null and app.can_student_action(student_id, 'assessment', 'update'))
              or (class_id is not null and app.can_manage_class(class_id)));

create policy assessment_results_select on public.assessment_results
  for select to authenticated using (student_id in (select app.my_student_ids_for('assessment', 'read')));
create policy assessment_results_insert on public.assessment_results
  for insert to authenticated with check (app.can_student_action(student_id, 'assessment', 'create'));
create policy assessment_results_update on public.assessment_results
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('assessment', 'update')))
  with check (app.can_student_action(student_id, 'assessment', 'update'));

-- attendance
create policy attendance_select on public.attendance
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('attendance', 'read'))
         or (organization_id is not null and app.is_org_member(organization_id)));
create policy attendance_insert on public.attendance
  for insert to authenticated with check (app.can_student_action(student_id, 'attendance', 'create'));
create policy attendance_update on public.attendance
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('attendance', 'update')))
  with check (app.can_student_action(student_id, 'attendance', 'update'));
create policy attendance_delete on public.attendance
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('attendance', 'delete')));

-- learning plans
create policy learning_plans_select on public.learning_plans
  for select to authenticated using (student_id in (select app.my_student_ids_for('learning_plan', 'read')));
create policy learning_plans_insert on public.learning_plans
  for insert to authenticated with check (app.can_student_action(student_id, 'learning_plan', 'create'));
create policy learning_plans_update on public.learning_plans
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('learning_plan', 'update')))
  with check (app.can_student_action(student_id, 'learning_plan', 'update'));

create policy learning_goals_select on public.learning_goals
  for select to authenticated using (student_id in (select app.my_student_ids_for('learning_plan', 'read')));
create policy learning_goals_insert on public.learning_goals
  for insert to authenticated with check (app.can_student_action(student_id, 'learning_plan', 'create'));
create policy learning_goals_update on public.learning_goals
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('learning_plan', 'update')))
  with check (app.can_student_action(student_id, 'learning_plan', 'update'));

-- =============================== evidence ====================================
create policy portfolio_items_select on public.portfolio_items
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids_for('portfolio', 'read')));
create policy portfolio_items_insert on public.portfolio_items
  for insert to authenticated with check (app.can_student_action(student_id, 'portfolio', 'create'));
create policy portfolio_items_update on public.portfolio_items
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('portfolio', 'update')))
  with check (app.can_student_action(student_id, 'portfolio', 'update'));
create policy portfolio_items_delete on public.portfolio_items
  for delete to authenticated using (student_id in (select app.my_student_ids_for('portfolio', 'delete')));

create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids_for('activity_log', 'read')));
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated with check (app.can_student_action(student_id, 'activity_log', 'create'));
create policy activity_logs_update on public.activity_logs
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('activity_log', 'update')))
  with check (app.can_student_action(student_id, 'activity_log', 'update'));
create policy activity_logs_delete on public.activity_logs
  for delete to authenticated using (student_id in (select app.my_student_ids_for('activity_log', 'delete')));

create policy reading_logs_select on public.reading_logs
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids_for('reading_log', 'read')));
create policy reading_logs_insert on public.reading_logs
  for insert to authenticated with check (app.can_student_action(student_id, 'reading_log', 'create'));
create policy reading_logs_update on public.reading_logs
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('reading_log', 'update')))
  with check (app.can_student_action(student_id, 'reading_log', 'update'));
create policy reading_logs_delete on public.reading_logs
  for delete to authenticated using (student_id in (select app.my_student_ids_for('reading_log', 'delete')));

-- teacher notes: author-private notes are invisible to everyone else, and a
-- staff note is not visible to the family
create policy teacher_notes_select on public.teacher_notes
  for select to authenticated
  using (deleted_at is null
         and (author_user_id = auth.uid()
              or (visibility in ('family', 'all')
                  and student_id in (select app.my_student_ids_for('teacher_note', 'read')))
              or (visibility = 'staff'
                  and exists (select 1 from app.my_student_relationships() r
                               where r.student_id = teacher_notes.student_id
                                 and r.relationship in ('staff_assigned_read','staff_assigned_write',
                                                        'class_staff','org_admin')))));
create policy teacher_notes_insert on public.teacher_notes
  for insert to authenticated
  with check (author_user_id = auth.uid()
              and app.can_student_action(student_id, 'teacher_note', 'create'));
create policy teacher_notes_update on public.teacher_notes
  for update to authenticated
  using (author_user_id = auth.uid()) with check (author_user_id = auth.uid());

-- =============================== documents ===================================
create policy documents_select on public.documents
  for select to authenticated using (app.can_read_document(id));
create policy documents_insert on public.documents
  for insert to authenticated
  with check (uploaded_by = auth.uid()
              and ((student_id is not null and app.can_student_action(student_id, 'document', 'create'))
                   or (student_id is null and family_id is not null and app.is_family_member(family_id))
                   or (owner_organization_id is not null and app.is_org_member(owner_organization_id))));
create policy documents_update on public.documents
  for update to authenticated
  using (uploaded_by = auth.uid()
         or (student_id is not null and student_id in (select app.my_student_ids_for('document', 'update')))
         or (student_id is null and family_id is not null and app.is_family_member(family_id))
         or (owner_organization_id is not null and app.is_org_admin(owner_organization_id)))
  with check (uploaded_by = auth.uid()
              or (student_id is not null and app.can_student_action(student_id, 'document', 'update'))
              or (student_id is null and family_id is not null and app.is_family_member(family_id))
              or (owner_organization_id is not null and app.is_org_admin(owner_organization_id)));
-- The uploader may maintain their own upload (title, category, visibility).
-- Visibility changes are audited, retention and legal hold still need
-- document.approve, and soft-delete still needs document.delete.

create policy document_versions_select on public.document_versions
  for select to authenticated using (app.can_read_document(document_id));

create policy daa_select on public.document_ai_analysis
  for select to authenticated using (app.can_read_document(document_id));

create policy document_shares_select on public.document_shares
  for select to authenticated
  using (shared_with_user_id = auth.uid() or app.can_read_document(document_id));
create policy document_shares_insert on public.document_shares
  for insert to authenticated
  with check (shared_by = auth.uid()
              and exists (select 1 from public.documents d
                           where d.id = document_id and d.student_id is not null
                             and app.can_student_action(d.student_id, 'document', 'share')));
create policy document_shares_update on public.document_shares
  for update to authenticated
  using (exists (select 1 from public.documents d
                  where d.id = document_id and d.student_id is not null
                    and app.can_student_action(d.student_id, 'document', 'share')))
  with check (exists (select 1 from public.documents d
                       where d.id = document_id and d.student_id is not null
                         and app.can_student_action(d.student_id, 'document', 'share')));

-- =============================== AI ==========================================
create policy ai_suggestions_select on public.ai_suggestions
  for select to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('student_profile', 'read')))
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)));
-- Accepting or rejecting is an UPDATE. There is no INSERT policy: proposals
-- originate only from the pipeline under service_role.
create policy ai_suggestions_update on public.ai_suggestions
  for update to authenticated
  using (student_id is not null and app.can_write_student(student_id))
  with check (student_id is not null and app.can_write_student(student_id));

create policy ai_usage_events_select on public.ai_usage_events
  for select to authenticated using (app.is_platform_support(organization_id, student_id));

create policy ai_usage_daily_select on public.ai_usage_daily
  for select to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id)));

-- =============================== compliance ==================================
create policy compliance_packs_select on public.compliance_packs
  for select to authenticated using (status = 'active' or app.is_platform_support());
create policy compliance_rules_select on public.compliance_rules
  for select to authenticated
  using ((active and exists (select 1 from public.compliance_packs p
                              where p.id = compliance_rules.pack_id and p.status = 'active'))
         or app.is_platform_support());
create policy district_contacts_select on public.district_contacts
  for select to authenticated using (active or app.is_platform_support());

-- computed by the engine; no user write policy exists at all
create policy compliance_requirements_select on public.compliance_requirements
  for select to authenticated using (student_id in (select app.my_student_ids_for('compliance', 'read')));
create policy scr_select on public.student_compliance_records
  for select to authenticated using (student_id in (select app.my_student_ids_for('compliance', 'read')));

create policy document_submissions_select on public.document_submissions
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('compliance_submission', 'read')));
create policy document_submissions_insert on public.document_submissions
  for insert to authenticated
  with check (app.can_student_action(student_id, 'compliance_submission', 'create'));
create policy document_submissions_update on public.document_submissions
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('compliance_submission', 'update')))
  with check (app.can_student_action(student_id, 'compliance_submission', 'update'));

-- =============================== evaluations =================================
create policy signatures_select on public.signatures
  for select to authenticated
  using (signer_user_id = auth.uid()
         or exists (select 1 from public.evaluations e
                     where e.evaluator_signature_id = signatures.id
                       and e.student_id in (select app.my_student_ids_for('evaluation', 'read')))
         or exists (select 1 from public.document_submissions ds
                     where ds.signature_id = signatures.id
                       and ds.student_id in (select app.my_student_ids_for('compliance_submission', 'read'))));
create policy signatures_insert on public.signatures
  for insert to authenticated with check (signer_user_id = auth.uid());

create policy evaluator_profiles_select on public.evaluator_profiles
  for select to authenticated
  using (user_id = auth.uid()
         or listed_in_marketplace
         or app.is_platform_support(organization_id)
         or exists (select 1 from public.evaluations e
                     where e.evaluator_profile_id = evaluator_profiles.id
                       and e.student_id in (select app.my_student_ids_for('evaluation', 'read'))));
create policy evaluator_profiles_insert on public.evaluator_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy evaluator_profiles_update on public.evaluator_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy evaluations_select on public.evaluations
  for select to authenticated
  using (evaluator_user_id = auth.uid()
         or student_id in (select app.my_student_ids_for('evaluation', 'read')));
create policy evaluations_insert on public.evaluations
  for insert to authenticated with check (app.can_student_action(student_id, 'evaluation', 'create'));
create policy evaluations_update on public.evaluations
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('evaluation', 'update')))
  with check (app.can_student_action(student_id, 'evaluation', 'update'));

create policy evaluator_reviews_select on public.evaluator_reviews
  for select to authenticated
  using (status = 'published' or app.is_family_member(family_id) or app.is_platform_support());
create policy evaluator_reviews_insert on public.evaluator_reviews
  for insert to authenticated with check (app.is_family_member(family_id));
create policy evaluator_reviews_update on public.evaluator_reviews
  for update to authenticated
  using (app.is_family_member(family_id)) with check (app.is_family_member(family_id));

-- =============================== organization operational ====================
create policy incident_reports_select on public.incident_reports
  for select to authenticated
  using (deleted_at is null
         and (app.is_org_member(organization_id)
              or (shared_with_family and student_id is not null
                  and student_id in (select app.my_student_ids_for('incident', 'read')))));
create policy incident_reports_write on public.incident_reports
  for all to authenticated
  using (app.is_org_member(organization_id, array['org_admin','staff','teacher']::app.org_role[]))
  with check (app.is_org_member(organization_id, array['org_admin','staff','teacher']::app.org_role[]));

create policy staff_records_select on public.staff_records
  for select to authenticated
  using (deleted_at is null and (user_id = auth.uid() or app.is_org_admin(organization_id)));
create policy staff_records_write on public.staff_records
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy organization_documents_select on public.organization_documents
  for select to authenticated
  using (deleted_at is null
         and (app.is_org_member(organization_id)
              or (visible_to_family and family_id is not null and app.is_family_member(family_id))));
create policy organization_documents_write on public.organization_documents
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

-- =============================== messaging ===================================
create policy message_threads_select on public.message_threads
  for select to authenticated using (app.is_thread_participant(id));
create policy message_threads_insert on public.message_threads
  for insert to authenticated with check (created_by = auth.uid());
create policy message_threads_update on public.message_threads
  for update to authenticated
  using (app.is_thread_participant(id)) with check (app.is_thread_participant(id));

create policy mtp_select on public.message_thread_participants
  for select to authenticated
  using (user_id = auth.uid() or app.is_thread_participant(thread_id));
create policy mtp_insert on public.message_thread_participants
  for insert to authenticated
  with check (app.is_thread_participant(thread_id)
              or exists (select 1 from public.message_threads t
                          where t.id = thread_id and t.created_by = auth.uid()));
create policy mtp_update on public.message_thread_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_select on public.messages
  for select to authenticated using (app.is_thread_participant(thread_id));
create policy messages_insert on public.messages
  for insert to authenticated
  with check (sender_user_id = auth.uid() and app.is_thread_participant(thread_id));
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender_user_id = auth.uid()) with check (sender_user_id = auth.uid());

create policy announcements_select on public.announcements
  for select to authenticated
  using (deleted_at is null and publish_at <= now() and app.can_view_organization(organization_id));
create policy announcements_write on public.announcements
  for all to authenticated
  using (app.is_org_member(organization_id, array['org_admin','staff']::app.org_role[]))
  with check (app.is_org_member(organization_id, array['org_admin','staff']::app.org_role[]));

-- =============================== ops =========================================
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_all on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_select on public.reports
  for select to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('report', 'read')))
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)));
create policy reports_insert on public.reports
  for insert to authenticated
  with check ((student_id is not null and app.can_student_action(student_id, 'report', 'create'))
              or (student_id is null and family_id is not null and app.is_family_member(family_id))
              or (student_id is null and organization_id is not null and app.is_org_member(organization_id)));
create policy reports_update on public.reports
  for update to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('report', 'update')))
         or (student_id is null and family_id is not null and app.is_family_member(family_id))
         or (student_id is null and organization_id is not null and app.is_org_member(organization_id)))
  with check (true);

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('audit', 'read')))
         or (organization_id is not null and app.is_org_admin(organization_id))
         or actor_user_id = auth.uid()
         or app.is_platform_support(organization_id, student_id));

create policy record_history_select on public.record_history
  for select to authenticated
  using ((student_id is not null and student_id in (select app.my_student_ids_for('audit', 'read')))
         or (organization_id is not null and app.is_org_admin(organization_id))
         or app.is_platform_support(organization_id, student_id));

-- =============================== storage =====================================
create policy "quarantine insert own scope" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads-quarantine' and owner = auth.uid() and app.can_upload_to_prefix(name));
create policy "quarantine manage own upload" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads-quarantine' and owner = auth.uid())
  with check (bucket_id = 'uploads-quarantine' and owner = auth.uid());
create policy "quarantine delete own upload" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads-quarantine' and owner = auth.uid());
create policy "avatars manage own" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "org branding read members" on storage.objects
  for select to authenticated
  using (bucket_id = 'org-branding'
         and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
         and app.can_view_organization(((storage.foldername(name))[1])::uuid));
create policy "org branding write admins" on storage.objects
  for all to authenticated
  using (bucket_id = 'org-branding'
         and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
         and app.is_org_admin(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'org-branding'
              and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
              and app.is_org_admin(((storage.foldername(name))[1])::uuid));
