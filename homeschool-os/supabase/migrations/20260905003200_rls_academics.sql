-- =============================================================================
-- 0032  RLS policies: academics, calendar, classes
-- =============================================================================

-- --- academic years, subjects, skills ---------------------------------------
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
  using ((organization_id is null and family_id is null)            -- global catalogue
         or (organization_id is not null and app.can_read_org(organization_id))
         or (family_id is not null and app.can_read_family(family_id)));
create policy subjects_write on public.subjects
  for all to authenticated
  using (not is_system and ((organization_id is not null and app.is_org_admin(organization_id))
                            or (family_id is not null and app.is_family_member(family_id))))
  with check (not is_system and ((organization_id is not null and app.is_org_admin(organization_id))
                                 or (family_id is not null and app.is_family_member(family_id))));

create policy skills_select on public.skills
  for select to authenticated
  using (organization_id is null or app.can_read_org(organization_id));
create policy skills_write on public.skills
  for all to authenticated
  using (not is_system and organization_id is not null and app.is_org_admin(organization_id))
  with check (not is_system and organization_id is not null and app.is_org_admin(organization_id));

-- --- skill map ---------------------------------------------------------------
create policy student_skills_select on public.student_skills
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy student_skills_write on public.student_skills
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy sse_select on public.student_skill_events
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy sse_insert on public.student_skill_events
  for insert to authenticated with check (app.can_write_student(student_id));
-- No UPDATE/DELETE policies: skill evidence is append-only.

-- --- classes -----------------------------------------------------------------
create policy classes_select on public.classes
  for select to authenticated using (deleted_at is null and app.can_read_class(id));
create policy classes_insert on public.classes
  for insert to authenticated with check (app.is_org_admin(organization_id));
create policy classes_update on public.classes
  for update to authenticated using (app.can_manage_class(id)) with check (app.can_manage_class(id));

create policy class_students_select on public.class_students
  for select to authenticated
  using (app.can_read_class(class_id) or app.can_read_student(student_id));
create policy class_students_write on public.class_students
  for all to authenticated
  using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

create policy class_staff_select on public.class_staff
  for select to authenticated using (user_id = auth.uid() or app.can_read_class(class_id));
create policy class_staff_write on public.class_staff
  for all to authenticated
  using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

-- --- calendar ----------------------------------------------------------------
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or (class_id is not null and app.can_read_class(class_id))
              or exists (select 1 from public.event_participants ep
                          where ep.event_id = calendar_events.id
                            and ep.student_id in (select app.my_student_ids()))));
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
-- Instances are materialised by the events job (service_role); no write policy.

create policy event_participants_select on public.event_participants
  for select to authenticated
  using ((student_id is not null and app.can_read_student(student_id))
         or user_id = auth.uid()
         or (class_id is not null and app.can_read_class(class_id))
         or exists (select 1 from public.calendar_events e
                     where e.id = event_participants.event_id
                       and ((e.family_id is not null and app.is_family_member(e.family_id))
                            or (e.organization_id is not null and app.is_org_member(e.organization_id)))));
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

-- --- lessons and assignments -------------------------------------------------
create policy lessons_select on public.lessons
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or (class_id is not null and app.can_read_class(class_id))
              or exists (select 1 from public.lesson_students ls
                          where ls.lesson_id = lessons.id
                            and ls.student_id in (select app.my_student_ids()))));
create policy lessons_write on public.lessons
  for all to authenticated
  using ((family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null
             and app.is_org_member(organization_id,
                                   array['org_admin','teacher','tutor']::app.org_role[])))
  with check ((family_id is not null and app.is_family_member(family_id))
              or (organization_id is not null
                  and app.is_org_member(organization_id,
                                        array['org_admin','teacher','tutor']::app.org_role[])));

create policy lesson_students_select on public.lesson_students
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy lesson_students_write on public.lesson_students
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy lesson_groups_select on public.lesson_groups
  for select to authenticated using (app.can_read_class(class_id));
create policy lesson_groups_write on public.lesson_groups
  for all to authenticated
  using (app.can_manage_class(class_id)) with check (app.can_manage_class(class_id));

create policy assignments_select on public.assignments
  for select to authenticated
  using (deleted_at is null
         and ((family_id is not null and app.can_read_family(family_id))
              or (organization_id is not null and app.can_read_org(organization_id))
              or (class_id is not null and app.can_read_class(class_id))
              or exists (select 1 from public.assignment_students asg
                          where asg.assignment_id = assignments.id
                            and asg.student_id in (select app.my_student_ids()))));
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
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy assignment_students_write on public.assignment_students
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy assignment_submissions_select on public.assignment_submissions
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy assignment_submissions_write on public.assignment_submissions
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

-- --- assessments and attendance ---------------------------------------------
create policy assessments_select on public.assessments
  for select to authenticated
  using (deleted_at is null
         and ((student_id is not null and app.can_read_student(student_id))
              or (class_id is not null and app.can_read_class(class_id))));
create policy assessments_write on public.assessments
  for all to authenticated
  using ((student_id is not null and app.can_write_student(student_id))
         or (class_id is not null and app.can_manage_class(class_id)))
  with check ((student_id is not null and app.can_write_student(student_id))
              or (class_id is not null and app.can_manage_class(class_id)));

create policy assessment_results_select on public.assessment_results
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy assessment_results_write on public.assessment_results
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy attendance_select on public.attendance
  for select to authenticated
  using (student_id in (select app.my_student_ids())
         or (organization_id is not null and app.is_org_member(organization_id)));
create policy attendance_write on public.attendance
  for all to authenticated
  using (app.can_write_student(student_id)
         or (class_id is not null and app.can_manage_class(class_id)))
  with check (app.can_write_student(student_id)
              or (class_id is not null and app.can_manage_class(class_id)));

-- --- learning plans and goals ------------------------------------------------
create policy learning_plans_select on public.learning_plans
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy learning_plans_write on public.learning_plans
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy learning_goals_select on public.learning_goals
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy learning_goals_write on public.learning_goals
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));
