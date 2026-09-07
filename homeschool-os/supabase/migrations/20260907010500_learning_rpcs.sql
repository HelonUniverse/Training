-- =============================================================================
-- 0071  STEP 5 - the calls the product actually makes
-- =============================================================================
-- All SECURITY INVOKER. Every one of these runs as the calling user, so every
-- statement inside is filtered by the same policies that would filter it from
-- the outside. They add transactionality and a single place to be careful; they
-- add no authority whatsoever.
--
-- The one exception is app.queue_document_analysis, which is DEFINER for a
-- narrow and stated reason given at its definition.
-- =============================================================================

/**
 * Ask for a document to be analysed.
 *
 * Returns the analysis row - existing or new. Calling it twice for the same
 * bytes is free and is the expected case: the UI calls it after a capture, a
 * parent may tap "Analyze" again, and a retry may arrive from anywhere. The
 * unique index on (document, version, analysis_version) is what makes that
 * cheap instead of expensive.
 *
 * SECURITY DEFINER, narrowly: the caller must be allowed to read the document
 * (checked explicitly, first, through the same predicate RLS uses), but writing
 * to document_ai_analysis is the worker's job and users hold no INSERT there.
 * Without DEFINER, queueing would mean granting every parent write access to
 * the analysis table, which is a much larger door than this one function.
 */
create or replace function public.queue_document_analysis(
  p_document uuid,
  p_force    boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_doc      public.documents;
  v_version  uuid;
  v_existing public.document_ai_analysis;
  v_next     integer := 1;
  v_id       uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Authorization first, and through the same function the SELECT policy uses,
  -- so this can never drift away from "who may see this document".
  if not app.can_read_document(p_document) then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select * into v_doc from public.documents d where d.id = p_document;
  if not found then
    raise exception 'no such document' using errcode = 'insufficient_privilege';
  end if;

  -- THE GATE. Analysis is never queued for bytes the scanner has not cleared.
  -- The worker checks this again before reading; this refuses earlier, so a
  -- pending or infected document never even acquires a job.
  if v_doc.scan_status <> 'clean' then
    raise exception 'this file has not been checked yet'
      using errcode = 'check_violation';
  end if;

  select dv.id into v_version from public.document_versions dv
   where dv.document_id = p_document
   order by dv.version desc limit 1;

  select * into v_existing from public.document_ai_analysis a
   where a.document_id = p_document
     and coalesce(a.document_version_id, a.document_id) = coalesce(v_version, p_document)
   order by a.analysis_version desc limit 1;

  if found and not p_force then
    -- Already analysed, or already queued. Hand back what exists rather than
    -- paying for the same file twice.
    return jsonb_build_object(
      'id', v_existing.id, 'status', v_existing.analysis_status, 'created', false);
  end if;

  if found then
    v_next := v_existing.analysis_version + 1;   -- an explicit "Analyze again"
  end if;

  insert into public.document_ai_analysis (
    document_id, document_version_id, analysis_version, analysis_status,
    family_id, organization_id, provider, model, prompt_version, schema_version,
    requested_by)
  values (p_document, v_version, v_next, 'queued',
          v_doc.family_id, v_doc.owner_organization_id,
          'pending', 'pending', 'smart_intake.v1', 'document_analysis.v1',
          auth.uid())
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', 'queued', 'created', true);
end;
$fn$;

revoke all on function public.queue_document_analysis(uuid, boolean) from public, anon;
grant execute on function public.queue_document_analysis(uuid, boolean) to authenticated, service_role;

comment on function public.queue_document_analysis(uuid, boolean) is
  'Queues Smart Intake for a CLEAN document the caller may read. Idempotent by '
  'design: the same bytes are never analysed twice unless someone explicitly '
  'asks for it, which is what stops a family paying for a stray double-tap.';

/**
 * Decide one suggested field.
 *
 * SECURITY INVOKER: the UPDATE goes through ai_suggestion_fields_update, which
 * requires authority over the underlying record - so a view-only guardian
 * reading a suggestion cannot accept it, and the check is the policy's, not a
 * second copy of it here.
 *
 * NOTHING IS APPLIED HERE. Deciding records a decision; writing the decided
 * value onto a document or portfolio item is a separate, explicit call. Keeping
 * them apart is what makes "the human value was never silently replaced" a
 * property of the schema rather than a promise about the UI.
 */
create or replace function public.decide_suggestion_field(
  p_field  uuid,
  p_status text,
  p_value  jsonb default null)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_n integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('accepted', 'edited', 'rejected', 'pending') then
    raise exception 'unknown decision: %', p_status using errcode = 'check_violation';
  end if;
  if p_status = 'edited' and p_value is null then
    raise exception 'an edit has to say what it was edited to'
      using errcode = 'check_violation';
  end if;

  update public.ai_suggestion_fields f
     set status = p_status::app.suggestion_field_status,
         accepted_value = case
           when p_status = 'edited'   then p_value
           when p_status = 'accepted' then f.suggested_value
           else null end,
         decided_by = case when p_status = 'pending' then null else auth.uid() end,
         decided_at = case when p_status = 'pending' then null else now() end
   where f.id = p_field;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    -- Either it does not exist or the caller may not decide it. Deliberately
    -- the same answer: which one it is, is not the caller's business.
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return true;
end;
$fn$;

revoke all on function public.decide_suggestion_field(uuid, text, jsonb) from public, anon;
grant execute on function public.decide_suggestion_field(uuid, text, jsonb) to authenticated, service_role;

/**
 * Confirm that a piece of work shows a skill.
 *
 * THE BRIDGE between Portfolio and the future adaptive engine, and the point at
 * which a suggestion stops being a suggestion. It writes learning_evidence and
 * it does NOT touch student_skills: the child has not been declared to have
 * learned anything, and this function is where someone would be tempted to
 * pretend otherwise.
 */
create or replace function public.confirm_skill_evidence(
  p_student   uuid,
  p_skill     uuid,
  p_relation  text default 'demonstrates',
  p_portfolio uuid default null,
  p_document  uuid default null,
  p_suggestion uuid default null,
  p_occurred_on date default null,
  p_note      text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_id uuid; v_family uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select s.family_id into v_family from public.students s where s.id = p_student;

  insert into public.learning_evidence (
    student_id, skill_id, family_id, relation, occurred_on,
    portfolio_item_id, document_id, note,
    source_type, ai_suggestion_id, confirmed_by, confirmed_at, created_by)
  values (p_student, p_skill, v_family,
          coalesce(p_relation, 'demonstrates')::app.evidence_relation,
          coalesce(p_occurred_on, current_date),
          p_portfolio, p_document,
          coalesce(p_note, case when p_portfolio is null and p_document is null
                                then 'Confirmed by a parent' end),
          case when p_suggestion is null then 'parent' else 'ai_suggestion' end::app.source_type,
          p_suggestion, auth.uid(), now(), auth.uid())
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.confirm_skill_evidence(uuid, uuid, text, uuid, uuid, uuid, date, text)
  from public, anon;
grant execute on function public.confirm_skill_evidence(uuid, uuid, text, uuid, uuid, uuid, date, text)
  to authenticated, service_role;

comment on function public.confirm_skill_evidence(uuid, uuid, text, uuid, uuid, uuid, date, text) is
  'Records that a piece of work RELATES to a skill, once a person has said so. '
  'Deliberately does not touch student_skills: evidence is not mastery, and this '
  'is exactly where that line would be crossed by accident.';

/**
 * Add a curriculum a family already uses, in one call.
 *
 * "Other curriculum" must always work - a family whose program we have never
 * heard of is the normal case, not the edge case - so the provider is created
 * on the fly when no catalog entry matches.
 */
create or replace function public.add_family_course(
  p_family        uuid,
  p_course_name   text,
  p_provider_slug text default null,
  p_provider_name text default null,
  p_subject       uuid default null,
  p_external_url  text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_provider uuid; v_course uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_course_name), '') = '' then
    raise exception 'a curriculum needs a name' using errcode = 'check_violation';
  end if;

  if p_provider_slug is not null then
    select p.id into v_provider from public.curriculum_providers p
     where p.slug = p_provider_slug and p.scope = 'catalog';
  end if;

  if v_provider is null then
    -- A curriculum nobody has heard of. This path is normal.
    insert into public.curriculum_providers (slug, name, scope, family_id, created_by)
    values ('fam-' || replace(gen_random_uuid()::text, '-', ''),
            coalesce(nullif(trim(p_provider_name), ''), trim(p_course_name)),
            'family', p_family, auth.uid())
    returning id into v_provider;
  end if;

  insert into public.courses (provider_id, scope, family_id, name, subject_id,
                              external_url, created_by)
  values (v_provider, 'family', p_family, trim(p_course_name), p_subject,
          nullif(trim(p_external_url), ''), auth.uid())
  returning id into v_course;

  return v_course;
end;
$fn$;

revoke all on function public.add_family_course(uuid, text, text, text, uuid, text) from public, anon;
grant execute on function public.add_family_course(uuid, text, text, text, uuid, text)
  to authenticated, service_role;

/** Mark a lesson done by hand. The only progress a browser may assert. */
create or replace function public.record_manual_completion(
  p_enrollment uuid,
  p_lesson     uuid default null,
  p_score      numeric default null,
  p_note       text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_e public.student_course_enrollments; v_id uuid; v_provider uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_e from public.student_course_enrollments e where e.id = p_enrollment;
  if not found then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select c.provider_id into v_provider from public.courses c where c.id = v_e.course_id;

  insert into public.external_progress_events (
    enrollment_id, student_id, family_id, provider_id, lesson_id,
    event_type, occurred_at, score, source_type, recorded_by, payload)
  values (p_enrollment, v_e.student_id, v_e.family_id, v_provider, p_lesson,
          (case when p_lesson is null then 'course_progress_updated'
                else 'lesson_completed' end)::app.progress_event_type,
          now(), p_score, 'manual'::app.source_type, auth.uid(),
          jsonb_build_object('note', p_note))
  returning id into v_id;

  return v_id;
end;
$fn$;

revoke all on function public.record_manual_completion(uuid, uuid, numeric, text) from public, anon;
grant execute on function public.record_manual_completion(uuid, uuid, numeric, text)
  to authenticated, service_role;

select app.assert_schema_invariants();
