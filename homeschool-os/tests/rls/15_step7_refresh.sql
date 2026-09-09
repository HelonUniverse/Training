-- =============================================================================
-- STEP 7 phase 4 - the revisit advisory, and everything it must not touch
-- =============================================================================
-- Every destructive block is rolled back. Rows are marked P4.
--
-- The test that matters most is 9: the profile row is byte-identical before and
-- after every refresh call in the file. A suggestion that can move a state is
-- not a suggestion, and this is the assertion that would fail if it ever could.
-- =============================================================================

\set CARLA  '11111111-1111-4111-8111-000000000001'
\set PEDRO  '11111111-1111-4111-8111-000000000002'
\set DIEGO  '11111111-1111-4111-8111-000000000003'
\set LUCAS  '44444444-4444-4444-8444-00000000000d'
\set SOFIA  '44444444-4444-4444-8444-00000000000f'
\set FAM_M  '22222222-2222-4222-8222-00000000000a'
\set FAM_R  '22222222-2222-4222-8222-00000000000b'
\set SKILL  '00000000-0000-4000-8000-000000000201'
\set SKILL2 '00000000-0000-4000-8000-000000000207'

-- A child who was confirmed secure a long time ago, on real evidence.
-- The override is inserted directly with a past decided_at: it is frozen after
-- the fact, so a decision made 300 days ago cannot be simulated by editing one
-- made today.
create or replace function t.p4_secure_since(
  p_student uuid, p_skill uuid, p_actor uuid, p_days int)
returns uuid language plpgsql as $$
declare v_ss uuid; v_ov uuid; v_org uuid;
begin
  select primary_organization_id into v_org from public.students where id = p_student;
  insert into public.student_skills (student_id, skill_id, organization_id, source_type,
      record_provenance, evidence_source, skill_state, created_by)
  values (p_student, p_skill, v_org, 'manual','human_entered','unknown','unknown', p_actor)
  returning id into v_ss;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, organization_id,
      occurred_on, evidence_note, skill_state, source_type, evidence_source, record_provenance, created_by)
  values (v_ss, p_student, p_skill, v_org, current_date - p_days - 20, 'P4','developing','manual','parent','human_entered', p_actor),
         (v_ss, p_student, p_skill, v_org, current_date - p_days - 10, 'P4','developing','manual','tutor','human_entered', p_actor),
         (v_ss, p_student, p_skill, v_org, current_date - p_days - 5,  'P4','developing','manual','portfolio_artifact','human_entered', p_actor);
  perform t.login(p_actor);
  perform public.recompute_student_skill(p_student, p_skill);
  perform t.logout();
  insert into public.student_skill_overrides (student_skill_id, student_id, skill_id, organization_id,
      decided_state, note, prior_computed_state, prior_effective_state, sufficiency_at_decision,
      usable_evidence_count, evidence_source, record_provenance, status, decided_by, decided_at)
  values (v_ss, p_student, p_skill, v_org, 'secure','P4','developing','developing','corroborated',
          3,'parent','human_entered','active', p_actor, now() - make_interval(days => p_days))
  returning id into v_ov;
  update public.student_skills set active_override_id = v_ov, override_state = 'secure',
         skill_state = 'secure', human_confirmed_by = p_actor,
         human_confirmed_at = now() - make_interval(days => p_days)
   where id = v_ss;
  return v_ss;
end $$;

create or replace function t.p4_goal(p_student uuid, p_skill uuid, p_actor uuid)
returns void language plpgsql as $$
declare v_org uuid;
begin
  select primary_organization_id into v_org from public.students where id = p_student;
  insert into public.learning_goals (student_id, organization_id, skill_id, title, status,
      source_type, approved_by, created_by)
  values (p_student, v_org, p_skill, 'P4 keep this alive', 'active', 'parent', p_actor, p_actor);
end $$;

grant execute on function t.p4_secure_since(uuid, uuid, uuid, int) to authenticated;
grant execute on function t.p4_goal(uuid, uuid, uuid) to authenticated;

-- =============================================================================
-- 1. Off for everybody, including families that already existed
-- =============================================================================

select t.assert_eq((select count(*)::int from public.families where refresh_advisory_enabled), 0,
  '1a. no family has revisit suggestions switched on');
select t.assert_eq((select count(distinct refresh_interval_days)::int from public.families), 1,
  '1b. and they all carry the same starting interval');
select t.assert_eq((select distinct refresh_interval_days from public.families), 180,
  '1c. which is 180 days');

begin;
do $$
declare j jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '1d. a brand-new family is suggested nothing at all');
  perform t.assert((j->'blocked_by') ? 'family_has_not_enabled_it',
    '1e. and is told the feature is simply off, not that anything is wrong');
end $$;
rollback;

-- =============================================================================
-- 2. Time alone produces nothing
-- =============================================================================
-- Evidence from nearly a year ago, and every other condition unmet.

begin;
do $$
declare j jsonb;
begin
  perform t.logout();
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert(( j->>'days_since_anchor')::int >= 300,
    '2a. three hundred days have genuinely elapsed');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '2b. and on their own they produce nothing');
  perform t.assert((j->'blocked_by') ? 'family_has_not_enabled_it', '2c. the family has not enabled it');
  perform t.assert((j->'blocked_by') ? 'no_current_relevance',     '2d. and nothing makes it relevant');
end $$;
rollback;

-- =============================================================================
-- 3. Only a human-confirmed `secure` is eligible
-- =============================================================================

begin;
do $$
declare v_ss uuid; j jsonb; v_org uuid;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  select primary_organization_id into v_org from public.students
   where id = '44444444-4444-4444-8444-00000000000d';
  insert into public.student_skills (student_id, skill_id, organization_id, source_type,
      record_provenance, evidence_source, skill_state, created_by)
  values ('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          v_org,'manual','human_entered','unknown','unknown','11111111-1111-4111-8111-000000000001')
  returning id into v_ss;
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, organization_id,
      occurred_on, evidence_note, skill_state, source_type, evidence_source, record_provenance, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          v_org, current_date - 320,'P4','developing','manual','parent','human_entered','11111111-1111-4111-8111-000000000001'),
         (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          v_org, current_date - 310,'P4','developing','manual','tutor','human_entered','11111111-1111-4111-8111-000000000001');
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');
  perform public.recompute_student_skill('44444444-4444-4444-8444-00000000000d',
                                         '00000000-0000-4000-8000-000000000201');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'effective_state','developing','3a. the skill is developing');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '3b. enabled, relevant and long overdue by the clock - and still nothing, because nobody confirmed it secure');
  perform t.assert((j->'blocked_by') ? 'not_human_confirmed_secure', '3c. and that is the stated reason');
end $$;
rollback;

-- =============================================================================
-- 4. Relevance is required, and comes only from what this family is doing
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.login('11111111-1111-4111-8111-000000000001');

  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '4a. secure, enabled and elapsed, but nothing in this family points at the skill');
  perform t.assert((j->'blocked_by') ? 'no_current_relevance', '4b. so no suggestion');

  perform t.logout();
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','true',
    '4c. an active goal a person set makes it relevant, and now it suggests');
  perform t.assert((j->'relevance') ? 'active_learning_goal', '4d. naming the goal as the reason');
  perform t.assert_eq(j->>'effective_state','secure',
    '4e. and the child is still secure while it suggests');
end $$;
rollback;

-- =============================================================================
-- 5. The interval, and only after everything else
-- =============================================================================

begin;
do $$
declare j jsonb;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 30);
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '5a. everything true except the interval - confirmed only 30 days ago');
  perform t.assert((j->'blocked_by') ? 'interval_has_not_elapsed', '5b. and that is why');
end $$;
rollback;

-- =============================================================================
-- 6. New usable evidence clears it; an unreviewed proposal does not
-- =============================================================================

begin;
do $$
declare v_ss uuid; j jsonb; v_org uuid;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  v_ss := t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  select primary_organization_id into v_org from public.students
   where id = '44444444-4444-4444-8444-00000000000d';
  perform t.login('11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','true','6a. suggesting a revisit');

  -- a machine proposal, today. It must not make the skill look recently seen.
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, organization_id,
      occurred_on, evidence_note, skill_state, source_type, evidence_source, record_provenance, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          v_org, current_date,'P4 machine','unknown','ai_suggestion','diagnostic_session',
          'ai_proposed_unreviewed','11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','true',
    '6b. an unreviewed AI proposal dated today does not reset the clock');
  perform t.assert((j->>'days_since_anchor')::int >= 300, '6c. the anchor did not move');

  -- a real observation, today
  insert into public.student_skill_events (student_skill_id, student_id, skill_id, organization_id,
      occurred_on, evidence_note, skill_state, source_type, evidence_source, record_provenance, created_by)
  values (v_ss,'44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201',
          v_org, current_date,'P4 she did it today','developing','manual','parent',
          'human_entered','11111111-1111-4111-8111-000000000001');
  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '6d. evidence a person recorded today clears the suggestion');
  perform t.assert_eq((j->>'days_since_anchor')::int, 0, '6e. the anchor moved to today');
end $$;
rollback;

-- =============================================================================
-- 7. Dismissal: keeps the state, and does not ask again tomorrow
-- =============================================================================

begin;
do $$
declare j jsonb; before text; after text;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');

  select ss.skill_state::text into before from public.student_skills ss
   where ss.student_id = '44444444-4444-4444-8444-00000000000d'
     and ss.skill_id = '00000000-0000-4000-8000-000000000201';

  j := public.dismiss_skill_refresh('44444444-4444-4444-8444-00000000000d',
        '00000000-0000-4000-8000-000000000201','P4 not this week');
  perform t.assert_eq(j->>'refresh_suggested','false','7a. dismissed');

  select ss.skill_state::text into after from public.student_skills ss
   where ss.student_id = '44444444-4444-4444-8444-00000000000d'
     and ss.skill_id = '00000000-0000-4000-8000-000000000201';
  perform t.assert_eq(after, before, '7b. and the child is exactly as secure as before');
  perform t.assert_eq(after, 'secure', '7c. which is to say: secure');

  j := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
                                    '00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(j->>'refresh_suggested','false',
    '7d. asked again immediately, from unchanged conditions, it stays quiet');
  perform t.assert((j->'blocked_by') ? 'recently_dismissed',
    '7e. and says so - this is a dismissal, not a coincidence');
end $$;
rollback;

-- =============================================================================
-- 8. A parent may ask for a revisit herself
-- =============================================================================

begin;
do $$
declare j jsonb; before text; after text;
begin
  perform t.logout();
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 10);
  perform t.login('11111111-1111-4111-8111-000000000001');

  select ss.skill_state::text||'|'||ss.computed_state::text||'|'||ss.evidence_sufficiency::text
    into before from public.student_skills ss
   where ss.student_id = '44444444-4444-4444-8444-00000000000d'
     and ss.skill_id = '00000000-0000-4000-8000-000000000201';

  j := public.request_skill_revisit('44444444-4444-4444-8444-00000000000d',
        '00000000-0000-4000-8000-000000000201','P4 I want to go over this');
  perform t.assert_eq(j->>'refresh_suggested','true',
    '8a. she asked, so it surfaces - with the feature off and the interval nowhere near elapsed');
  perform t.assert_eq(j->>'requested_by_parent','true',
    '8b. and it is marked as hers, not as something Nestra concluded');
  perform t.assert((j->'relevance') ? 'parent_requested', '8c. her asking is the relevance');

  select ss.skill_state::text||'|'||ss.computed_state::text||'|'||ss.evidence_sufficiency::text
    into after from public.student_skills ss
   where ss.student_id = '44444444-4444-4444-8444-00000000000d'
     and ss.skill_id = '00000000-0000-4000-8000-000000000201';
  perform t.assert_eq(after, before, '8d. and nothing about the characterization moved');
end $$;
rollback;

-- =============================================================================
-- 9. THE ONE THAT MATTERS: the advisory cannot touch the profile
-- =============================================================================

begin;
do $$
declare v_ss uuid; before text; after text; j jsonb;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  v_ss := t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');

  select ss::text into before from public.student_skills ss where ss.id = v_ss;

  perform public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform public.dismiss_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201','P4');
  perform public.request_skill_revisit('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201','P4');
  perform public.complete_skill_revisit('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201','P4');
  perform public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  select ss::text into after from public.student_skills ss where ss.id = v_ss;
  perform t.assert_eq(after, before,
    '9a. every refresh call in sequence, and the profile row is byte-identical');
end $$;
rollback;

-- The structural version of the same claim: the invariant refuses a refresh
-- function that learns to write to the profile.
begin;
do $$
declare v_err text;
begin
  create or replace function app.refresh_advisory(p_student uuid, p_skill uuid)
  returns jsonb language plpgsql set search_path = '' as $bad$
  begin
    update public.student_skills set skill_state = 'developing'
     where student_id = p_student and skill_id = p_skill;
    return '{}'::jsonb;
  end $bad$;
  begin
    perform app.assert_schema_invariants();
    v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED';
  end;
  perform t.assert_eq(v_err, 'REFUSED',
    '9b. a refresh function that writes to the profile fails the invariants');
end $$;
rollback;

begin;
do $$
declare v_err text;
begin
  create or replace function app.skill_relevance_reasons(p_student uuid, p_skill uuid)
  returns app.refresh_relevance_reason[] language sql set search_path = '' as $bad$
    select case when exists (select 1 from public.standards) then '{}'::app.refresh_relevance_reason[]
           else '{}'::app.refresh_relevance_reason[] end;
  $bad$;
  begin
    perform app.assert_schema_invariants();
    v_err := 'NO ERROR';
  exception when others then v_err := 'REFUSED';
  end;
  perform t.assert_eq(v_err, 'REFUSED',
    '9c. and relevance that reads the standards catalogue fails them too');
end $$;
rollback;

-- =============================================================================
-- 10. One family cannot reach another
-- =============================================================================

begin;
do $$
declare ok boolean; j jsonb;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);

  perform t.assert_eq(
    (select refresh_advisory_enabled from public.families where id = '22222222-2222-4222-8222-00000000000b'),
    false, '10a. enabling one family enables only that family');

  perform t.login('11111111-1111-4111-8111-000000000003');   -- Diego, another family
  ok := false;
  begin perform public.dismiss_skill_refresh('44444444-4444-4444-8444-00000000000d',
          '00000000-0000-4000-8000-000000000201','P4'); exception when others then ok := true; end;
  perform t.assert(ok, '10b. another family''s parent cannot dismiss anything about Lucas');
  ok := false;
  begin perform public.request_skill_revisit('44444444-4444-4444-8444-00000000000d',
          '00000000-0000-4000-8000-000000000201','P4'); exception when others then ok := true; end;
  perform t.assert(ok, '10c. nor request a revisit for him');
  ok := false;
  begin perform public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
          '00000000-0000-4000-8000-000000000201'); exception when others then ok := true; end;
  perform t.assert(ok, '10d. nor read the advisory');
  perform t.assert_eq(
    (select count(*)::int from public.student_skill_refresh_decisions
      where student_id = '44444444-4444-4444-8444-00000000000d'),
    0, '10e. and sees none of his decisions');

  -- a view-only guardian may look, not decide
  perform t.logout();
  perform t.login('11111111-1111-4111-8111-000000000002');   -- Pedro, view_only
  perform t.assert(public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d',
      '00000000-0000-4000-8000-000000000201') ? 'refresh_suggested',
    '10f. a view-only guardian may read the advisory');
  ok := false;
  begin perform public.dismiss_skill_refresh('44444444-4444-4444-8444-00000000000d',
          '00000000-0000-4000-8000-000000000201','P4'); exception when others then ok := true; end;
  perform t.assert(ok, '10g. but may not dismiss it');
end $$;
rollback;

-- =============================================================================
-- 11. Standards independence - four arms, one answer
-- =============================================================================

begin;
do $$
declare a jsonb; b jsonb; c jsonb; d jsonb; v_map uuid;
begin
  perform t.logout();
  update public.families set refresh_advisory_enabled = true
   where id = '22222222-2222-4222-8222-00000000000a';
  perform t.p4_secure_since('44444444-4444-4444-8444-00000000000d',
    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001', 300);
  perform t.p4_goal('44444444-4444-4444-8444-00000000000d',
                    '00000000-0000-4000-8000-000000000201','11111111-1111-4111-8111-000000000001');
  perform t.login('11111111-1111-4111-8111-000000000001');

  a := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');
  perform t.assert_eq(a->>'refresh_suggested','true','11a. arm A: 184 benchmarks present, suggestion stands');

  -- arm B: a mapping exists
  perform t.logout();
  insert into public.skill_standards (skill_id, standard_id, relation, created_by)
  select '00000000-0000-4000-8000-000000000201', s.id, 'exact','11111111-1111-4111-8111-000000000001'
    from public.standards s limit 1 returning id into v_map;
  perform t.login('11111111-1111-4111-8111-000000000001');
  b := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  -- arm C: the mapping is gone again
  perform t.logout();
  delete from public.skill_standards where id = v_map;
  perform t.login('11111111-1111-4111-8111-000000000001');
  c := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  -- arm D: the catalogue is not there at all
  perform t.logout();
  alter table public.standards       rename to standards_hidden_p4;
  alter table public.skill_standards rename to skill_standards_hidden_p4;
  perform t.login('11111111-1111-4111-8111-000000000001');
  d := public.explain_skill_refresh('44444444-4444-4444-8444-00000000000d','00000000-0000-4000-8000-000000000201');

  perform t.assert_eq(a::text, b::text, '11b. adding a benchmark mapping changes nothing');
  perform t.assert_eq(b::text, c::text, '11c. removing it changes nothing back');
  perform t.assert_eq(c::text, d::text, '11d. and with the catalogue gone the answer is identical');
end $$;
rollback;

-- =============================================================================
-- 12. Nothing became a state, and nothing became a number
-- =============================================================================

select t.assert_eq(
  (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
     from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'skill_state'),
  'unknown,emerging,developing,secure',
  '12a. refresh_suggested did not become a fifth skill state');

select t.assert_eq(
  (select count(*)::int from pg_enum e join pg_type ty on ty.oid = e.enumtypid
     join pg_namespace n on n.oid = ty.typnamespace
    where n.nspname = 'app' and ty.typname = 'skill_state'
      and e.enumlabel ~* 'refresh'),
  0, '12b. and cannot be found among its labels');

select t.assert_eq(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'student_skill_refresh_decisions'
      and (column_name ~ '(score|percent|mastery|grade_level|rank|average|cohort)'
           or data_type in ('numeric','real','double precision'))),
  0, '12c. and no numeric mastery representation arrived with it');

select t.assert_eq(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'student_skills'
      and column_name ~ 'refresh'),
  0, '12d. and no refresh column was added to the profile row itself');

-- =============================================================================
-- 13. STEP 6 and the earlier phases are untouched
-- =============================================================================

select t.assert_eq((select count(*)::int from public.standards), 184,
  '13a. the published catalogue is unchanged');
select t.assert_eq((select count(*)::int from public.skill_standards), 0,
  '13b. no skill acquired a mapping');
select t.assert(
  (select tgenabled from pg_trigger
    where tgrelid = 'public.student_skill_events'::regclass
      and tgname = 'student_skill_events_append_only') <> 'D',
  '13c. the append-only trigger is still enabled');
