-- =============================================================================
-- 0087  Citing the evidence that supports the answer, not the evidence that
--       lost to the ceiling
-- =============================================================================
-- 0085 picked `state_evidence_ids` and `state_as_of` from the observations at
-- the OBSERVED level - the highest anything asserted - and then capped the state
-- separately. When the cap bites, those two things come apart, and the
-- explanation contradicts itself:
--
--   evidence:  Sep 1 "secure" · Sep 3 "developing" · Sep 5 "developing"
--   computed:  developing (capped from secure by sufficiency)
--   cited:     the Sep 1 row alone
--   as_of:     2026-09-01
--
-- So a parent asking "why developing?" was shown one observation that did not
-- say `developing`, dated four days before the most recent one that did. The
-- state was right and the answer for it was wrong, which for an explainability
-- feature is the whole failure.
--
-- Found by the managed deployment probe, which prints as_of next to the state.
-- Every local assertion still passed: the tests checked that as_of was NOT NULL
-- and that two orderings agreed, and both remained true of the wrong date.
--
-- The citation is now every usable observation that supports the state in force
-- or better, and the as-of is the most recent of those. When nothing is capped
-- this is identical to the old behaviour; when something is capped it is the
-- answer to the question actually being asked.
--
-- The rule version moves with it. The state values do not change, but the
-- evidence a row cites does, and a row that cites different evidence under the
-- same version number would be untraceable.
-- =============================================================================

create or replace function app.recompute_rule_version()
returns text language sql immutable set search_path = '' as $fn$
  select '2026-09-09.2'::text;
$fn$;

create or replace function app.compute_skill_state(p_student uuid, p_skill uuid)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $fn$
declare
  v_n int; v_occasions int; v_sources int; v_human int;
  v_unreviewed int; v_undecided int; v_rejected int; v_retracted int;
  v_asserting int; v_distinct int;
  v_suff app.evidence_sufficiency;
  v_cap app.skill_state; v_observed app.skill_state; v_computed app.skill_state;
  v_as_of date; v_ids uuid[] := '{}';
  v_reasons app.state_reason_code[] := '{}';
begin
  select
    count(*) filter (where c.klass = 'usable'),
    count(distinct c.occurred_on) filter (where c.klass = 'usable'),
    count(distinct c.source) filter (where c.klass = 'usable' and c.source <> 'unknown'),
    count(*) filter (where c.klass = 'usable'
                       and c.provenance in ('human_entered', 'human_confirmed_ai_proposal')),
    count(*) filter (where c.klass = 'unreviewed'),
    count(*) filter (where c.klass = 'undecided'),
    count(*) filter (where c.klass = 'rejected'),
    count(*) filter (where c.klass = 'retracted'),
    count(*) filter (where c.klass = 'usable' and c.asserted is not null and c.asserted <> 'unknown'),
    count(distinct c.asserted) filter (where c.klass = 'usable' and c.asserted is not null and c.asserted <> 'unknown')
  into v_n, v_occasions, v_sources, v_human, v_unreviewed, v_undecided, v_rejected,
       v_retracted, v_asserting, v_distinct
  from app.classified_skill_evidence(p_student, p_skill) c;

  v_suff := case
    when v_n >= 3 and v_occasions >= 2 and v_sources >= 2 and v_human >= 1 then 'corroborated'
    when v_n >= 2 and v_occasions >= 2                                     then 'supported'
    when v_n >= 1                                                          then 'preliminary'
    else 'none' end::app.evidence_sufficiency;

  v_cap := case v_suff
    when 'none'         then 'unknown'
    when 'preliminary'  then 'emerging'
    when 'supported'    then 'developing'
    when 'corroborated' then 'developing'
    end::app.skill_state;

  select max(c.asserted) into v_observed
    from app.classified_skill_evidence(p_student, p_skill) c
   where c.klass = 'usable' and c.asserted is not null and c.asserted <> 'unknown';

  v_computed := case when v_observed is null then 'unknown'::app.skill_state
                     else least(v_observed, v_cap) end;

  -- Every usable observation that supports the answer or better, and the most
  -- recent of them. Ordered by id so two runs cite the same list in the same
  -- order and idempotence stays a comparison.
  if v_observed is not null then
    select max(c.occurred_on), array_agg(c.event_id order by c.event_id)
      into v_as_of, v_ids
      from app.classified_skill_evidence(p_student, p_skill) c
     where c.klass = 'usable' and c.asserted is not null and c.asserted <> 'unknown'
       and c.asserted >= v_computed;
  end if;

  if v_n = 0                       then v_reasons := v_reasons || 'no_usable_evidence'::app.state_reason_code; end if;
  if v_n > 0 and v_asserting = 0   then v_reasons := v_reasons || 'evidence_present_but_no_state_asserted'::app.state_reason_code; end if;
  if v_asserting > 0               then v_reasons := v_reasons || 'governed_by_strongest_observation'::app.state_reason_code; end if;
  if v_observed is not null and v_observed > v_cap
                                   then v_reasons := v_reasons || 'limited_by_sufficiency'::app.state_reason_code; end if;
  if v_observed = 'secure'         then v_reasons := v_reasons || 'machine_may_not_determine_secure'::app.state_reason_code; end if;
  if v_distinct > 1                then v_reasons := v_reasons || 'conflicting_assertions_present'::app.state_reason_code; end if;
  if v_unreviewed > 0              then v_reasons := v_reasons || 'excluded_unreviewed_ai_proposal'::app.state_reason_code; end if;
  if v_undecided > 0               then v_reasons := v_reasons || 'excluded_undecided_ai_proposal'::app.state_reason_code; end if;
  if v_rejected > 0                then v_reasons := v_reasons || 'excluded_rejected_ai_proposal'::app.state_reason_code; end if;
  if v_retracted > 0               then v_reasons := v_reasons || 'excluded_by_human_retraction'::app.state_reason_code; end if;

  return jsonb_build_object(
    'rule_version',          app.recompute_rule_version(),
    'computed_state',        v_computed::text,
    'evidence_sufficiency',  v_suff::text,
    'usable_evidence_count', v_n,
    'state_as_of',           v_as_of,
    'state_evidence_ids',    to_jsonb(coalesce(v_ids, '{}'::uuid[])),
    'state_reasons',         to_jsonb(array(select r from unnest(v_reasons) r order by r)),
    'sufficiency_inputs',    jsonb_build_object(
        'usable', v_n, 'occasions', v_occasions, 'distinct_sources', v_sources,
        'human_entered_or_confirmed', v_human, 'asserting', v_asserting,
        'distinct_assertions', v_distinct),
    'excluded',              jsonb_build_object(
        'unreviewed_ai', v_unreviewed, 'undecided_ai', v_undecided,
        'rejected_ai', v_rejected, 'human_retracted', v_retracted));
end $fn$;

revoke all on function app.recompute_rule_version() from public, anon;
revoke all on function app.compute_skill_state(uuid, uuid) from public, anon;
grant execute on function app.recompute_rule_version() to authenticated, service_role;
grant execute on function app.compute_skill_state(uuid, uuid) to authenticated, service_role;

select app.assert_schema_invariants();
