-- =============================================================================
-- 0085  The recompute: deterministic, explainable, and unable to outrank a
--       person
-- =============================================================================
-- One path computes a skill state. It is a pure function of stored evidence
-- plus the rules written here, it produces the reasons alongside the answer,
-- and it never runs a model.
--
-- WHAT THE RULES ARE, in full, because a rule that lives only in code is a rule
-- nobody can disagree with:
--
-- USABLE EVIDENCE. An event counts unless one of these is true:
--   - its provenance is `ai_proposed_unreviewed`      (a machine proposed it)
--   - a human has retracted it                        (exclusions table)
--   - it came from a proposal a person has not accepted (pending/expired/
--     superseded), or has rejected
--
-- SUFFICIENCY, from the usable set. Highest tier whose conditions all hold:
--   corroborated  >=3 items, >=2 distinct occasions, >=2 distinct sources,
--                 and at least one item a person entered or confirmed
--   supported     >=2 items on >=2 distinct occasions
--   preliminary   >=1 item
--   none          nothing usable
--
-- Distinct SOURCES, never source AUTHORITY. A parent and a portfolio artifact
-- are two sources; a teacher is not worth more than a mother. That is a
-- deliberate refusal, not an oversight.
--
-- WHICH ASSERTION GOVERNS. Only usable events that actually assert a state
-- count, and among those the state is the HIGHEST any of them supports. Then
-- the ceiling below cuts it back.
--
-- The first version of this rule took the most recent occasion instead, and the
-- smoke test showed what that means: a child with three observations at
-- `developing` had one wobbly day recorded, and Nestra walked her backwards to
-- `emerging`. That is a machine telling a mother her daughter regressed on the
-- strength of one afternoon, which is the exact thing this product exists not to
-- do. Conflicting evidence must not become a negative judgment, so it does not:
-- disagreement is reported as `conflicting_assertions_present` and changes
-- nothing about the value.
--
-- WHEN A COMPUTED STATE MAY FALL, which is the same rule read the other way.
-- The test is not the direction of the change; it is whether the basis for the
-- old answer is still true.
--
--   A new lower observation             -> nothing changes. The evidence that
--                                          supported the characterization is
--                                          all still there.
--   The supporting evidence retracted,
--   excluded, or corrected              -> the state falls, and should. Nestra
--                                          would otherwise be standing on
--                                          something it no longer has.
--   A human changes or releases a
--   decision                            -> the effective state follows them.
--
-- Both halves are tested against each other on one profile (14_step7_profile,
-- section 8bis), because they are easy to conflate and the difference is the
-- whole rule.
--
-- The trade, stated plainly: Nestra will sometimes lag behind a genuinely
-- harder week. That is a cost worth paying; Nestra announcing a regression on
-- its own is not.
--
-- Nothing here decays with time. Elapsed time alone is never evidence.
--
-- THE CEILING. Sufficiency caps how far an assertion may carry:
--   none -> unknown    preliminary -> emerging    supported/corroborated -> developing
-- and the computed state is the lower of the governing assertion and that cap.
-- So a single enthusiastic note cannot produce `developing`, and thirty notes
-- cannot produce `secure`.
--
-- SECURE IS NOT REACHABLE FROM HERE, ever. 0084 constrains computed_state
-- against it. A machine that could compute `secure` would have to write a
-- person's name into human_confirmed_by to satisfy 0082 - inventing a
-- confirmation nobody gave. Secure comes from a human decision or not at all.
--
-- WHAT AN ABSENCE MEANS. Nothing. No rule here turns missing evidence into a
-- lower state, a flag, or a gap. `unknown` is where a skill starts and where it
-- stays until somebody observes something.
-- =============================================================================

create or replace function app.recompute_rule_version()
returns text language sql immutable set search_path = '' as $fn$
  select '2026-09-09.1'::text;
$fn$;

comment on function app.recompute_rule_version() is
  'Stamped onto every row this path writes. When these rules change, this '
  'changes, and a state computed under the old rules is visibly old rather '
  'than silently rewritten.';

-- --- which evidence counts, and why it does not -------------------------------
-- Classification is separated from the arithmetic so that "why was that
-- ignored?" is answerable with a query rather than an argument.

create or replace function app.classified_skill_evidence(p_student uuid, p_skill uuid)
returns table (
  event_id     uuid,
  occurred_on  date,
  asserted     app.skill_state,
  source       app.evidence_source,
  provenance   app.record_provenance,
  klass        text)
language sql stable security invoker set search_path = '' as $fn$
  select e.id, e.occurred_on, e.skill_state, e.evidence_source, e.record_provenance,
         case
           when e.record_provenance = 'ai_proposed_unreviewed'            then 'unreviewed'
           when x.event_id is not null                                    then 'retracted'
           when e.ai_suggestion_id is not null
                and coalesce(s.status::text, 'pending') = 'rejected'      then 'rejected'
           when e.ai_suggestion_id is not null
                and coalesce(s.status::text, 'pending') <> 'accepted'     then 'undecided'
           else 'usable'
         end
    from public.student_skill_events e
    left join public.ai_suggestions s on s.id = e.ai_suggestion_id
    left join public.student_skill_evidence_exclusions x on x.event_id = e.id
   where e.student_id = p_student and e.skill_id = p_skill;
$fn$;

-- --- the computation itself ---------------------------------------------------
-- STABLE and writes nothing, so the same call can serve an explanation to a
-- read-only viewer and the input to a recompute, and the two can never disagree
-- about what the evidence says.

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

  -- The highest state any usable observation supports, the most recent occasion
  -- on which one was observed, and the observations that carry it. Not an
  -- average, not the latest reading, and never the lowest.
  select max(c.asserted) into v_observed
    from app.classified_skill_evidence(p_student, p_skill) c
   where c.klass = 'usable' and c.asserted is not null and c.asserted <> 'unknown';

  if v_observed is not null then
    select max(c.occurred_on), array_agg(c.event_id order by c.event_id)
      into v_as_of, v_ids
      from app.classified_skill_evidence(p_student, p_skill) c
     where c.klass = 'usable' and c.asserted = v_observed;
  end if;

  v_computed := case when v_observed is null then 'unknown'::app.skill_state
                     else least(v_observed, v_cap) end;

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
    -- sorted, so two runs over the same evidence produce the same array and
    -- idempotence is a comparison rather than a judgement call
    'state_reasons',         to_jsonb(array(select r from unnest(v_reasons) r order by r)),
    'sufficiency_inputs',    jsonb_build_object(
        'usable', v_n, 'occasions', v_occasions, 'distinct_sources', v_sources,
        'human_entered_or_confirmed', v_human, 'asserting', v_asserting,
        'distinct_assertions', v_distinct),
    'excluded',              jsonb_build_object(
        'unreviewed_ai', v_unreviewed, 'undecided_ai', v_undecided,
        'rejected_ai', v_rejected, 'human_retracted', v_retracted));
end $fn$;

-- =============================================================================
-- Writing it down
-- =============================================================================
-- SECURITY INVOKER. That is safe for determinism here for a specific reason
-- worth stating: the SELECT policy on student_skill_events scopes by STUDENT,
-- not by row. Anyone who can see one of a child's evidence rows can see all of
-- them, so two authorized callers necessarily compute over the same set. If
-- that policy ever became row-scoped, this function would have to change with
-- it - there is a test that fails if it does not.

create or replace function public.recompute_student_skill(p_student uuid, p_skill uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $fn$
declare
  v_c        jsonb;
  v_row      public.student_skills;
  v_ov       public.student_skill_overrides;
  v_eff      app.skill_state;
  v_ov_state app.skill_state;
  v_changed  boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(p_student, 'skill', 'update') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  v_c := app.compute_skill_state(p_student, p_skill);

  select * into v_ov from public.student_skill_overrides o
   where o.student_id = p_student and o.skill_id = p_skill and o.status = 'active';
  v_ov_state := v_ov.decided_state;                      -- null when none

  v_eff := coalesce(v_ov_state, (v_c->>'computed_state')::app.skill_state);

  select * into v_row from public.student_skills ss
   where ss.student_id = p_student and ss.skill_id = p_skill;

  -- No row, nothing to say, nobody has decided anything: do not materialise a
  -- row per skill per child just to record that we know nothing. `unknown` with
  -- no evidence is the default and needs no storage.
  if not found then
    if (v_c->>'usable_evidence_count')::int = 0 and v_ov.id is null then
      return v_c || jsonb_build_object('effective_state', v_eff::text,
                                       'override_active', false, 'stored', false);
    end if;
    if not app.can_student_action(p_student, 'skill', 'create') then
      raise exception 'not permitted' using errcode = 'insufficient_privilege';
    end if;
    insert into public.student_skills (student_id, skill_id, organization_id,
             source_type, record_provenance, evidence_source, skill_state, created_by)
    select p_student, p_skill, st.primary_organization_id, 'system_calculation',
           'system_computed', 'unknown', 'unknown', auth.uid()
      from public.students st where st.id = p_student
    returning * into v_row;
  end if;

  -- Idempotence, literally: if nothing about the state changed, write nothing.
  -- Otherwise every re-run would push a row into the history trigger and a
  -- child's timeline would fill with events in which nothing happened.
  v_changed :=
       v_row.computed_state        is distinct from (v_c->>'computed_state')::app.skill_state
    or v_row.evidence_sufficiency  is distinct from (v_c->>'evidence_sufficiency')::app.evidence_sufficiency
    or v_row.usable_evidence_count is distinct from (v_c->>'usable_evidence_count')::int
    or v_row.state_as_of           is distinct from (v_c->>'state_as_of')::date
    or v_row.skill_state           is distinct from v_eff
    or v_row.override_state        is distinct from v_ov_state
    or v_row.active_override_id    is distinct from v_ov.id
    or v_row.recompute_rule_version is distinct from (v_c->>'rule_version')
    or v_row.state_reasons::text   is distinct from (
         select coalesce(array_agg(x)::text, '{}')
           from jsonb_array_elements_text(v_c->'state_reasons') t(x))
    or v_row.state_evidence_ids::text is distinct from (
         select coalesce(array_agg(x::uuid)::text, '{}')
           from jsonb_array_elements_text(v_c->'state_evidence_ids') t(x))
    or v_row.sufficiency_inputs    is distinct from (v_c->'sufficiency_inputs');

  if v_changed then
    update public.student_skills ss set
      computed_state        = (v_c->>'computed_state')::app.skill_state,
      evidence_sufficiency  = (v_c->>'evidence_sufficiency')::app.evidence_sufficiency,
      usable_evidence_count = (v_c->>'usable_evidence_count')::int,
      state_as_of           = (v_c->>'state_as_of')::date,
      state_reasons         = (select coalesce(array_agg(x::app.state_reason_code), '{}')
                                 from jsonb_array_elements_text(v_c->'state_reasons') t(x)),
      state_evidence_ids    = (select coalesce(array_agg(x::uuid), '{}')
                                 from jsonb_array_elements_text(v_c->'state_evidence_ids') t(x)),
      sufficiency_inputs    = v_c->'sufficiency_inputs',
      recompute_rule_version = v_c->>'rule_version',
      computed_at           = now(),
      -- the human decision, and the state it puts in force
      active_override_id    = v_ov.id,
      override_state        = v_ov_state,
      skill_state           = v_eff,
      -- 0082 requires a named human behind `secure`; the only way to reach it
      -- is a decision, so the name is that decision's
      human_confirmed_by    = case when v_eff = 'secure' then v_ov.decided_by
                                   else ss.human_confirmed_by end,
      human_confirmed_at    = case when v_eff = 'secure' then v_ov.decided_at
                                   else ss.human_confirmed_at end,
      record_provenance     = (case when v_ov.id is not null then 'human_entered'
                                    else 'system_computed' end)::app.record_provenance,
      updated_at            = now(),
      updated_by            = auth.uid()
    where ss.id = v_row.id;
  end if;

  return v_c || jsonb_build_object(
    'effective_state', v_eff::text,
    'override_active', v_ov.id is not null,
    'override_id',     v_ov.id,
    'stored',          true,
    'rewritten',       v_changed);
end $fn$;

-- =============================================================================
-- A person decides
-- =============================================================================
-- This does NOT write an evidence event. It was tempting - the events table is
-- the history, so why not put the decision there too - and it would have been
-- a feedback loop: a parent's judgement would become an item of evidence, which
-- would raise sufficiency, which would raise the ceiling, which would change
-- the computed state she was disagreeing with. Her decision is recorded as a
-- decision, in its own table, and the evidence stays evidence.

create or replace function public.set_skill_state_override(
  p_student uuid, p_skill uuid, p_state text, p_note text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $fn$
declare
  v_state app.skill_state := p_state::app.skill_state;
  v_c     jsonb;
  v_row   public.student_skills;
  v_id    uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(p_student, 'skill', 'update') then
    raise exception 'a skill state is a decision about a child, and this account is not authorized to make it for this child'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.student_skills ss
   where ss.student_id = p_student and ss.skill_id = p_skill;
  if not found then
    if not app.can_student_action(p_student, 'skill', 'create') then
      raise exception 'not permitted' using errcode = 'insufficient_privilege';
    end if;
    insert into public.student_skills (student_id, skill_id, organization_id,
             source_type, record_provenance, evidence_source, skill_state, created_by)
    select p_student, p_skill, st.primary_organization_id, 'manual',
           'human_entered', 'unknown', 'unknown', auth.uid()
      from public.students st where st.id = p_student
    returning * into v_row;
  end if;

  v_c := app.compute_skill_state(p_student, p_skill);

  -- The previous decision ends; it does not vanish.
  update public.student_skill_overrides o
     set status = 'superseded', released_at = now(), released_by = auth.uid()
   where o.student_skill_id = v_row.id and o.status = 'active';

  insert into public.student_skill_overrides (
      student_skill_id, student_id, skill_id, organization_id, decided_state, note,
      prior_computed_state, prior_effective_state, sufficiency_at_decision,
      evidence_ids, usable_evidence_count, evidence_source, record_provenance,
      status, decided_by)
  values (v_row.id, p_student, p_skill, v_row.organization_id, v_state, p_note,
          (v_c->>'computed_state')::app.skill_state, v_row.skill_state,
          (v_c->>'evidence_sufficiency')::app.evidence_sufficiency,
          (select coalesce(array_agg(x::uuid), '{}')
             from jsonb_array_elements_text(v_c->'state_evidence_ids') t(x)),
          (v_c->>'usable_evidence_count')::int,
          'parent', 'human_entered', 'active', auth.uid())
  returning id into v_id;

  return public.recompute_student_skill(p_student, p_skill)
         || jsonb_build_object('override_set', v_id, 'decided_state', v_state::text);
end $fn$;

create or replace function public.release_skill_state_override(
  p_student uuid, p_skill uuid, p_note text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $fn$
declare v_n int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(p_student, 'skill', 'update') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  update public.student_skill_overrides o
     set status = 'released', released_at = now(), released_by = auth.uid(),
         release_note = p_note
   where o.student_id = p_student and o.skill_id = p_skill and o.status = 'active';
  get diagnostics v_n = row_count;

  return public.recompute_student_skill(p_student, p_skill)
         || jsonb_build_object('released', v_n);
end $fn$;

-- =============================================================================
-- Retracting a piece of evidence
-- =============================================================================

create or replace function public.exclude_skill_evidence(
  p_event uuid, p_reason text, p_note text default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $fn$
declare v_e public.student_skill_events;
begin
  select * into v_e from public.student_skill_events e where e.id = p_event;
  if not found then
    raise exception 'no such evidence' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(v_e.student_id, 'skill', 'update') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  insert into public.student_skill_evidence_exclusions (event_id, student_id, reason, note, excluded_by)
  values (p_event, v_e.student_id, p_reason::app.evidence_exclusion_reason, p_note, auth.uid())
  on conflict (event_id) do nothing;

  return public.recompute_student_skill(v_e.student_id, v_e.skill_id);
end $fn$;

create or replace function public.restore_skill_evidence(p_event uuid)
returns jsonb
language plpgsql security invoker set search_path = '' as $fn$
declare v_e public.student_skill_events;
begin
  select * into v_e from public.student_skill_events e where e.id = p_event;
  if not found then
    raise exception 'no such evidence' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(v_e.student_id, 'skill', 'update') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  delete from public.student_skill_evidence_exclusions x where x.event_id = p_event;
  return public.recompute_student_skill(v_e.student_id, v_e.skill_id);
end $fn$;

-- =============================================================================
-- "Why do you think that?"
-- =============================================================================
-- Read-only, so a view-only guardian can ask it. Returns BOTH characterizations
-- when they differ, because a screen that showed only one of them would either
-- hide what Nestra thinks or overrule what a parent said.

create or replace function public.explain_student_skill(p_student uuid, p_skill uuid)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $fn$
declare
  v_c jsonb; v_row public.student_skills; v_ov public.student_skill_overrides;
begin
  if not app.can_student_action(p_student, 'skill', 'read') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  v_c := app.compute_skill_state(p_student, p_skill);
  select * into v_row from public.student_skills ss
   where ss.student_id = p_student and ss.skill_id = p_skill;
  select * into v_ov from public.student_skill_overrides o
   where o.student_id = p_student and o.skill_id = p_skill and o.status = 'active';

  return v_c || jsonb_build_object(
    'stored_effective_state', v_row.skill_state,
    'stored_computed_state',  v_row.computed_state,
    'effective_state',        coalesce(v_ov.decided_state, (v_c->>'computed_state')::app.skill_state),
    'override_active',        v_ov.id is not null,
    'human_decision', case when v_ov.id is null then null else jsonb_build_object(
        'decided_state',           v_ov.decided_state,
        'decided_by',              v_ov.decided_by,
        'decided_at',              v_ov.decided_at,
        'note',                    v_ov.note,
        'computed_state_at_decision', v_ov.prior_computed_state,
        'sufficiency_at_decision', v_ov.sufficiency_at_decision,
        'evidence_ids',            to_jsonb(v_ov.evidence_ids)) end);
end $fn$;

-- A view for the ordinary read. security_invoker so it is exactly as visible as
-- the rows underneath it, and SELECT only.
create or replace view public.student_skill_profile with (security_invoker = true) as
  select ss.student_id, ss.skill_id, ss.organization_id,
         ss.skill_state           as effective_state,
         ss.computed_state,
         ss.override_state,
         ss.active_override_id is not null as override_active,
         ss.evidence_sufficiency,
         ss.usable_evidence_count,
         ss.state_reasons,
         ss.state_evidence_ids,
         ss.sufficiency_inputs,
         ss.state_as_of,
         ss.recompute_rule_version,
         ss.computed_at
    from public.student_skills ss;

comment on view public.student_skill_profile is
  'One child, one skill, both characterizations. It holds no other child''s row '
  'and computes no comparison: there is nothing here to rank against.';

-- A default privilege in this schema grants writes on new relations, and a
-- view without security_invoker would then be a path straight past the base
-- table's RLS. The invariant refuses that and caught this view; the revoke is
-- explicit rather than inherited.
revoke all on public.student_skill_profile from public, anon, authenticated;
grant select on public.student_skill_profile to authenticated;

revoke all on function app.recompute_rule_version() from public, anon;
revoke all on function app.classified_skill_evidence(uuid, uuid) from public, anon;
revoke all on function app.compute_skill_state(uuid, uuid) from public, anon;
grant execute on function app.recompute_rule_version() to authenticated, service_role;
grant execute on function app.classified_skill_evidence(uuid, uuid) to authenticated, service_role;
grant execute on function app.compute_skill_state(uuid, uuid) to authenticated, service_role;

revoke all on function public.recompute_student_skill(uuid, uuid) from public, anon;
revoke all on function public.set_skill_state_override(uuid, uuid, text, text) from public, anon;
revoke all on function public.release_skill_state_override(uuid, uuid, text) from public, anon;
revoke all on function public.exclude_skill_evidence(uuid, text, text) from public, anon;
revoke all on function public.restore_skill_evidence(uuid) from public, anon;
revoke all on function public.explain_student_skill(uuid, uuid) from public, anon;
grant execute on function public.recompute_student_skill(uuid, uuid) to authenticated, service_role;
grant execute on function public.set_skill_state_override(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.release_skill_state_override(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.exclude_skill_evidence(uuid, text, text) to authenticated, service_role;
grant execute on function public.restore_skill_evidence(uuid) to authenticated, service_role;
grant execute on function public.explain_student_skill(uuid, uuid) to authenticated, service_role;

select app.assert_schema_invariants();
