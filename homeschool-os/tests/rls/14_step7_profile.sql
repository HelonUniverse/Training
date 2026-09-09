-- =============================================================================
-- STEP 7 phase 3 - the profile, the recompute, and the parent who outranks it
-- =============================================================================
-- Everything destructive here runs inside a transaction that is rolled back, so
-- the database this file leaves behind is the one it found. Rows it creates are
-- marked TEST7P.
--
-- The two tests that matter most are 9 (a parent's decision survives a
-- recompute that disagrees with it) and 13 (the recompute cannot see the
-- standards catalogue even when asked to look). The rest keep those two honest.
-- =============================================================================

\set CARLA  '11111111-1111-4111-8111-000000000001'
\set PEDRO  '11111111-1111-4111-8111-000000000002'
\set DIEGO  '11111111-1111-4111-8111-000000000003'
\set LUCAS  '44444444-4444-4444-8444-00000000000d'
\set SOFIA  '44444444-4444-4444-8444-00000000000f'
\set SKILL_A '00000000-0000-4000-8000-000000000201'
\set SKILL_B '00000000-0000-4000-8000-000000000207'
\set SKILL_C '00000000-0000-4000-8000-000000000208'
\set SKILL_D '00000000-0000-4000-8000-000000000202'

-- A shorthand the whole file uses: record one observation.
create or replace function t.observe(
  p_student uuid, p_skill uuid, p_on date, p_state text,
  p_source text default 'parent', p_provenance text default 'human_entered',
  p_note text default 'TEST7P')
returns uuid language plpgsql as $$
declare v_ss uuid; v_id uuid;
begin
  select id into v_ss from public.student_skills
   where student_id = p_student and skill_id = p_skill;
  if v_ss is null then
    insert into public.student_skills (student_id, skill_id, source_type,
             record_provenance, evidence_source, skill_state, created_by)
    values (p_student, p_skill, 'manual', 'human_entered', 'unknown', 'unknown', auth.uid())
    returning id into v_ss;
  end if;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id,
           occurred_on, evidence_note, skill_state, source_type, evidence_source,
           record_provenance, created_by)
  values (v_ss, p_student, p_skill, p_on, p_note,
          nullif(p_state,'')::app.skill_state, 'manual',
          p_source::app.evidence_source, p_provenance::app.record_provenance, auth.uid())
  returning id into v_id;
  return v_id;
end $$;
grant execute on function t.observe(uuid, uuid, date, text, text, text, text) to authenticated;

-- =============================================================================
-- 1. Structure: the axes are separate and nothing numeric arrived
-- =============================================================================

select t.assert_eq(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'evidence_sufficiency'),
  'none,preliminary,supported,corroborated',
  '1a. evidence sufficiency is its own type, with a `none` the strength axis has not');

select t.assert_eq(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'skill_state'),
  'unknown,emerging,developing,secure',
  '1b. no fifth state was introduced');

-- Nothing that could become "your child is at 62%".
select t.assert_eq(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public'
      and table_name in ('student_skills','student_skill_events',
                         'student_skill_overrides','student_skill_evidence_exclusions')
      and (column_name ~ '(score|percent|percentile|mastery|grade_level|grade_equivalent|rank|average|cohort)'
           or (data_type in ('numeric','real','double precision')))),
  0, '1c. no numeric mastery representation exists on any profile table');

select t.assert_eq(
  (select count(*)::int from pg_constraint
    where conrelid = 'public.student_skills'::regclass and contype = 'c'
      and conname in ('student_skills_computed_state_never_secure_ck',
                      'student_skills_override_is_effective_ck')),
  2, '1d. both Phase 3 guarantees are present as named constraints');

-- =============================================================================
-- 2. No evidence is not a verdict
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
                                      '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'computed_state', 'unknown', '2a. no evidence computes unknown');
  perform t.assert_eq(j->>'evidence_sufficiency', 'none', '2b. and sufficiency none');
  perform t.assert_eq(j->>'stored', 'false',
    '2c. and nothing is written - a child we know nothing about needs no row');
  perform t.assert((j->'state_reasons') ? 'no_usable_evidence',
    '2d. and the reason says so in a code, not a sentence');
end $$;
rollback;

-- =============================================================================
-- 3. One observation does not invent mastery
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201', date '2026-09-01', 'secure');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
                                      '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'evidence_sufficiency', 'preliminary',
    '3a. one item is preliminary');
  perform t.assert_eq(j->>'computed_state', 'emerging',
    '3b. and even an observation that says `secure` is held to emerging on one item');
  perform t.assert((j->'state_reasons') ? 'limited_by_sufficiency',
    '3c. and the ceiling is named as the reason');
  perform t.assert((j->'state_reasons') ? 'machine_may_not_determine_secure',
    '3d. and so is the refusal to let a machine decide secure');
end $$;
rollback;

-- =============================================================================
-- 4. Sufficiency and state are independent axes
-- =============================================================================
-- Three items across two occasions from two sources is corroborated evidence.
-- The child is still `developing`, because that is what was observed and
-- because `secure` is not something a computation may conclude.

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','portfolio_artifact');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','parent');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
                                      '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'evidence_sufficiency', 'corroborated', '4a. sufficiency reaches corroborated');
  perform t.assert_eq(j->>'computed_state', 'developing',
    '4b. and the state stays developing - corroborated is how much, not how good');
  perform t.assert_eq(j->>'effective_state', 'developing', '4c. nothing was promoted to secure');
end $$;
rollback;

-- Same evidence count, all one source, all one day: sufficiency stays low.
begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
                                      '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'evidence_sufficiency', 'preliminary',
    '4d. three notes on one afternoon from one source is still one occasion');
  perform t.assert_eq(j->>'computed_state', 'emerging', '4e. and the ceiling holds the state down');
end $$;
rollback;

-- =============================================================================
-- 5. Insertion order cannot change the answer
-- =============================================================================

begin;
do $$
declare a jsonb; b jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  -- forwards on one skill
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','emerging','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','portfolio_artifact');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-05','developing','tutor');
  -- backwards on another
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000207',
                    date '2026-09-05','developing','tutor');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000207',
                    date '2026-09-03','developing','portfolio_artifact');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000207',
                    date '2026-09-01','emerging','parent');

  a := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  b := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000207');

  perform t.assert_eq(a->>'computed_state',       b->>'computed_state',       '5a. same state either way round');
  perform t.assert_eq(a->>'evidence_sufficiency', b->>'evidence_sufficiency', '5b. same sufficiency');
  perform t.assert_eq(a->>'state_as_of',          b->>'state_as_of',          '5c. same as-of date');
  perform t.assert_eq((a->'state_reasons')::text, (b->'state_reasons')::text, '5d. same reasons, in the same order');
  perform t.assert_eq((a->'sufficiency_inputs')::text, (b->'sufficiency_inputs')::text,
    '5e. and the same sufficiency inputs');
end $$;
rollback;

-- =============================================================================
-- 6. Recompute is idempotent
-- =============================================================================

begin;
do $$
declare a jsonb; b jsonb; c jsonb; v_hist_before int; v_hist_after int;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');
  a := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  select count(*)::int into v_hist_before from public.record_history
   where table_name = 'student_skills';
  b := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  c := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  select count(*)::int into v_hist_after from public.record_history
   where table_name = 'student_skills';

  perform t.assert_eq(a->>'computed_state', c->>'computed_state', '6a. third run agrees with the first');
  perform t.assert_eq((a - 'rewritten')::text, (c - 'rewritten')::text,
    '6b. and every field of the answer is identical');
  perform t.assert_eq(b->>'rewritten', 'false', '6c. a re-run with nothing new writes nothing');
  perform t.assert_eq(v_hist_after, v_hist_before,
    '6d. and adds no history rows - a child''s timeline does not fill with non-events');
end $$;
rollback;

-- =============================================================================
-- 7. What may not contribute
-- =============================================================================

-- 7a-b. An unreviewed AI proposal is invisible to the recompute.
begin;
do $$
declare v_ss uuid; j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  insert into public.student_skills (student_id, skill_id, source_type, record_provenance,
           evidence_source, skill_state, created_by)
  values ('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          'manual','human_entered','unknown','unknown', auth.uid())
  returning id into v_ss;
  -- `unknown` is the only state 0083 lets such a row carry, which is the point:
  -- it can sit in a queue and it cannot say anything about the child.
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, occurred_on,
           evidence_note, skill_state, source_type, evidence_source, record_provenance, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          date '2026-09-01','TEST7P machine proposal','unknown','ai_suggestion',
          'diagnostic_session','ai_proposed_unreviewed', auth.uid());

  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'usable_evidence_count', '0', '7a. an unreviewed AI proposal is not usable evidence');
  perform t.assert_eq(j->>'computed_state', 'unknown', '7b. and contributes no state');
  perform t.assert((j->'state_reasons') ? 'excluded_unreviewed_ai_proposal',
    '7c. and the exclusion is explained rather than silent');
end $$;
rollback;

-- 7d-f. Evidence attached to a proposal nobody accepted, and one that was rejected.
begin;
do $$
declare v_ss uuid; v_pending uuid; v_rejected uuid; j jsonb;
begin
  perform t.logout();
  insert into public.ai_suggestions (student_id, kind, source_type, payload, status)
  values ('44444444-4444-4444-8444-00000000000d','update_skill','ai_suggestion','{}'::jsonb,'pending')
  returning id into v_pending;
  insert into public.ai_suggestions (student_id, kind, source_type, payload, status,
           decided_by, decided_at, decision_note)
  values ('44444444-4444-4444-8444-00000000000d','update_skill','ai_suggestion','{}'::jsonb,'rejected',
          '11111111-1111-4111-8111-000000000001', now(), 'TEST7P not what happened')
  returning id into v_rejected;

  perform t.login('11111111-1111-4111-8111-000000000001');
  insert into public.student_skills (student_id, skill_id, source_type, record_provenance,
           evidence_source, skill_state, created_by)
  values ('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          'manual','human_entered','unknown','unknown', auth.uid())
  returning id into v_ss;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, occurred_on,
           evidence_note, skill_state, source_type, evidence_source, record_provenance,
           ai_suggestion_id, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          date '2026-09-01','TEST7P from a pending proposal','developing','ai_suggestion',
          'portfolio_artifact','document_extraction', v_pending, auth.uid()),
         (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          date '2026-09-02','TEST7P from a rejected proposal','developing','ai_suggestion',
          'portfolio_artifact','document_extraction', v_rejected, auth.uid());

  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'usable_evidence_count', '0',
    '7d. an extraction nobody accepted, and one somebody rejected, are both unusable');
  perform t.assert_eq(j->>'computed_state', 'unknown', '7e. so the state stays unknown');
  perform t.assert((j->'state_reasons') ? 'excluded_undecided_ai_proposal',
    '7f. undecided and rejected are reported as different reasons');
  perform t.assert((j->'state_reasons') ? 'excluded_rejected_ai_proposal', '7g. both of them');
end $$;
rollback;

-- 7h-j. The same extraction, once a person has accepted it.
begin;
do $$
declare v_ss uuid; v_ok uuid; j jsonb;
begin
  perform t.logout();
  insert into public.ai_suggestions (student_id, kind, source_type, payload, status,
           applied_record_type, applied_record_id, decided_by, decided_at)
  values ('44444444-4444-4444-8444-00000000000d','update_skill','ai_suggestion','{}'::jsonb,'accepted',
          'student_skills', gen_random_uuid(), '11111111-1111-4111-8111-000000000001', now())
  returning id into v_ok;

  perform t.login('11111111-1111-4111-8111-000000000001');
  insert into public.student_skills (student_id, skill_id, source_type, record_provenance,
           evidence_source, skill_state, created_by)
  values ('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          'manual','human_entered','unknown','unknown', auth.uid())
  returning id into v_ss;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, occurred_on,
           evidence_note, skill_state, source_type, evidence_source, record_provenance,
           ai_suggestion_id, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          date '2026-09-01','TEST7P accepted extraction','developing','ai_suggestion',
          'portfolio_artifact','human_confirmed_ai_proposal', v_ok, auth.uid());

  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'usable_evidence_count', '1',
    '7h. once a person accepts it, the same extraction counts');
  perform t.assert_eq(j->>'computed_state', 'emerging', '7i. at the ceiling one item allows');
end $$;
rollback;

-- 7k-n. A human retracts a piece of evidence, and puts it back.
begin;
do $$
declare v_ev uuid; j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  v_ev := t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'evidence_sufficiency', 'supported', '7k. two occasions is supported');

  j := public.exclude_skill_evidence(v_ev, 'not_about_this_skill', 'TEST7P that was her brother''s');
  perform t.assert_eq(j->>'usable_evidence_count', '1', '7l. a retracted item stops counting');
  perform t.assert_eq(j->>'evidence_sufficiency', 'preliminary', '7m. and sufficiency falls back honestly');
  perform t.assert(
    (select count(*)::int from public.student_skill_events where id = v_ev) = 1,
    '7n. while the event itself is untouched - history is not rewritten');

  j := public.restore_skill_evidence(v_ev);
  perform t.assert_eq(j->>'evidence_sufficiency', 'supported',
    '7o. and a parent can undo her own retraction');
end $$;
rollback;

-- =============================================================================
-- 8. Conflicting evidence never becomes a negative judgment
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'computed_state', 'developing', '8a. two agreeing observations: developing');

  -- a bad afternoon, recorded honestly, arriving last
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-10','emerging','parent');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'computed_state', 'developing',
    '8b. a later, lower observation does not walk the child backwards');
  perform t.assert((j->'state_reasons') ? 'conflicting_assertions_present',
    '8c. the disagreement is surfaced instead of resolved against her');
  perform t.assert(
    (select count(*)::int from public.student_skill_events
      where student_id = '44444444-4444-4444-8444-00000000000d'
        and skill_id = '00000000-0000-4000-8000-000000000201'
        and skill_state = 'emerging') = 1,
    '8d. and the conflicting evidence is preserved in history, not discarded');
end $$;
rollback;

-- =============================================================================
-- 9. A parent's decision outranks the computation and survives it
-- =============================================================================

begin;
do $$
declare j jsonb; v_row public.student_skills;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');

  j := public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
         '00000000-0000-4000-8000-000000000201', 'secure', 'TEST7P she teaches it to her brother');
  perform t.assert_eq(j->>'effective_state', 'secure', '9a. a parent may confirm secure');
  perform t.assert_eq(j->>'computed_state', 'developing',
    '9b. and Nestra''s own characterization is preserved underneath, not erased');
  perform t.assert_eq(j->>'override_active', 'true', '9c. and the decision is marked active');

  -- new evidence that disagrees, then a recompute
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-11','emerging','parent');
  j := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'effective_state', 'secure',
    '9d. a recompute that disagrees with her does not overrule her');

  select * into v_row from public.student_skills
   where student_id = '44444444-4444-4444-8444-00000000000d'
     and skill_id = '00000000-0000-4000-8000-000000000201';
  perform t.assert_eq(v_row.skill_state::text, 'secure', '9e. the stored effective state is hers');
  perform t.assert_eq(v_row.override_state::text, 'secure', '9f. recorded as an override');
  perform t.assert(v_row.computed_state <> 'secure',
    '9g. and the computed state remains something a machine was allowed to produce');
  perform t.assert(v_row.human_confirmed_by is not null,
    '9h. with a named human behind the secure state, as 0082 requires');

  -- both characterizations are answerable
  j := public.explain_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'effective_state', 'secure', '9i. explain: parent has confirmed secure');
  perform t.assert_eq(j->>'computed_state', 'developing', '9j. explain: evidence supports developing');
  perform t.assert_eq(j#>>'{human_decision,sufficiency_at_decision}', 'supported',
    '9k. and it remembers how much Nestra had when she decided');
end $$;
rollback;

-- =============================================================================
-- 10. Changing and releasing a decision
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');

  perform public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
            '00000000-0000-4000-8000-000000000201','secure','TEST7P first');
  j := public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
            '00000000-0000-4000-8000-000000000201','developing','TEST7P on reflection');
  perform t.assert_eq(j->>'effective_state','developing','10a. she may change her mind');
  perform t.assert_eq(
    (select count(*)::int from public.student_skill_overrides
      where student_id='44444444-4444-4444-8444-00000000000d'
        and skill_id='00000000-0000-4000-8000-000000000201' and status='superseded'),
    1, '10b. and the earlier decision is superseded, not deleted');
  perform t.assert_eq(
    (select count(*)::int from public.student_skill_overrides
      where student_id='44444444-4444-4444-8444-00000000000d'
        and skill_id='00000000-0000-4000-8000-000000000201' and status='active'),
    1, '10c. with exactly one decision in force');

  j := public.release_skill_state_override('44444444-4444-4444-8444-00000000000d',
            '00000000-0000-4000-8000-000000000201','TEST7P letting Nestra speak');
  perform t.assert_eq(j->>'override_active','false','10d. and she may hand the question back');
  perform t.assert_eq(j->>'effective_state','developing',
    '10e. after which the evidence-based characterization is what shows');
  perform t.assert_eq(
    (select count(*)::int from public.student_skill_overrides
      where student_id='44444444-4444-4444-8444-00000000000d'
        and skill_id='00000000-0000-4000-8000-000000000201'),
    2, '10f. both decisions remain on the record');
end $$;
rollback;

-- A decision, once made, cannot be quietly edited into a different one.
begin;
do $$
declare v_id uuid; v_failed boolean := false;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
            '00000000-0000-4000-8000-000000000201','secure','TEST7P');
  select id into v_id from public.student_skill_overrides
   where student_id='44444444-4444-4444-8444-00000000000d' and status='active';
  begin
    update public.student_skill_overrides set decided_state='emerging' where id=v_id;
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed, '10g. what a person decided cannot be edited afterwards');

  -- Two layers, and they refuse differently. There is no DELETE policy, so for
  -- a parent the statement matches nothing and raises nothing; the row simply
  -- survives. Behind RLS the trigger refuses outright. Asserting only the
  -- exception would have passed for the wrong reason on one layer and missed
  -- the other entirely.
  delete from public.student_skill_overrides where id = v_id;
  perform t.assert_eq(
    (select count(*)::int from public.student_skill_overrides where id = v_id), 1,
    '10h. a parent cannot delete a decision - there is no policy that allows it');

  perform t.logout();
  v_failed := false;
  begin
    delete from public.student_skill_overrides where id = v_id;
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed,
    '10i. and behind RLS the trigger refuses too - a decision is released, never erased');
end $$;
rollback;

-- =============================================================================
-- 11. Authorization
-- =============================================================================

begin;
do $$
declare v_failed boolean := false;
begin
  -- Pedro is Lucas's father with view_only access.
  perform t.login('11111111-1111-4111-8111-000000000002');
  begin
    perform public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
              '00000000-0000-4000-8000-000000000201','secure','TEST7P');
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed, '11a. a view-only guardian cannot decide a skill state');

  v_failed := false;
  begin
    perform public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
              '00000000-0000-4000-8000-000000000201');
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed, '11b. nor trigger a recompute that would write to the profile');

  -- but he may still ask what Nestra thinks
  perform t.assert(
    public.explain_student_skill('44444444-4444-4444-8444-00000000000d',
      '00000000-0000-4000-8000-000000000201') ? 'computed_state',
    '11c. while remaining able to read the explanation');
end $$;
rollback;

-- One family cannot reach another.
begin;
do $$
declare v_failed boolean := false; j jsonb;
begin
  -- Diego is Sofia's father and nothing to Lucas.
  perform t.login('11111111-1111-4111-8111-000000000003');
  begin
    perform public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
              '00000000-0000-4000-8000-000000000201','secure','TEST7P intrusion');
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed, '11d. another family''s parent cannot decide anything about Lucas');

  v_failed := false;
  begin
    perform public.explain_student_skill('44444444-4444-4444-8444-00000000000d',
              '00000000-0000-4000-8000-000000000201');
  exception when others then v_failed := true;
  end;
  perform t.assert(v_failed, '11e. nor read his profile');

  perform t.assert_eq(
    (select count(*)::int from public.student_skill_profile
      where student_id = '44444444-4444-4444-8444-00000000000d'),
    0, '11f. and the profile view shows him none of Lucas''s rows');

  -- his own child is fine
  j := public.set_skill_state_override('44444444-4444-4444-8444-00000000000f',
         '00000000-0000-4000-8000-000000000201','emerging','TEST7P his own child');
  perform t.assert_eq(j->>'effective_state','emerging','11g. while his own child is his to decide about');
end $$;
rollback;

-- =============================================================================
-- 12. A machine may not reach secure, by any route
-- =============================================================================

begin;
do $$
declare v_failed boolean := false;
begin
  perform t.logout();
  perform t.assert(
    (select count(*)::int from public.student_skills where computed_state = 'secure') = 0,
    '12a. no computed state anywhere is secure');
  begin
    insert into public.student_skills (student_id, skill_id, source_type, record_provenance,
             evidence_source, skill_state, computed_state)
    values ('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000202',
            'system_calculation','system_computed','unknown','unknown','secure');
  exception when check_violation then v_failed := true;
  end;
  perform t.assert(v_failed, '12b. and the column refuses to hold it');
end $$;
rollback;

-- The effective state cannot be walked away from an active decision.
begin;
do $$
declare v_failed boolean := false; v_id uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform public.set_skill_state_override('44444444-4444-4444-8444-00000000000d',
            '00000000-0000-4000-8000-000000000201','secure','TEST7P');
  begin
    update public.student_skills set skill_state = 'developing'
     where student_id='44444444-4444-4444-8444-00000000000d'
       and skill_id='00000000-0000-4000-8000-000000000201';
  exception when check_violation then v_failed := true;
  end;
  perform t.assert(v_failed,
    '12c. with a decision in force, the effective state cannot be set to anything else');
end $$;
rollback;

-- =============================================================================
-- 13. The recompute cannot see the standards catalogue
-- =============================================================================
-- Two arms. The first hides the catalogue outright: if any part of the path
-- named it, the call would raise instead of returning. The second adds and
-- removes a mapping and compares the answers.

begin;
do $$
declare a jsonb; b jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');
  a := public.explain_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq((select count(*)::int from public.standards), 184,
    '13a. arm A runs with all 184 published benchmarks present');

  perform t.logout();
  alter table public.standards      rename to standards_hidden_for_test;
  alter table public.skill_standards rename to skill_standards_hidden_for_test;

  perform t.login('11111111-1111-4111-8111-000000000001');
  b := public.explain_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  perform t.assert_eq(a->>'computed_state',            b->>'computed_state',            '13b. same state with the catalogue gone');
  perform t.assert_eq(a->>'evidence_sufficiency',      b->>'evidence_sufficiency',      '13c. same sufficiency');
  perform t.assert_eq(a->>'effective_state',           b->>'effective_state',           '13d. same effective state');
  perform t.assert_eq((a->'state_reasons')::text,      (b->'state_reasons')::text,      '13e. same reasons');
  perform t.assert_eq((a->'state_evidence_ids')::text, (b->'state_evidence_ids')::text, '13f. same evidence cited');
  perform t.assert_eq((a->'sufficiency_inputs')::text, (b->'sufficiency_inputs')::text, '13g. same sufficiency inputs');
end $$;
rollback;

begin;
do $$
declare a jsonb; b jsonb; c jsonb; v_map uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-03','developing','tutor');
  a := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  perform t.logout();
  insert into public.skill_standards (skill_id, standard_id, relation, created_by)
  select '00000000-0000-4000-8000-000000000201', s.id, 'exact',
         '11111111-1111-4111-8111-000000000001'
    from public.standards s limit 1
  returning id into v_map;

  perform t.login('11111111-1111-4111-8111-000000000001');
  b := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  perform t.logout();
  delete from public.skill_standards where id = v_map;
  perform t.login('11111111-1111-4111-8111-000000000001');
  c := public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  perform t.assert_eq((a - 'rewritten')::text, (b - 'rewritten')::text,
    '13h. mapping a skill to a benchmark changes nothing about the child''s state');
  perform t.assert_eq((b - 'rewritten')::text, (c - 'rewritten')::text,
    '13i. and removing the mapping changes nothing back');
  perform t.assert_eq(b->>'rewritten', 'false',
    '13j. the mapping did not even make the profile worth rewriting');
end $$;
rollback;

-- =============================================================================
-- 14. Nothing here compares one child to another
-- =============================================================================

select t.assert_eq(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app','public')
      and p.proname ~ '(percentile|cohort|grade_equivalent|class_rank|peer_compar|on_track|behind_ahead)'),
  0, '14a. no function ranks or compares children');

select t.assert_eq(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('app','public') and c.relkind in ('r','v','m')
      and c.relname ~ '(percentile|cohort|grade_equivalent|class_rank|peer_compar|on_track|behind_ahead)'),
  0, '14b. and no table, view or materialized view holds such a thing');

-- The profile view is one child's row and cannot become a leaderboard.
select t.assert(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('app','public')
      and p.proname in ('compute_skill_state','classified_skill_evidence',
                        'recompute_student_skill','explain_student_skill')
      and p.prosrc ~ '\m(percentile_cont|percentile_disc|cume_dist|ntile|dense_rank)\M') = 0,
  '14c. and the state path uses no ranking function');

-- =============================================================================
-- 15. The rule version is recorded
-- =============================================================================

begin;
do $$
declare v_row public.student_skills;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.observe('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
                    date '2026-09-01','developing','parent');
  perform public.recompute_student_skill('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  select * into v_row from public.student_skills
   where student_id='44444444-4444-4444-8444-00000000000d'
     and skill_id='00000000-0000-4000-8000-000000000201';
  perform t.assert_eq(v_row.recompute_rule_version, app.recompute_rule_version(),
    '15a. every state carries the rules that produced it');
  perform t.assert(v_row.computed_at is not null, '15b. and when they were applied');
  perform t.assert(v_row.state_as_of is not null,
    '15c. and the date of the evidence it rests on - a state with no date is a claim about forever');
  perform t.assert(array_length(v_row.state_evidence_ids, 1) >= 1,
    '15d. and the evidence itself, resolvable');
end $$;
rollback;

-- =============================================================================
-- 16. STEP 6 and the phase 1-2 guarantees are still intact
-- =============================================================================

select t.assert_eq((select count(*)::int from public.standards), 184,
  '16a. the published catalogue is unchanged');
select t.assert_eq((select count(*)::int from public.skill_standards), 0,
  '16b. no skill acquired a mapping');
select t.assert_eq((select count(*)::int from public.skill_prerequisites
                     where source_type in ('import','ai_suggestion')), 0,
  '16c. no prerequisite was created');
select t.assert(
  (select tgenabled from pg_trigger
    where tgrelid = 'public.student_skill_events'::regclass
      and tgname = 'student_skill_events_append_only') <> 'D',
  '16d. the append-only trigger is still enabled');
