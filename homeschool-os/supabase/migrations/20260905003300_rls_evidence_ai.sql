-- =============================================================================
-- 0033  RLS policies: documents, evidence, AI layer
-- =============================================================================

-- --- documents ---------------------------------------------------------------
create policy documents_select on public.documents
  for select to authenticated using (app.can_read_document(id));
create policy documents_insert on public.documents
  for insert to authenticated
  with check (uploaded_by = auth.uid()
              and ((student_id is not null and app.can_write_student(student_id))
                   or (family_id is not null and app.is_family_member(family_id))
                   or (owner_organization_id is not null and app.is_org_member(owner_organization_id))));
create policy documents_update on public.documents
  for update to authenticated
  using ((student_id is not null and app.can_write_student(student_id))
         or (family_id is not null and app.is_family_member(family_id))
         or (owner_organization_id is not null and app.is_org_admin(owner_organization_id)))
  with check ((student_id is not null and app.can_write_student(student_id))
              or (family_id is not null and app.is_family_member(family_id))
              or (owner_organization_id is not null and app.is_org_admin(owner_organization_id)));
-- No DELETE policy: documents are soft-deleted, and retention/legal hold is
-- enforced by documents_retention_ck.

create policy document_versions_select on public.document_versions
  for select to authenticated using (app.can_read_document(document_id));

create policy daa_select on public.document_ai_analysis
  for select to authenticated using (app.can_read_document(document_id));
-- Analysis rows are written exclusively by the pipeline (service_role).

-- --- portfolio, activity, reading, notes -------------------------------------
create policy portfolio_items_select on public.portfolio_items
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids()));
create policy portfolio_items_write on public.portfolio_items
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids()));
create policy activity_logs_write on public.activity_logs
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

create policy reading_logs_select on public.reading_logs
  for select to authenticated
  using (deleted_at is null and student_id in (select app.my_student_ids()));
create policy reading_logs_write on public.reading_logs
  for all to authenticated
  using (app.can_write_student(student_id)) with check (app.can_write_student(student_id));

-- Teacher notes respect their own visibility setting: a note marked
-- private_to_author is invisible to everyone else, and a staff note is not
-- visible to the family.
create policy teacher_notes_select on public.teacher_notes
  for select to authenticated
  using (deleted_at is null
         and (author_user_id = auth.uid()
              or (visibility = 'all' and app.can_read_student(student_id))
              or (visibility = 'family' and app.can_read_student(student_id))
              or (visibility = 'staff'
                  and organization_id is not null
                  and app.is_org_member(organization_id,
                        array['org_admin','teacher','tutor','staff']::app.org_role[])
                  and app.can_read_student(student_id))));
create policy teacher_notes_insert on public.teacher_notes
  for insert to authenticated
  with check (author_user_id = auth.uid() and app.can_write_student(student_id));
create policy teacher_notes_update on public.teacher_notes
  for update to authenticated
  using (author_user_id = auth.uid()) with check (author_user_id = auth.uid());

-- --- AI layer ----------------------------------------------------------------
create policy ai_suggestions_select on public.ai_suggestions
  for select to authenticated
  using ((student_id is not null and app.can_read_student(student_id))
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)));
-- Accepting or rejecting a suggestion is an UPDATE by a user with write access.
-- Suggestions are CREATED only by the pipeline (service_role): there is no
-- INSERT policy, so nothing user-facing can fabricate an approved-looking proposal.
create policy ai_suggestions_update on public.ai_suggestions
  for update to authenticated
  using ((student_id is not null and app.can_write_student(student_id))
         or (family_id is not null and app.is_family_member(family_id)))
  with check ((student_id is not null and app.can_write_student(student_id))
              or (family_id is not null and app.is_family_member(family_id)));

-- Provider, model, prompt and error text are never exposed to end users; the
-- base table is readable only under a break-glass support session. Organization
-- administrators use public.ai_usage_summary instead.
create policy ai_usage_events_select_support on public.ai_usage_events
  for select to authenticated using (app.is_platform_support(organization_id, student_id));

create policy ai_usage_daily_select on public.ai_usage_daily
  for select to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id)));

-- job_queue has no policies for authenticated: it is service_role only.
