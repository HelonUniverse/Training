-- =============================================================================
-- 0088  Making the deployed code byte-identical to the repository
-- =============================================================================
-- 0085 was applied to managed by hand through the MCP channel, and to keep the
-- payload manageable its comments were trimmed on the way. The executable SQL
-- was unaffected - a normalized digest over both bodies, with comments and
-- whitespace removed, matched exactly, and the behavioural probe produced
-- line-for-line identical output on both databases.
--
-- But "identical apart from the comments" is a claim that has to be re-argued
-- every time somebody compares the two, and the comments in these functions are
-- where the reasoning lives. So the two bodies are restored verbatim from the
-- file, and scripts/schema-digest.sql now hashes function BODIES as well as
-- signatures, which is the check that would have caught this without being
-- asked.
--
-- No behaviour changes here. The rule version is deliberately NOT bumped: no
-- state any child holds was computed differently, and moving it would claim
-- otherwise.
-- =============================================================================

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

select app.assert_schema_invariants();
