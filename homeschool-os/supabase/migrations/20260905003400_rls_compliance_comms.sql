-- =============================================================================
-- 0034  RLS policies: compliance, evaluations, operational records, comms
-- =============================================================================

-- --- compliance reference data ----------------------------------------------
-- Only published packs and verified/active rules are visible to users. Draft
-- content is platform-only so unverified legal text can never reach a family.
create policy compliance_packs_select on public.compliance_packs
  for select to authenticated using (status = 'active' or app.is_platform_support());

create policy compliance_rules_select on public.compliance_rules
  for select to authenticated
  using ((active and exists (select 1 from public.compliance_packs p
                              where p.id = compliance_rules.pack_id and p.status = 'active'))
         or app.is_platform_support());

create policy district_contacts_select on public.district_contacts
  for select to authenticated using (active or app.is_platform_support());
-- Packs, rules and district contacts are maintained by platform staff via
-- service_role tooling; there are no user-facing write policies.

-- --- per-student compliance --------------------------------------------------
create policy compliance_requirements_select on public.compliance_requirements
  for select to authenticated using (student_id in (select app.my_student_ids()));
create policy scr_select on public.student_compliance_records
  for select to authenticated using (student_id in (select app.my_student_ids()));
-- Both tables are computed by the compliance engine (service_role). No user
-- write policy exists: a compliance status can never be set by hand in the UI.

create policy document_submissions_select on public.document_submissions
  for select to authenticated using (app.can_read_student(student_id));
create policy document_submissions_insert on public.document_submissions
  for insert to authenticated with check (app.can_admin_student(student_id));
create policy document_submissions_update on public.document_submissions
  for update to authenticated
  using (app.can_admin_student(student_id)) with check (app.can_admin_student(student_id));

-- --- evaluations -------------------------------------------------------------
create policy signatures_select on public.signatures
  for select to authenticated
  using (signer_user_id = auth.uid()
         or exists (select 1 from public.evaluations e
                     where e.evaluator_signature_id = signatures.id
                       and app.can_read_student(e.student_id))
         or exists (select 1 from public.document_submissions ds
                     where ds.signature_id = signatures.id
                       and app.can_read_student(ds.student_id)));
create policy signatures_insert on public.signatures
  for insert to authenticated with check (signer_user_id = auth.uid());

create policy evaluator_profiles_select on public.evaluator_profiles
  for select to authenticated
  using (user_id = auth.uid()
         or listed_in_marketplace
         or app.is_platform_support(organization_id)
         or exists (select 1 from public.evaluations e
                     where e.evaluator_profile_id = evaluator_profiles.id
                       and app.can_read_student(e.student_id)));
create policy evaluator_profiles_insert on public.evaluator_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy evaluator_profiles_update on public.evaluator_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy evaluations_select on public.evaluations
  for select to authenticated
  using (evaluator_user_id = auth.uid() or app.can_read_student(student_id));
create policy evaluations_insert on public.evaluations
  for insert to authenticated with check (app.can_admin_student(student_id));
create policy evaluations_update on public.evaluations
  for update to authenticated
  using (evaluator_user_id = auth.uid() or app.can_admin_student(student_id))
  with check (evaluator_user_id = auth.uid() or app.can_admin_student(student_id));

create policy evaluator_reviews_select on public.evaluator_reviews
  for select to authenticated
  using (status = 'published' or app.is_family_member(family_id) or app.is_platform_support());
create policy evaluator_reviews_insert on public.evaluator_reviews
  for insert to authenticated with check (app.is_family_member(family_id));
create policy evaluator_reviews_update on public.evaluator_reviews
  for update to authenticated
  using (app.is_family_member(family_id)) with check (app.is_family_member(family_id));

-- --- organization operational records ---------------------------------------
-- These do NOT transfer to the family when a membership ends.
create policy incident_reports_select on public.incident_reports
  for select to authenticated
  using (deleted_at is null
         and (app.is_org_member(organization_id)
              or (shared_with_family and student_id is not null and app.can_read_student(student_id))));
create policy incident_reports_write on public.incident_reports
  for all to authenticated
  using (app.is_org_member(organization_id,
           array['org_admin','staff','teacher']::app.org_role[]))
  with check (app.is_org_member(organization_id,
           array['org_admin','staff','teacher']::app.org_role[]));

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

create policy data_ownership_registry_select on public.data_ownership_registry
  for select to authenticated using (true);

-- --- messaging ---------------------------------------------------------------
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

-- --- notifications and reports ----------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_preferences_all on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_select on public.reports
  for select to authenticated
  using ((student_id is not null and app.can_read_student(student_id))
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)));
create policy reports_insert on public.reports
  for insert to authenticated
  with check ((student_id is not null and app.can_write_student(student_id))
              or (family_id is not null and app.is_family_member(family_id))
              or (organization_id is not null and app.is_org_member(organization_id)));
create policy reports_update on public.reports
  for update to authenticated
  using ((student_id is not null and app.can_write_student(student_id))
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)))
  with check ((student_id is not null and app.can_write_student(student_id))
              or (family_id is not null and app.is_family_member(family_id))
              or (organization_id is not null and app.is_org_member(organization_id)));

-- --- audit and history -------------------------------------------------------
-- Guardians can see who accessed their child's records: visible provenance is a
-- trust feature. There is no INSERT/UPDATE/DELETE policy for anyone.
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using ((student_id is not null and app.can_admin_student(student_id))
         or (organization_id is not null and app.is_org_admin(organization_id))
         or actor_user_id = auth.uid()
         or app.is_platform_support(organization_id, student_id));

create policy record_history_select on public.record_history
  for select to authenticated
  using ((student_id is not null and app.can_write_student(student_id))
         or (organization_id is not null and app.is_org_admin(organization_id))
         or app.is_platform_support(organization_id, student_id));
