-- =============================================================================
-- Assertions on the 0081-0083 migration of synthetic legacy rows
-- =============================================================================
-- Runs AFTER 0081, 0082 and 0083 have been applied over the seeded rows.
--
-- The claim being tested is not "the migration ran". It is that the migration
-- did not silently invent knowledge about a child: no row came out asserting
-- more than its legacy value could establish, and every axis the legacy value
-- could not answer came out explicitly unknown rather than plausibly filled in.
-- =============================================================================

do $$
declare v_n int; v_state text; v_src text; v_prov text;
begin
  -- ---------------------------------------------------------------- states ---
  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST not_started';
  perform t.assert_eq(v_state, 'unknown',
    '1a. not_started became unknown - an absence of evidence is not a verdict');
  perform t.assert(v_state <> 'emerging',
    '1b. and specifically NOT emerging - nothing was shown');

  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST introduced';
  perform t.assert_eq(v_state, 'unknown',
    '1c. introduced became unknown - instruction happened, the child showed nothing');

  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST developing';
  perform t.assert_eq(v_state, 'developing', '1d. developing stayed developing');

  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST progressing';
  perform t.assert_eq(v_state, 'developing',
    '1e. progressing became developing - never mapped upward');

  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST proficient';
  perform t.assert_eq(v_state, 'developing',
    '1f. proficient became developing - only mastered carried a human-confirmation guarantee');

  select skill_state::text into v_state from public.student_skills where notes = 'MIGTEST mastered';
  perform t.assert_eq(v_state, 'secure', '1g. mastered became secure');

  -- THE ONE THAT MATTERS MOST. `emerging` means the child showed early signs.
  -- No legacy value meant that, so the migration must never produce it.
  select count(*)::int into v_n from public.student_skills
   where notes like 'MIGTEST%' and skill_state = 'emerging';
  perform t.assert_eq(v_n, 0, '1h. the migration invented `emerging` for nobody');

  -- ------------------------------------------------------------ confidence ---
  -- The legacy enum never carried evidence STRENGTH. assessment_confirmed looks
  -- like one and is not: it names a source. Reading it as a strength would put
  -- source authority back into the confidence axis.
  select count(*)::int into v_n from public.student_skills
   where notes like 'MIGTEST%' and evidence_confidence is not null;
  perform t.assert_eq(v_n, 0,
    '2a. no legacy row was given an evidence_confidence - the old enum could not establish one');

  select count(*)::int into v_n from public.student_skill_events
   where evidence_note like 'MIGTEST%' and evidence_confidence is not null;
  perform t.assert_eq(v_n, 0, '2b. and neither was any event');

  -- ---------------------------------------------------------------- source ---
  select evidence_source::text into v_src from public.student_skills where notes = 'MIGTEST introduced';
  perform t.assert_eq(v_src, 'parent', '3a. parent_reported established the source');
  select evidence_source::text into v_src from public.student_skills where notes = 'MIGTEST developing';
  perform t.assert_eq(v_src, 'student_self', '3b. self_reported established the source');
  select evidence_source::text into v_src from public.student_skills where notes = 'MIGTEST progressing';
  perform t.assert_eq(v_src, 'teacher', '3c. teacher_observed established the source');
  select evidence_source::text into v_src from public.student_skills where notes = 'MIGTEST proficient';
  perform t.assert_eq(v_src, 'assessment_instrument', '3d. assessment_confirmed established the source');
  select evidence_source::text into v_src from public.student_skills where notes = 'MIGTEST not_started';
  perform t.assert_eq(v_src, 'unknown',
    '3e. ai_suggested established NO source - it answers a different question');

  -- ------------------------------------------------------------ provenance ---
  select record_provenance::text into v_prov from public.student_skills where notes = 'MIGTEST not_started';
  perform t.assert_eq(v_prov, 'ai_proposed_unreviewed',
    '4a. ai_suggested with no human confirmation is an unreviewed proposal');
  select record_provenance::text into v_prov from public.student_skills where notes = 'MIGTEST ai_confirmed';
  perform t.assert_eq(v_prov, 'human_confirmed_ai_proposal',
    '4b. ai_generated plus a human confirmation is a confirmed proposal');
  select record_provenance::text into v_prov from public.student_skills where notes = 'MIGTEST progressing';
  perform t.assert_eq(v_prov, 'unknown',
    '4c. a row that said nothing about provenance came out unknown, not human_entered');

  -- ------------------------------------------------ nothing gained or lost ---
  select count(*)::int into v_n from public.student_skills where notes like 'MIGTEST%';
  perform t.assert_eq(v_n, 7, '5a. every seeded row survived the migration');
  select count(*)::int into v_n from public.student_skill_events where evidence_note like 'MIGTEST%';
  perform t.assert_eq(v_n, 2, '5b. and every seeded event');

  select skill_state::text into v_state from public.student_skill_events
   where evidence_note = 'MIGTEST event with no state';
  perform t.assert(v_state is null,
    '5c. an event that asserted no state still asserts none - it did not become unknown');

  -- ------------------------------------------- the unreviewed-AI structure ---
  -- The seeded unreviewed row is `unknown`, so it satisfies the new constraint.
  -- Prove the constraint actually bites by trying to give it a state.
  begin
    update public.student_skills set skill_state = 'developing' where notes = 'MIGTEST not_started';
    raise exception 'ASSERTION FAILED: 6a. an unreviewed AI proposal was given a state';
  exception when check_violation then null;
  end;

  -- And that a human-confirmed proposal may hold one.
  update public.student_skills set skill_state = 'developing' where notes = 'MIGTEST ai_confirmed';
  perform t.assert_eq(
    (select skill_state::text from public.student_skills where notes = 'MIGTEST ai_confirmed'),
    'developing', '6b. a human-confirmed proposal may carry a state');

  -- ------------------------------------------------ secure needs a human ----
  begin
    update public.student_skills
       set skill_state = 'secure', human_confirmed_by = null, human_confirmed_at = null
     where notes = 'MIGTEST developing';
    raise exception 'ASSERTION FAILED: 7a. secure was accepted with no human confirmation';
  exception when check_violation then null;
  end;

  -- A PARENT may reach secure. The old constraint required teacher_observed or
  -- assessment_confirmed, which in a homeschool meant a parent never could.
  update public.student_skills
     set skill_state = 'secure', evidence_source = 'parent',
         human_confirmed_by = '11111111-1111-4111-8111-000000000001', human_confirmed_at = now()
   where notes = 'MIGTEST introduced';
  perform t.assert_eq(
    (select skill_state::text from public.student_skills where notes = 'MIGTEST introduced'),
    'secure', '7b. a parent''s own confirmation can reach secure');
end $$;

-- ----------------------------------------------------- the retired surface ---
select t.assert_eq((select count(*)::int from information_schema.columns
                     where table_schema = 'public'
                       and table_name in ('student_skills', 'student_skill_events')
                       and column_name in ('score', 'mastery_level', 'confidence', 'delta')), 0,
  '8a. the retired columns are gone');

select t.assert_eq((select count(*)::int from pg_type t
                     join pg_namespace n on n.oid = t.typnamespace
                    where n.nspname = 'app'
                      and t.typname in ('mastery_level', 'confidence_level')), 0,
  '8b. the retired enums are gone');

select t.assert_eq((select count(*)::int from information_schema.columns
                     where table_schema = 'public' and table_name = 'assessment_results'
                       and column_name = 'confidence'), 0,
  '8c. and the conflated column is gone from assessment_results too');

-- ------------------------------------------------- they cannot come back -----
do $$
declare v_err text;
begin
  alter table public.student_skills add column score numeric(5,2);
  begin
    perform app.assert_schema_invariants();
    v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  alter table public.student_skills drop column score;
  perform t.assert_eq(v_err, 'REFUSED', '9a. re-adding score fails the invariants');
end $$;

do $$
declare v_err text;
begin
  alter table public.student_skill_events add column percentage numeric(5,2);
  begin
    perform app.assert_schema_invariants();
    v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  alter table public.student_skill_events drop column percentage;
  perform t.assert_eq(v_err, 'REFUSED', '9b. and so does a synonym on the events table');
end $$;

do $$
declare v_err text;
begin
  -- refresh_suggested is an advisory signal. A state column that can hold it is
  -- a signal that will eventually downgrade a child.
  alter type app.skill_state add value 'refresh_suggested';
  begin
    perform app.assert_schema_invariants();
    v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED'; end;
  perform t.assert_eq(v_err, 'REFUSED',
    '9c. adding refresh_suggested to the state enum fails the invariants');
end $$;

select t.assert(true, '--- migration regression complete ---');
