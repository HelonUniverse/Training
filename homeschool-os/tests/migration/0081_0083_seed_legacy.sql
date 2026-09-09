-- =============================================================================
-- Synthetic PRE-migration rows for the 0081-0083 regression
-- =============================================================================
-- Applied against the schema as it stands at 0080, BEFORE the STEP 7 foundation
-- migrations run.
--
-- WHY THIS FILE EXISTS. student_skills and student_skill_events are empty in
-- every environment, so a migration test run against them proves nothing and
-- passes for the wrong reason - the vacuous test the brief forbids. These rows
-- carry every legacy `mastery_level` and every legacy `confidence_level` value
-- so the migration has something real to get wrong.
--
-- Every row is prefixed MIGTEST in its notes and is deleted by the assertions
-- file. Nothing seeded by a fixture is touched.
-- =============================================================================

\set LUCAS '44444444-4444-4444-8444-00000000000d'
\set CARLA '11111111-1111-4111-8111-000000000001'

-- Own the subject and skills this test uses rather than borrowing seeded ones.
insert into public.subjects (id, name, slug, is_system)
values ('cccccccc-0000-4000-8000-0000000000ff', 'MIGTEST subject', 'migtest-subject', false);

insert into public.skills (id, subject_id, code, name, description)
select ('cccccccc-0000-4000-8000-00000000000' || n)::uuid,
       'cccccccc-0000-4000-8000-0000000000ff'::uuid,
       'MIGTEST.S' || n, 'MIGTEST skill ' || n, 'MIGTEST'
  from generate_series(1, 6) as n;

-- --- every mastery_level, paired with a legal confidence ---------------------
-- The 0012 constraint only allows `mastered` when confidence is teacher_observed
-- or assessment_confirmed AND a human confirmed it, so the mastered rows carry
-- that. The rest vary the confidence to cover the enum.

insert into public.student_skills
  (student_id, skill_id, mastery_level, confidence, score, notes,
   human_confirmed_by, human_confirmed_at, ai_generated, ai_suggestion_id)
values
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000001',
   'not_started', 'ai_suggested',        null, 'MIGTEST not_started',  null, null, false, null),
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000002',
   'introduced',  'parent_reported',     12.5, 'MIGTEST introduced',   null, null, false, null),
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000003',
   'developing',  'self_reported',       40.0, 'MIGTEST developing',   null, null, false, null),
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000004',
   'progressing', 'teacher_observed',    66.0, 'MIGTEST progressing',  null, null, false, null),
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000005',
   'proficient',  'assessment_confirmed', 88.0, 'MIGTEST proficient',  null, null, false, null),
  (:'LUCAS', 'cccccccc-0000-4000-8000-000000000006',
   'mastered',    'assessment_confirmed', 97.0, 'MIGTEST mastered',
   :'CARLA', now(), false, null);

-- --- an AI-provenance row, to exercise the provenance mapping ----------------
-- ai_generated requires both a suggestion id and a human confirmation (0012),
-- and the suggestion id is a real FK - the existing AI lineage this migration
-- anchors provenance on, rather than inventing a parallel one.
insert into public.ai_suggestions
  (id, student_id, kind, payload, status, decided_by, decided_at,
   applied_record_type, applied_record_id)
values ('cccccccc-0000-4000-8000-0000000000aa', '44444444-4444-4444-8444-00000000000e',
        'update_skill', '{"note":"MIGTEST"}'::jsonb, 'accepted',
        :'CARLA', now(), 'student_skills', gen_random_uuid());
insert into public.student_skills
  (student_id, skill_id, mastery_level, confidence, score, notes,
   human_confirmed_by, human_confirmed_at, ai_generated, ai_suggestion_id)
values
  ('44444444-4444-4444-8444-00000000000e', 'cccccccc-0000-4000-8000-000000000001',
   'developing', 'teacher_observed', 50.0, 'MIGTEST ai_confirmed',
   :'CARLA', now(), true, 'cccccccc-0000-4000-8000-0000000000aa');

-- --- events, including one carrying no state at all --------------------------
insert into public.student_skill_events
  (student_skill_id, student_id, skill_id, mastery_level, confidence, score, delta,
   source_type, evidence_note)
select ss.id, ss.student_id, ss.skill_id, 'proficient', 'teacher_observed', 71.0, 4.5,
       'observation', 'MIGTEST event with a state'
  from public.student_skills ss
 where ss.notes = 'MIGTEST developing';

insert into public.student_skill_events
  (student_skill_id, student_id, skill_id, mastery_level, confidence, score, delta,
   source_type, evidence_note)
select ss.id, ss.student_id, ss.skill_id, null, 'ai_suggested', null, null,
       'ai_suggestion', 'MIGTEST event with no state'
  from public.student_skills ss
 where ss.notes = 'MIGTEST not_started';
