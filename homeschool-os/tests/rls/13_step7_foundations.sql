-- =============================================================================
-- STEP 7 phase 1 - the three axes, the four states, and what cannot come back
-- =============================================================================
-- The migration regression (tests/migration/run.sh) proves the reshape carried
-- legacy rows honestly. This file proves the resulting schema keeps its promises
-- in the database every other test runs against.
--
-- FIXTURE OWNERSHIP. Rows this file creates are prefixed TEST7 and it deletes
-- only what it created. Every destructive check runs inside a transaction that
-- is rolled back, so the enum and the tables are exactly as they were.
-- =============================================================================

\set CARLA '11111111-1111-4111-8111-000000000001'
\set LUCAS '44444444-4444-4444-8444-00000000000d'

-- =============================================================================
-- 1. The three axes exist, and are independent of each other
-- =============================================================================

select t.assert_eq(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'evidence_confidence'),
  'preliminary,supported,corroborated',
  '1a. evidence confidence is exactly three strengths');

-- The axis must not have acquired a source or a provenance word.
select t.assert_eq(
  (select count(*)::int from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'evidence_confidence'
      and e.enumlabel in ('parent_reported','teacher_observed','assessment_confirmed',
                          'ai_suggested','self_reported','parent','teacher','unknown')),
  0, '1b. and carries no source or provenance word among its labels');

select t.assert_eq((select count(*)::int from pg_type ty
                     join pg_namespace n on n.oid = ty.typnamespace
                    where n.nspname = 'app'
                      and ty.typname in ('mastery_level','confidence_level')),
  0, '1c. the conflated enums are gone');

begin;
do $$
declare v_ss uuid; v_conf text;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  insert into public.student_skills (student_id, skill_id, evidence_source,
                                     evidence_confidence, record_provenance, notes)
  values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000204',
          'parent', 'supported', 'human_entered', 'TEST7 independence')
  returning id into v_ss;

  -- Changing WHO observed it must not change HOW STRONG the evidence is.
  update public.student_skills set evidence_source = 'assessment_instrument' where id = v_ss;
  select evidence_confidence::text into v_conf from public.student_skills where id = v_ss;
  perform t.assert_eq(v_conf, 'supported',
    '1d. changing the observation authority left evidence confidence untouched');

  -- And changing the strength must not, by itself, change the state.
  update public.student_skills set evidence_confidence = 'corroborated' where id = v_ss;
  perform t.assert_eq((select skill_state::text from public.student_skills where id = v_ss),
    'unknown', '1e. and raising evidence confidence did not raise the state');
  perform t.logout();
end $$;
rollback;

-- =============================================================================
-- 2. The state model is exactly four, and unknown is the default
-- =============================================================================

select t.assert_eq(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'skill_state'),
  'unknown,emerging,developing,secure', '2a. four states, in order');

select t.assert_eq(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'student_skills'
      and column_name = 'skill_state'),
  '''unknown''::app.skill_state',
  '2b. and a new row defaults to unknown, not to a verdict about the child');

-- =============================================================================
-- 3. A machine may not decide; a parent may
-- =============================================================================

begin;
do $$
declare v_err text;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  begin
    insert into public.student_skills (student_id, skill_id, skill_state, record_provenance, notes)
    values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000205',
            'developing', 'ai_proposed_unreviewed', 'TEST7 unreviewed');
    v_err := 'NO ERROR';
  exception when check_violation then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED',
    '3a. an unreviewed AI proposal may not carry a state');

  begin
    insert into public.student_skills (student_id, skill_id, skill_state, evidence_source, notes)
    values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000205',
            'secure', 'teacher', 'TEST7 unconfirmed');
    v_err := 'NO ERROR';
  exception when check_violation then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED', '3b. secure requires a human confirmation');

  -- The half the pre-STEP-7 rule got wrong: in a homeschool the parent IS the
  -- teacher, and the old constraint made a parent's own judgement insufficient.
  insert into public.student_skills (student_id, skill_id, skill_state, evidence_source,
                                     record_provenance, human_confirmed_by, human_confirmed_at,
                                     notes)
  values ('44444444-4444-4444-8444-00000000000d', '00000000-0000-4000-8000-000000000205',
          'secure', 'parent', 'human_entered',
          '11111111-1111-4111-8111-000000000001', now(), 'TEST7 parent secure');
  perform t.assert_eq(
    (select skill_state::text from public.student_skills where notes = 'TEST7 parent secure'),
    'secure', '3c. a parent''s own confirmation reaches secure');
  perform t.logout();
end $$;
rollback;

-- =============================================================================
-- 4. The retired semantics cannot come back
-- =============================================================================
-- Each check re-adds the thing and requires the invariant function to refuse,
-- inside a transaction that is rolled back.

begin;
alter table public.student_skills add column score numeric(5,2);
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED', '4a. student_skills.score cannot be re-added');
end $$;
rollback;

begin;
alter table public.student_skills add column mastery_level text;
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED', '4b. nor mastery_level');
end $$;
rollback;

begin;
alter table public.student_skill_events add column percentage numeric(5,2);
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED', '4c. nor a percentage on the events table');
end $$;
rollback;

begin;
alter table public.student_skills add column grade_level text;
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED', '4d. nor a grade level on a child''s skill row');
end $$;
rollback;

-- refresh_suggested is an advisory signal (STEP 7 phase 4). A state column that
-- can hold it is a signal that will one day downgrade a child.
begin;
alter type app.skill_state add value 'refresh_suggested';
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED',
    '4e. refresh_suggested cannot be added to the state model');
end $$;
rollback;

-- And the structural guarantee itself is noticed if somebody drops it.
begin;
alter table public.student_skills drop constraint student_skills_unreviewed_ai_has_no_state_ck;
do $$
declare v_err text;
begin
  begin perform app.assert_schema_invariants(); v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED',
    '4f. dropping the unreviewed-AI constraint fails the invariants');
end $$;
rollback;

-- =============================================================================
-- 5. The append-only history survived the reshape
-- =============================================================================

select t.assert(
  (select tgenabled from pg_trigger
    where tgrelid = 'public.student_skill_events'::regclass
      and tgname = 'student_skill_events_append_only') <> 'D',
  '5a. the append-only trigger is enabled after the migrations');

-- =============================================================================
-- 6. STEP 6 is untouched by all of this
-- =============================================================================

select t.assert_eq((select count(*)::int from public.standards), 184,
  '6a. the published standards catalogue is unchanged');
select t.assert_eq((select count(*)::int from public.skill_standards), 0,
  '6b. no skill acquired a standards mapping');
select t.assert_eq((select count(*)::int from public.skill_prerequisites
                     where source_type in ('import','ai_suggestion')), 0,
  '6c. no prerequisite was created by an import');
select t.assert_eq((select count(*)::int from information_schema.columns
                     where table_schema = 'public' and table_name = 'skills'
                       and column_name in ('framework','framework_ref','standard','standard_id',
                                           'standard_ref','standard_code','standards_code')), 0,
  '6d. and no standards field reappeared on skills');
