-- =============================================================================
-- 0031  RLS policies: students and the access graph
-- =============================================================================

create policy students_select on public.students
  for select to authenticated using (deleted_at is null and app.can_read_student(id));
-- A student is created by a member of the owning family (onboarding) or by an
-- organization administrator acting for a family that has joined the org.
create policy students_insert on public.students
  for insert to authenticated
  with check (app.is_family_member(family_id)
              or exists (select 1 from public.family_organization_memberships fom
                          where fom.family_id = students.family_id
                            and fom.status = 'active'
                            and app.is_org_admin(fom.organization_id)));
create policy students_update on public.students
  for update to authenticated
  using (app.can_write_student(id)) with check (app.can_write_student(id));
-- No DELETE policy: student records are archived (status/deleted_at), never removed.

create policy student_guardians_select on public.student_guardians
  for select to authenticated
  using (user_id = auth.uid() or app.can_read_student(student_id));
create policy student_guardians_write on public.student_guardians
  for all to authenticated
  using (app.can_admin_student(student_id)) with check (app.can_admin_student(student_id));

create policy som_select on public.student_organization_memberships
  for select to authenticated
  using (app.can_read_student(student_id) or app.is_org_member(organization_id));
create policy som_write on public.student_organization_memberships
  for all to authenticated
  using (app.can_admin_student(student_id) or app.is_org_admin(organization_id))
  with check (app.can_admin_student(student_id) or app.is_org_admin(organization_id));

create policy ssa_select on public.student_staff_assignments
  for select to authenticated
  using (user_id = auth.uid()
         or app.can_read_student(student_id)
         or (organization_id is not null and app.is_org_admin(organization_id)));
create policy ssa_write on public.student_staff_assignments
  for all to authenticated
  using (app.can_admin_student(student_id)
         or (organization_id is not null and app.is_org_admin(organization_id)))
  with check (app.can_admin_student(student_id)
              or (organization_id is not null and app.is_org_admin(organization_id)));

create policy sag_select on public.student_access_grants
  for select to authenticated
  using (grantee_user_id = auth.uid() or app.can_read_student(student_id));
-- Only a guardian (or org admin) may grant access to a student.
create policy sag_write on public.student_access_grants
  for all to authenticated
  using (app.can_admin_student(student_id)) with check (app.can_admin_student(student_id));

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
