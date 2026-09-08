-- =============================================================================
-- STEP 5 - Smart Intake, the skill graph, curriculum and evidence
-- =============================================================================
-- The claims worth proving are the ones a family would be harmed by if they
-- were wrong: AI cannot analyse a file the scanner has not cleared, AI cannot
-- overwrite what a parent typed, a suggestion is not a fact, evidence is not
-- mastery, and one household's curriculum and evidence are invisible to
-- everyone else.
-- =============================================================================

\set CARLA    '11111111-1111-4111-8111-000000000001'
\set PEDRO    '11111111-1111-4111-8111-000000000002'
\set DIEGO    '11111111-1111-4111-8111-000000000003'
\set ADELE    '11111111-1111-4111-8111-000000000004'
\set TOMAS    '11111111-1111-4111-8111-000000000005'
\set EVA      '11111111-1111-4111-8111-000000000007'
\set STRANGER '11111111-1111-4111-8111-000000000008'
\set NORA     '11111111-1111-4111-8111-00000000000a'
\set FAM_A    '22222222-2222-4222-8222-00000000000a'
\set FAM_B    '22222222-2222-4222-8222-00000000000b'
\set LUCAS    '44444444-4444-4444-8444-00000000000d'
\set MARLA    '44444444-4444-4444-8444-00000000000e'
\set SOFIA    '44444444-4444-4444-8444-00000000000f'

-- =============================================================================
-- 1. The skill graph
-- =============================================================================
begin;
select t.assert_eq((select count(*)::int from public.skills where code like 'NST.FR%'), 5,
  '1a. the seed graph is small and present');

select t.assert_eq(
  (select count(*)::int from public.skill_prerequisite_closure(
     (select id from public.skills where code = 'NST.FR.5'))), 4,
  '1b. the closure walks the whole chain, not just the direct edges');

-- A skill is not its own prerequisite.
do $$
declare v uuid;
begin
  select id into v from public.skills where code = 'NST.FR.3';
  begin
    insert into public.skill_prerequisites (skill_id, prerequisite_skill_id) values (v, v);
    raise exception 'ASSERTION FAILED: 1c. a skill was made its own prerequisite';
  exception when check_violation then null;
  end;
end $$;

-- The same edge twice is not a stronger claim.
do $$
declare a uuid; b uuid;
begin
  select id into a from public.skills where code = 'NST.FR.4';
  select id into b from public.skills where code = 'NST.FR.3';
  begin
    insert into public.skill_prerequisites (skill_id, prerequisite_skill_id) values (a, b);
    raise exception 'ASSERTION FAILED: 1d. a duplicate prerequisite was accepted';
  exception when unique_violation then null;
  end;
end $$;

-- THE ONE THAT MATTERS: a cycle is refused at write time, not detected later.
do $$
declare fr1 uuid; fr5 uuid;
begin
  select id into fr1 from public.skills where code = 'NST.FR.1';
  select id into fr5 from public.skills where code = 'NST.FR.5';
  begin
    -- FR.5 already depends on FR.1 transitively; this would close the loop.
    insert into public.skill_prerequisites (skill_id, prerequisite_skill_id) values (fr1, fr5);
    raise exception 'ASSERTION FAILED: 1e. a prerequisite CYCLE was accepted';
  exception when check_violation then null;
  end;
end $$;

-- This asserted the table was EMPTY, which was a proxy for the real claim
-- while nothing had been ingested. The claim is "no invented codes", and it is
-- now checkable directly and far more strongly: every standard that exists came
-- out of a registered artifact and points at the staged row it was read from.
-- An invented code has nowhere to come from.
select t.assert_eq((select count(*)::int from public.standards
                     where source_id is null or staged_record_id is null), 0,
  '1f. no standard exists that no artifact produced - no invented codes');
select t.assert((select count(*) from public.standards_frameworks) >= 3,
  '1g. but the frameworks are named, with their own URLs');
commit;

-- Reference data is readable by everyone signed in, and by nobody else.
begin;
select t.login(:'STRANGER');
select t.assert((select count(*) from public.skills where code like 'NST.FR%') = 5,
  '1h. the skill catalogue is shared vocabulary, readable by any signed-in user');
select t.assert_eq((select count(*)::int from public.skill_prerequisites), 5,
  '1i. and so is the graph');
commit;

-- =============================================================================
-- 2. Analysis never runs before the security gate
-- =============================================================================
begin;
select t.login(:'CARLA');
select public.register_document(
  'uploads-quarantine', :'FAM_A' || '/lucas/2026/step5-pending.jpg', 'pending.jpg',
  'image/jpeg', 120000, repeat('e1', 32), :'FAM_A'::uuid, :'LUCAS'::uuid, 'Still pending') as r
\gset
commit;

begin;
select t.login(:'CARLA');
-- A document the scanner has not cleared cannot be queued for analysis at all.
do $$
declare v uuid;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  begin
    perform public.queue_document_analysis(v);
    raise exception 'ASSERTION FAILED: 2a. a PENDING document was queued for AI analysis';
  exception when check_violation then null;
  end;
end $$;
commit;

-- Infected is refused for the same reason and by the same gate.
-- t.login sets the claim at SESSION scope, so it outlives the transaction:
-- acting as the worker means explicitly putting the user identity down first.
begin;
select t.logout();
do $$
declare v uuid;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  perform app.record_scan_result(v, 'infected', 'EICAR test signature');
end $$;
commit;

begin;
select t.login(:'CARLA');
do $$
declare v uuid;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  begin
    perform public.queue_document_analysis(v);
    raise exception 'ASSERTION FAILED: 2b. an INFECTED document was queued for AI analysis';
  exception when check_violation then null;
  end;
end $$;
commit;

-- Clean, and only then, is it queueable.
begin;
select t.logout();
do $$
declare v uuid;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  update public.documents set scan_status = 'pending', scanned_at = null where id = v;
  perform app.record_scan_result(v, 'clean', 'step 5 tests');
end $$;
commit;

begin;
select t.login(:'CARLA');
do $$
declare v uuid; r jsonb;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  r := public.queue_document_analysis(v);
  perform t.assert_eq(r->>'status', 'queued', '2c. a CLEAN document can be queued');
  perform t.assert_eq((r->>'created')::boolean, true, '2d. and a row was created');

  -- IDEMPOTENCY: the same bytes are not paid for twice.
  r := public.queue_document_analysis(v);
  perform t.assert_eq((r->>'created')::boolean, false,
    '2e. queueing the same document again creates nothing');
  perform t.assert_eq((select count(*)::int from public.document_ai_analysis where document_id = v), 1,
    '2f. and there is still exactly one analysis');

  -- An explicit "Analyze again" is a NEW version, not a silent re-run.
  r := public.queue_document_analysis(v, true);
  perform t.assert_eq((r->>'created')::boolean, true, '2g. an explicit re-analysis is allowed');
  perform t.assert_eq((select count(*)::int from public.document_ai_analysis where document_id = v), 2,
    '2h. and is recorded as a second version, preserving the first');
end $$;
commit;

-- Someone else's document cannot be queued at all.
begin;
select t.login(:'DIEGO');
do $$
declare v uuid;
begin
  select id into v from public.documents where sha256 = repeat('e1', 32);
  begin
    perform public.queue_document_analysis(v);
    raise exception 'ASSERTION FAILED: 2i. another family queued analysis of our document';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- =============================================================================
-- 3. A suggestion is not a fact
-- =============================================================================
begin;
select t.logout();
do $$
declare v_doc uuid; v_sug uuid;
begin
  select id into v_doc from public.documents where sha256 = repeat('e1', 32);

  insert into public.ai_suggestions (kind, source_type, document_id, family_id, student_id,
                                     payload, confidence, requires_confirmation, status)
  values ('classify_document', 'document_extraction', v_doc,
          '22222222-2222-4222-8222-00000000000a', '44444444-4444-4444-8444-00000000000d',
          '{}'::jsonb, 0.8, true, 'pending')
  returning id into v_sug;

  insert into public.ai_suggestion_fields (suggestion_id, field_key, suggested_value,
                                           confidence, confidence_band, evidence)
  values (v_sug, 'subject', '"Math"'::jsonb, 0.86, 'high', 'subject vocabulary on the page'),
         (v_sug, 'topic', '"Equivalent Fractions"'::jsonb, 0.81, 'high', 'topic named'),
         (v_sug, 'date', '"2026-09-04"'::jsonb, 0.20, 'low', 'faint, possibly a 4'),
         (v_sug, 'possible_skill:Identify equivalent fractions',
          '"Identify equivalent fractions"'::jsonb, 0.6, 'medium', 'skill language present');
end $$;
commit;

begin;
select t.login(:'CARLA');
-- Confidence is PER FIELD. This is the whole point.
select t.assert_eq(
  (select count(distinct confidence_band)::int from public.ai_suggestion_fields), 3,
  '3a. one suggestion carries several different confidences');
select t.assert_eq(
  (select confidence_band::text from public.ai_suggestion_fields where field_key = 'date'), 'low',
  '3b. a confident subject does not make the date confident');

-- The tenant columns were inherited, not supplied.
select t.assert_eq(
  (select count(*)::int from public.ai_suggestion_fields
    where family_id = '22222222-2222-4222-8222-00000000000a'), 4,
  '3c. field rows inherited the parent suggestion''s family');
commit;

-- A view-only guardian may READ every suggestion and DECIDE none of them.
begin;
select t.login(:'PEDRO');
select t.assert_eq((select count(*)::int from public.ai_suggestion_fields), 4,
  '3d. a view-only guardian sees the suggestions');
do $$
declare v uuid;
begin
  select id into v from public.ai_suggestion_fields where field_key = 'subject';
  begin
    perform public.decide_suggestion_field(v, 'accepted');
    raise exception 'ASSERTION FAILED: 3e. a view-only guardian accepted an AI suggestion';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Another family sees nothing at all.
begin;
select t.login(:'DIEGO');
select t.assert_eq((select count(*)::int from public.ai_suggestion_fields), 0,
  '3f. another family sees none of our Smart Intake suggestions');
commit;

-- Accept, edit and reject each behave, and each records WHO.
begin;
select t.login(:'CARLA');
do $$
declare v_sub uuid; v_top uuid; v_date uuid;
begin
  select id into v_sub  from public.ai_suggestion_fields where field_key = 'subject';
  select id into v_top  from public.ai_suggestion_fields where field_key = 'topic';
  select id into v_date from public.ai_suggestion_fields where field_key = 'date';

  perform public.decide_suggestion_field(v_sub, 'accepted');
  perform t.assert_eq((select status::text from public.ai_suggestion_fields where id = v_sub),
    'accepted', '3g. a suggestion can be accepted');
  perform t.assert_eq((select accepted_value from public.ai_suggestion_fields where id = v_sub),
    '"Math"'::jsonb, '3h. and keeps the value that was suggested');

  perform public.decide_suggestion_field(v_top, 'edited', '"Comparing Fractions"'::jsonb);
  perform t.assert_eq((select accepted_value from public.ai_suggestion_fields where id = v_top),
    '"Comparing Fractions"'::jsonb, '3i. an edit keeps what the HUMAN wrote');
  perform t.assert_eq((select suggested_value from public.ai_suggestion_fields where id = v_top),
    '"Equivalent Fractions"'::jsonb,
    '3j. and the original suggestion is still on the record, not overwritten');

  perform public.decide_suggestion_field(v_date, 'rejected');
  perform t.assert_eq((select status::text from public.ai_suggestion_fields where id = v_date),
    'rejected', '3k. a low-confidence suggestion can be rejected');
  perform t.assert((select accepted_value is null from public.ai_suggestion_fields where id = v_date),
    '3l. and nothing is kept from it');

  perform t.assert_eq((select count(*)::int from public.ai_suggestion_fields
                        where decided_by is not null), 3,
    '3m. every decision records who made it');
end $$;
commit;

-- =============================================================================
-- 4. AI never silently replaces what a human typed
-- =============================================================================
begin;
select t.login(:'CARLA');
do $$
declare v_doc uuid; v_title text;
begin
  select id into v_doc from public.documents where sha256 = repeat('e1', 32);
  select title into v_title from public.documents where id = v_doc;
  perform t.assert_eq(v_title, 'Still pending',
    '4a. the document still carries the title the PARENT typed');
  perform t.assert_eq((select count(*)::int from public.ai_suggestion_fields
                        where status = 'accepted'), 1,
    '4b. even though a suggestion has been accepted');
end $$;
commit;

-- =============================================================================
-- 5. Evidence is not mastery
-- =============================================================================
begin;
select t.login(:'CARLA');
do $$
declare v_skill uuid; v_ev uuid; v_doc uuid;
        v_mastery_before int; v_events_before int; v_level_before text;
begin
  select id into v_skill from public.skills where code = 'NST.FR.3';
  select id into v_doc from public.documents where sha256 = repeat('e1', 32);

  select count(*)::int into v_mastery_before from public.student_skills
   where student_id = '44444444-4444-4444-8444-00000000000d';
  select count(*)::int into v_events_before from public.student_skill_events
   where student_id = '44444444-4444-4444-8444-00000000000d';
  select mastery_level::text into v_level_before from public.student_skills
   where student_id = '44444444-4444-4444-8444-00000000000d' limit 1;

  v_ev := public.confirm_skill_evidence(
    '44444444-4444-4444-8444-00000000000d', v_skill, 'demonstrates', null, v_doc);
  perform t.assert(v_ev is not null, '5a. a parent can confirm that work shows a skill');
  perform t.assert_eq((select confirmed_by from public.learning_evidence where id = v_ev),
    auth.uid(), '5b. and the confirmation records who made it');

  -- THE LINE. Confirming evidence does not touch mastery, at all.
  -- Compared against a snapshot rather than against zero: the fixtures already
  -- carry a mastery row for this child, and a test that only passes on an empty
  -- table would stop being a test the moment real data existed.
  perform t.assert_eq((select count(*)::int from public.student_skills
                        where student_id = '44444444-4444-4444-8444-00000000000d'),
                      v_mastery_before,
    '5c. confirming evidence created NO new mastery record');
  perform t.assert_eq((select count(*)::int from public.student_skill_events
                        where student_id = '44444444-4444-4444-8444-00000000000d'),
                      v_events_before,
    '5d. and no mastery event');
  perform t.assert_eq((select mastery_level::text from public.student_skills
                        where student_id = '44444444-4444-4444-8444-00000000000d'
                        limit 1), v_level_before,
    '5e. and did not move the mastery level that was already there');
end $$;
commit;

-- A view-only guardian cannot confirm evidence.
begin;
select t.login(:'PEDRO');
do $$
declare v_skill uuid;
begin
  select id into v_skill from public.skills where code = 'NST.FR.4';
  begin
    perform public.confirm_skill_evidence('44444444-4444-4444-8444-00000000000d', v_skill);
    raise exception 'ASSERTION FAILED: 5e. a view-only guardian confirmed skill evidence';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Evidence is invisible across families.
begin;
select t.login(:'DIEGO');
select t.assert_eq((select count(*)::int from public.learning_evidence), 0,
  '5g. another family sees none of our learning evidence');
commit;

-- =============================================================================
-- 6. Curriculum
-- =============================================================================
begin;
select t.login(:'CARLA');
select public.add_family_course(
  :'FAM_A'::uuid, 'Teaching Textbooks Math 4', 'teaching-textbooks', null, null,
  'https://www.teachingtextbooks.com/') as course
\gset
select t.assert(:'course' is not null, '6a. a parent can add a curriculum from the catalog');

-- A curriculum nobody has heard of must always work.
select public.add_family_course(
  :'FAM_A'::uuid, 'Nana''s Latin Notebook', null, 'Nana', null, null) as custom
\gset
select t.assert(:'custom' is not null, '6b. and one we have never heard of');
select t.assert_eq(
  (select p.scope::text from public.courses c join public.curriculum_providers p on p.id = c.provider_id
    where c.id = :'custom'::uuid), 'family',
  '6c. which creates a provider private to that family');
commit;

begin;
select t.login(:'CARLA');
insert into public.student_course_enrollments (student_id, course_id, family_id, integration_mode)
values (:'LUCAS'::uuid, :'course'::uuid, :'FAM_A'::uuid, 'linked'),
       (:'LUCAS'::uuid, :'custom'::uuid, :'FAM_A'::uuid, 'manual');
select t.assert_eq((select count(*)::int from public.student_course_enrollments
                     where student_id = :'LUCAS'::uuid), 2,
  '6d. one child can use several curricula at once');
select t.assert_eq((select count(*)::int from public.student_course_enrollments
                     where integration_mode = 'integrated'), 0,
  '6e. and NOTHING claims to be integrated');
commit;

-- Manual completion is progress, and it is the only kind a browser may assert.
begin;
select t.login(:'CARLA');
do $$
declare v_e uuid; v_id uuid;
begin
  select id into v_e from public.student_course_enrollments
   where student_id = '44444444-4444-4444-8444-00000000000d' limit 1;
  v_id := public.record_manual_completion(v_e, null, null, 'Finished lesson 22 today');
  perform t.assert(v_id is not null, '6f. a family can mark work complete by hand');
  perform t.assert_eq((select source_type::text from public.external_progress_events where id = v_id),
    'manual', '6g. and it is recorded as manual, never as provider-reported');
end $$;
commit;

-- A browser cannot forge a provider-reported event.
begin;
select t.login(:'CARLA');
do $$
declare v_e public.student_course_enrollments;
begin
  select * into v_e from public.student_course_enrollments
   where student_id = '44444444-4444-4444-8444-00000000000d' limit 1;
  begin
    insert into public.external_progress_events
      (enrollment_id, student_id, family_id, event_type, source_type)
    values (v_e.id, v_e.student_id, v_e.family_id,
            'score_received'::app.progress_event_type, 'import'::app.source_type);
    raise exception 'ASSERTION FAILED: 6h. a browser forged a provider-reported progress event';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- The progress log is append-only. TWO independent things make that true and
-- they are worth proving separately, because each covers the other's gap.
begin;
select t.login(:'CARLA');
do $$
declare v uuid; n int;
begin
  select id into v from public.external_progress_events limit 1;
  -- (1) RLS: there is no DELETE policy, so a user session reaches no rows at
  -- all. This deletes nothing and raises nothing - silence, not an error.
  delete from public.external_progress_events where id = v;
  get diagnostics n = row_count;
  perform t.assert_eq(n, 0, '6i. a user session deletes no progress events');
  perform t.assert_eq((select count(*)::int from public.external_progress_events where id = v), 1,
    '6j. and the event is still there');
end $$;
commit;

begin;
select t.logout();
do $$
declare v uuid;
begin
  select id into v from public.external_progress_events limit 1;
  -- (2) The trigger: even as the table owner, with RLS out of the way and every
  -- privilege in hand, the log refuses to be rewritten. This is the half that
  -- still holds the day someone adds a DELETE policy without thinking.
  begin
    delete from public.external_progress_events where id = v;
    raise exception 'ASSERTION FAILED: 6k. the owner deleted a progress event';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.external_progress_events set score = 100 where id = v;
    raise exception 'ASSERTION FAILED: 6l. the owner rewrote a progress event';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Cross-family isolation, and the evaluator exclusion.
begin;
select t.login(:'DIEGO');
select t.assert_eq((select count(*)::int from public.courses where scope = 'family'), 0,
  '6m. another family sees none of our curricula');
select t.assert_eq((select count(*)::int from public.student_course_enrollments), 0,
  '6n. nor our enrollments');
commit;

begin;
select t.login(:'EVA');
select t.assert_eq((select count(*)::int from public.student_course_enrollments), 0,
  '6o. an evaluator does NOT get curriculum access just by holding a grant');
commit;

begin;
select t.login(:'PEDRO');
select t.assert((select count(*) from public.student_course_enrollments) = 2,
  '6p. a view-only guardian can SEE the curriculum');
do $$
begin
  insert into public.student_course_enrollments (student_id, course_id, family_id)
  values ('44444444-4444-4444-8444-00000000000d',
          (select id from public.courses where scope = 'family' limit 1),
          '22222222-2222-4222-8222-00000000000a');
  raise exception 'ASSERTION FAILED: 6q. a view-only guardian enrolled a child';
exception when insufficient_privilege then null;
end $$;
commit;

-- The teacher assigned to Lucas can see what Lucas is studying.
begin;
select t.login(:'TOMAS');
select t.assert((select count(*) from public.student_course_enrollments
                  where student_id = :'LUCAS'::uuid) = 2,
  '6r. the assigned teacher sees the student''s curriculum');
commit;

-- =============================================================================
-- 7. AI skill mappings stay suggestions
-- =============================================================================
begin;
select t.logout();
do $$
declare v_lesson uuid; v_course uuid; v_skill uuid;
begin
  select id into v_course from public.courses where name = 'Teaching Textbooks Math 4';
  select id into v_skill from public.skills where code = 'NST.FR.3';
  insert into public.course_lessons (course_id, name, lesson_number)
  values (v_course, 'Equivalent Fractions', '22') returning id into v_lesson;

  -- An AI mapping may be written, but not as confirmed.
  insert into public.resource_skills (lesson_id, skill_id, source_type, confidence, confirmed)
  values (v_lesson, v_skill, 'ai_suggestion', 0.7, false);
  perform t.assert_eq((select count(*)::int from public.resource_skills
                        where source_type = 'ai_suggestion' and not confirmed), 1,
    '7a. an AI skill mapping is recorded as a suggestion');

  begin
    insert into public.resource_skills (lesson_id, skill_id, source_type, confidence,
                                        confirmed, confirmed_at)
    values (v_lesson, v_skill, 'ai_suggestion', 0.9, true, now());
    raise exception 'ASSERTION FAILED: 7b. an AI mapping was made canonical with no human';
  exception when check_violation then null;
  end;
end $$;
commit;

select t.logout();

select 'STEP 5 LEARNING AND SMART INTAKE CASES PASSED' as result;
