-- =============================================================================
-- 0090  The advisory: five conditions, and time is only one of them
-- =============================================================================
-- Nothing here writes to the profile. Not one statement. 0090 also adds the
-- invariant that refuses these functions if their source ever acquires a write
-- against the profile table, because "we were careful" is not a guarantee.
--
-- THE FIVE CONDITIONS. All must hold, and no subset is sufficient:
--
--   1. the family turned this on                    (off by default, for everyone)
--   2. the state in force is human-confirmed secure (a named person decided it)
--   3. the evidence under that is at least `supported`
--   4. the skill is currently relevant              (enumerated, human-sourced)
--   5. the interval has elapsed since the anchor
--
-- TIME IS CONDITION 5 AND ONLY CONDITION 5. On its own it produces nothing:
-- a skill nobody enabled, or that nobody is working towards, or that no person
-- confirmed, can sit untouched for ten years and generate no suggestion. That
-- ordering is the whole point - a calendar must never be the reason a family
-- hears about their child.
--
-- THE ANCHOR is the most recent of:
--   the last USABLE evidence          (Phase 3's definition, so an unreviewed
--                                      proposal or a retracted item cannot make
--                                      a skill look recently demonstrated)
--   the human confirmation of `secure`
--   the last dismissal                (which is why dismissing does not ask
--                                      again tomorrow - the clock restarts)
--   the last completed revisit
--
-- WHY THERE IS NO STORED BOOLEAN. A `refresh_suggested` column would be a value
-- that agreed with its conditions at write time and drifted afterwards, and the
-- drifted version is the one that ends up on a screen. It is computed on
-- demand, from rows that are all visible to the family, every time.
-- =============================================================================

-- --- what makes a skill currently relevant -----------------------------------
-- Every branch is something a person in this family did. There is deliberately
-- no branch for age, for grade, for a benchmark, or for what other children are
-- doing, and the invariant in this migration refuses this function if it ever
-- learns to read the reference catalogue.

create or replace function app.skill_relevance_reasons(p_student uuid, p_skill uuid)
returns app.refresh_relevance_reason[]
language sql stable security invoker set search_path = '' as $fn$
  select coalesce(array_agg(distinct x.r order by x.r), '{}'::app.refresh_relevance_reason[])
  from (
    select 'active_learning_goal'::app.refresh_relevance_reason as r
     where exists (select 1 from public.learning_goals g
                    where g.student_id = p_student and g.skill_id = p_skill
                      and g.status = 'active')
    union all
    select 'active_learning_plan_priority'
     where exists (select 1 from public.learning_plans lp
                    where lp.student_id = p_student and lp.status = 'active'
                      and p_skill = any(lp.priority_skill_ids))
    union all
    select 'active_course_enrollment'
     where exists (select 1 from public.student_course_enrollments e
                     join public.resource_skills rs on rs.course_id = e.course_id
                    where e.student_id = p_student and e.status = 'active'
                      and rs.skill_id = p_skill)
    union all
    -- one level, not a recursive walk: it underpins something she is actually
    -- working on now, which is a different claim from "it is somewhere upstream
    -- of everything".
    select 'prerequisite_of_current_work'
     where exists (
       select 1 from public.skill_prerequisites sp
        where sp.prerequisite_skill_id = p_skill
          and (exists (select 1 from public.learning_goals g
                        where g.student_id = p_student and g.skill_id = sp.skill_id
                          and g.status = 'active')
            or exists (select 1 from public.learning_plans lp
                        where lp.student_id = p_student and lp.status = 'active'
                          and sp.skill_id = any(lp.priority_skill_ids))
            or exists (select 1 from public.student_course_enrollments e
                         join public.resource_skills rs on rs.course_id = e.course_id
                        where e.student_id = p_student and e.status = 'active'
                          and rs.skill_id = sp.skill_id)))
    union all
    select 'parent_requested'
     where (select d.kind from public.student_skill_refresh_decisions d
             where d.student_id = p_student and d.skill_id = p_skill
             order by d.decided_at desc, d.id desc limit 1) = 'revisit_requested'
  ) x;
$fn$;

-- --- the advisory ------------------------------------------------------------

create or replace function app.refresh_advisory(p_student uuid, p_skill uuid)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $fn$
declare
  v_enabled  boolean; v_interval int;
  v_row      public.student_skills;
  v_ov       public.student_skill_overrides;
  v_last_evidence date; v_anchor date;
  v_dismissed timestamptz; v_completed timestamptz;
  v_latest   app.refresh_decision_kind;
  v_rel      app.refresh_relevance_reason[];
  v_blocked  app.refresh_block_reason[] := '{}';
  v_days     int;
  v_asked    boolean;
begin
  select f.refresh_advisory_enabled, f.refresh_interval_days
    into v_enabled, v_interval
    from public.students s join public.families f on f.id = s.family_id
   where s.id = p_student;
  v_enabled  := coalesce(v_enabled, false);
  v_interval := coalesce(v_interval, 180);

  select * into v_row from public.student_skills ss
   where ss.student_id = p_student and ss.skill_id = p_skill;
  select * into v_ov from public.student_skill_overrides o
   where o.student_id = p_student and o.skill_id = p_skill and o.status = 'active';

  v_rel := app.skill_relevance_reasons(p_student, p_skill);

  select max(c.occurred_on) into v_last_evidence
    from app.classified_skill_evidence(p_student, p_skill) c
   where c.klass = 'usable';

  select max(d.decided_at) filter (where d.kind = 'dismissed'),
         max(d.decided_at) filter (where d.kind = 'revisit_completed')
    into v_dismissed, v_completed
    from public.student_skill_refresh_decisions d
   where d.student_id = p_student and d.skill_id = p_skill;

  select d.kind into v_latest
    from public.student_skill_refresh_decisions d
   where d.student_id = p_student and d.skill_id = p_skill
   order by d.decided_at desc, d.id desc limit 1;

  -- greatest() ignores nulls, which is what makes this read cleanly: whichever
  -- of these happened most recently restarts the clock.
  v_anchor := greatest(v_last_evidence, v_ov.decided_at::date,
                       v_dismissed::date, v_completed::date);
  v_days   := case when v_anchor is null then null else current_date - v_anchor end;

  -- coalesce, and it is not cosmetic. With no decision rows at all v_latest is
  -- NULL, so this comparison is NULL, so `if not v_asked` is NULL, so the entire
  -- block of conditions below is SKIPPED and the advisory comes back true with
  -- an empty blocked list. The first smoke run said `suggested=true` for a
  -- brand-new family with no profile, no evidence and the feature switched off -
  -- which is precisely the thing this phase exists to never do.
  v_asked := coalesce(v_latest = 'revisit_requested', false);

  -- SHE ASKED. This is not Nestra suggesting anything, so it is not gated on
  -- Nestra's five conditions - it is her own note to herself, surfaced back to
  -- her, and it still changes no state whatsoever.
  if not v_asked then
    if not v_enabled then
      v_blocked := v_blocked || 'family_has_not_enabled_it'::app.refresh_block_reason;
    end if;
    if v_row.id is null then
      v_blocked := v_blocked || 'no_profile_yet'::app.refresh_block_reason;
    else
      if not (v_row.skill_state = 'secure' and v_ov.id is not null
              and v_ov.decided_state = 'secure' and v_ov.decided_by is not null) then
        v_blocked := v_blocked || 'not_human_confirmed_secure'::app.refresh_block_reason;
      end if;
      if v_row.evidence_sufficiency < 'supported' then
        v_blocked := v_blocked || 'evidence_too_thin_to_revisit'::app.refresh_block_reason;
      end if;
    end if;
    if array_length(v_rel, 1) is null then
      v_blocked := v_blocked || 'no_current_relevance'::app.refresh_block_reason;
    end if;
    if v_days is null or v_days < v_interval then
      v_blocked := v_blocked || 'interval_has_not_elapsed'::app.refresh_block_reason;
      if v_dismissed is not null and v_anchor = v_dismissed::date then
        v_blocked := v_blocked || 'recently_dismissed'::app.refresh_block_reason;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'refresh_suggested',   array_length(v_blocked, 1) is null,
    'requested_by_parent', coalesce(v_asked, false),
    'relevance',           to_jsonb(v_rel),
    'blocked_by',          to_jsonb(array(select b from unnest(v_blocked) b order by b)),
    'advisory_enabled',    v_enabled,
    'interval_days',       v_interval,
    'anchor_date',         v_anchor,
    'days_since_anchor',   v_days,
    'last_usable_evidence', v_last_evidence,
    -- echoed so a caller can see, in one payload, that the state did not move
    'effective_state',     v_row.skill_state,
    'computed_state',      v_row.computed_state,
    'evidence_sufficiency', v_row.evidence_sufficiency);
end $fn$;

-- --- the calls a family makes -------------------------------------------------

create or replace function public.explain_skill_refresh(p_student uuid, p_skill uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $fn$
begin
  if not app.can_student_action(p_student, 'skill', 'read') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return app.refresh_advisory(p_student, p_skill);
end $fn$;

create or replace function app.record_refresh_decision(
  p_student uuid, p_skill uuid, p_kind app.refresh_decision_kind, p_note text)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
declare v_a jsonb; v_row public.student_skills; v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not app.can_student_action(p_student, 'skill', 'update') then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  v_a := app.refresh_advisory(p_student, p_skill);
  select * into v_row from public.student_skills ss
   where ss.student_id = p_student and ss.skill_id = p_skill;

  insert into public.student_skill_refresh_decisions (
      student_id, skill_id, organization_id, kind, note,
      effective_state_at_decision, sufficiency_at_decision, anchor_at_decision, decided_by)
  values (p_student, p_skill, v_row.organization_id, p_kind, p_note,
          v_row.skill_state, v_row.evidence_sufficiency,
          (v_a->>'anchor_date')::date, auth.uid())
  returning id into v_id;

  return app.refresh_advisory(p_student, p_skill)
         || jsonb_build_object('decision', v_id, 'kind', p_kind::text);
end $fn$;

create or replace function public.dismiss_skill_refresh(
  p_student uuid, p_skill uuid, p_note text default null)
returns jsonb language sql security invoker set search_path = '' as $fn$
  select app.record_refresh_decision(p_student, p_skill, 'dismissed', p_note);
$fn$;

create or replace function public.request_skill_revisit(
  p_student uuid, p_skill uuid, p_note text default null)
returns jsonb language sql security invoker set search_path = '' as $fn$
  select app.record_refresh_decision(p_student, p_skill, 'revisit_requested', p_note);
$fn$;

create or replace function public.complete_skill_revisit(
  p_student uuid, p_skill uuid, p_note text default null)
returns jsonb language sql security invoker set search_path = '' as $fn$
  select app.record_refresh_decision(p_student, p_skill, 'revisit_completed', p_note);
$fn$;

create or replace function public.set_family_refresh_advisory(
  p_family uuid, p_enabled boolean, p_interval_days integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
declare v_f public.families;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  update public.families f
     set refresh_advisory_enabled = p_enabled,
         refresh_interval_days = coalesce(p_interval_days, f.refresh_interval_days),
         updated_at = now(), updated_by = auth.uid()
   where f.id = p_family
  returning * into v_f;
  if not found then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object('family', v_f.id,
                            'refresh_advisory_enabled', v_f.refresh_advisory_enabled,
                            'refresh_interval_days', v_f.refresh_interval_days);
end $fn$;

revoke all on function app.skill_relevance_reasons(uuid, uuid) from public, anon;
revoke all on function app.refresh_advisory(uuid, uuid) from public, anon;
revoke all on function app.record_refresh_decision(uuid, uuid, app.refresh_decision_kind, text) from public, anon;
grant execute on function app.skill_relevance_reasons(uuid, uuid) to authenticated, service_role;
grant execute on function app.refresh_advisory(uuid, uuid) to authenticated, service_role;
grant execute on function app.record_refresh_decision(uuid, uuid, app.refresh_decision_kind, text) to authenticated, service_role;

revoke all on function public.explain_skill_refresh(uuid, uuid) from public, anon;
revoke all on function public.dismiss_skill_refresh(uuid, uuid, text) from public, anon;
revoke all on function public.request_skill_revisit(uuid, uuid, text) from public, anon;
revoke all on function public.complete_skill_revisit(uuid, uuid, text) from public, anon;
revoke all on function public.set_family_refresh_advisory(uuid, boolean, integer) from public, anon;
grant execute on function public.explain_skill_refresh(uuid, uuid) to authenticated, service_role;
grant execute on function public.dismiss_skill_refresh(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.request_skill_revisit(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.complete_skill_revisit(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.set_family_refresh_advisory(uuid, boolean, integer) to authenticated, service_role;

select app.assert_schema_invariants();
