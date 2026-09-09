-- =============================================================================
-- 0084  The profile: what Nestra computed, what a human decided, and which one
--       is in force
-- =============================================================================
-- Phases 1-2 gave the profile an honest vocabulary. This gives it an honest
-- STRUCTURE, and the structural question is the one that decides whether a
-- parent's judgement is safe: when a recompute runs, what happens to what she
-- said?
--
-- The answer has to be "nothing", and it has to be true because of the schema
-- rather than because the recompute function remembers to be careful. So the
-- row carries three separate facts that were previously one:
--
--   computed_state    what the deterministic rules derive from evidence
--   override_state    what an authorized human decided, if anyone has
--   skill_state       the one in force - the human's if there is one
--
-- and a check constraint makes the third follow from the second. A recompute
-- that tried to overwrite a parent's decision would have to violate a
-- constraint to do it.
--
-- THREE THINGS THIS DELIBERATELY DOES NOT ADD:
--
--   No numeric anything. Not a score, not a percentage, not a count that gets
--   divided by another count on the way to a screen. 0083 forbids the column
--   names; this migration does not try to sneak the idea back in under
--   `usable_evidence_count`, which counts EVIDENCE - a property of what Nestra
--   has - and never characterizes the child.
--
--   No fifth state. `refresh_suggested` is not built here and cannot be built
--   into the state column: 0083's invariant pins app.skill_state to exactly
--   four labels.
--
--   No comparison. Nothing here holds a cohort, a percentile, a grade
--   equivalent or another child's row.
-- =============================================================================

-- --- 1. How much we have to go on -------------------------------------------
-- A SEPARATE TYPE from app.evidence_confidence on purpose, even though three of
-- the four labels match. evidence_confidence is a property of ONE evidence
-- item - how strong is this observation. Sufficiency is a property of the whole
-- SKILL - how much do we have altogether. Sharing one type would have made
-- "this worksheet is preliminary" and "we have barely anything for this skill"
-- the same sentence, and they are not.
--
-- `none` exists here and deliberately does not exist there: a skill with no
-- evidence at all is a real, common, correct state for a newly onboarded child,
-- and it needs a name that is not a weak strength.

create type app.evidence_sufficiency as enum (
  'none',           -- nothing usable. The normal state for a child we just met.
  'preliminary',
  'supported',
  'corroborated');

comment on type app.evidence_sufficiency is
  'HOW MUCH usable evidence Nestra holds for a skill. Independent of the skill '
  'state: a skill may be corroborated and still developing, or supported and '
  'human-confirmed secure. It must never be read as how good the child is.';

-- --- 2. Why the state is what it is -----------------------------------------
-- Reason codes rather than sentences. A generated sentence is a translation of
-- the truth and drifts from it; a code is the truth, and the sentence is
-- rendered from it in the family's own language at display time.

create type app.state_reason_code as enum (
  'no_usable_evidence',
  'evidence_present_but_no_state_asserted',
  'governed_by_strongest_observation',
  'limited_by_sufficiency',
  'conflicting_assertions_present',
  'machine_may_not_determine_secure',
  'excluded_unreviewed_ai_proposal',
  'excluded_undecided_ai_proposal',
  'excluded_rejected_ai_proposal',
  'excluded_by_human_retraction',
  'human_decision_active');

comment on type app.state_reason_code is
  'The structured answer to "why do you think that?". These codes plus the '
  'evidence ids are the source of truth for an explanation; family-facing prose '
  'is rendered FROM them and is never the record.';

create type app.override_status as enum ('active', 'released', 'superseded');

create type app.evidence_exclusion_reason as enum (
  'retracted_by_human',
  'not_about_this_skill',
  'recorded_in_error',
  'duplicate',
  'other');

-- =============================================================================
-- The profile row
-- =============================================================================

alter table public.student_skills
  add column computed_state         app.skill_state          not null default 'unknown',
  add column override_state         app.skill_state,
  add column evidence_sufficiency   app.evidence_sufficiency not null default 'none',
  add column usable_evidence_count  integer                  not null default 0,
  add column state_reasons          app.state_reason_code[]  not null default '{}',
  add column state_evidence_ids     uuid[]                   not null default '{}',
  add column sufficiency_inputs     jsonb                    not null default '{}'::jsonb,
  add column state_as_of            date,
  add column recompute_rule_version text,
  add column computed_at            timestamptz,
  add column active_override_id     uuid;

comment on column public.student_skills.computed_state is
  'What the deterministic rules derive from evidence alone. Never `secure`: a '
  'machine may not decide that, so the column is constrained against it.';
comment on column public.student_skills.override_state is
  'What an authorized human decided. Denormalized from the active override row '
  'so that a check constraint - not a function''s good intentions - can make '
  'the effective state follow it.';
comment on column public.student_skills.state_as_of is
  'The date of the evidence that governs the current state. A state with no '
  'date is a claim about forever.';
comment on column public.student_skills.usable_evidence_count is
  'How many evidence items were usable. A property of Nestra''s knowledge, not '
  'a measurement of the child, and never a numerator.';

-- A machine may not determine `secure`. In 0082 that was enforced at the
-- effective state by requiring a human confirmation; here it is enforced at the
-- source, so the deterministic path cannot even produce the value it would then
-- have to stamp a human's name onto.
alter table public.student_skills
  add constraint student_skills_computed_state_never_secure_ck
    check (computed_state <> 'secure');

-- THE CONSTRAINT THIS MIGRATION EXISTS FOR. If a human decision is active, the
-- state in force IS that decision. A recompute cannot overwrite it without
-- violating this, and a recompute that dropped the link would have to clear the
-- decision explicitly rather than quietly.
alter table public.student_skills
  add constraint student_skills_override_is_effective_ck check (
    (active_override_id is null and override_state is null)
    or (active_override_id is not null and override_state is not null
        and skill_state = override_state));

-- =============================================================================
-- The human decisions
-- =============================================================================
-- A parent correction is not an UPDATE to a computed field. It is an act, by a
-- person, at a time, in a context - and the context matters, because "she
-- confirmed secure when Nestra had one worksheet" and "she confirmed secure
-- when Nestra had thirty" are different acts and only one of them is a
-- disagreement worth a second look.
--
-- So the decision is a row, it keeps what Nestra believed at the moment it was
-- made, and it is released rather than deleted.

create table public.student_skill_overrides (
  id                    uuid primary key default gen_random_uuid(),
  student_skill_id      uuid not null references public.student_skills(id) on delete cascade,
  student_id            uuid not null references public.students(id) on delete cascade,
  skill_id              uuid not null references public.skills(id) on delete cascade,
  organization_id       uuid references public.organizations(id) on delete set null,

  decided_state         app.skill_state not null,
  note                  text,

  -- what Nestra believed at the moment of the decision
  prior_computed_state  app.skill_state,
  prior_effective_state app.skill_state,
  sufficiency_at_decision app.evidence_sufficiency not null default 'none',
  evidence_ids          uuid[] not null default '{}',
  usable_evidence_count integer not null default 0,

  evidence_source       app.evidence_source not null default 'unknown',
  record_provenance     app.record_provenance not null default 'human_entered',

  status                app.override_status not null default 'active',
  -- Nullable for exactly one case, and constrained so it cannot spread: a state
  -- carried forward from before Nestra recorded who set it. A decision made
  -- through the RPC always names its actor.
  decided_by            uuid references public.profiles(id),
  carried_forward       boolean not null default false,
  decided_at            timestamptz not null default now(),
  released_by           uuid references public.profiles(id),
  released_at           timestamptz,
  release_note          text,
  created_at            timestamptz not null default now(),

  -- A human decision is by definition reviewed by a human.
  constraint sso_provenance_is_human_ck
    check (record_provenance <> 'ai_proposed_unreviewed'),
  -- Exactly one of "in force" and "ended".
  constraint sso_status_matches_release_ck
    check ((status = 'active') = (released_at is null)),
  constraint sso_usable_evidence_count_ck check (usable_evidence_count >= 0),
  -- A decision names the person who made it. The only anonymous rows are states
  -- that predate the question being asked.
  constraint sso_decision_names_its_actor_ck
    check (carried_forward or decided_by is not null)
);

-- One decision in force at a time. Superseding is explicit and leaves the old
-- row standing.
create unique index student_skill_overrides_one_active_idx
  on public.student_skill_overrides (student_skill_id) where status = 'active';
create index student_skill_overrides_student_idx
  on public.student_skill_overrides (student_id, skill_id);

alter table public.student_skills
  add constraint student_skills_active_override_fk
    foreign key (active_override_id) references public.student_skill_overrides(id);

-- =============================================================================
-- Carrying existing states forward, without reclassifying anybody
-- =============================================================================
-- A row that already carries a state carries it because a PERSON typed it.
-- There are no events underneath it - the profile predates the idea that a
-- state derives from evidence - so the first recompute would find nothing,
-- compute `unknown`, and quietly erase what she recorded. That is a machine
-- overruling a parent on the strength of having no information, which is the
-- precise failure this phase exists to prevent.
--
-- Found by the migration regression, which runs these files over synthetic
-- legacy rows. Against the empty tables both environments actually have, this
-- would have shipped looking correct.
--
-- So every existing non-`unknown` state becomes what it always was: an active
-- human decision. It keeps the state, survives recompute, appears in the UI as
-- a person's judgement rather than as Nestra's, and the family can release it.
--
-- Where the old row names nobody - and it may not, since every actor column on
-- it is nullable - the decision is carried anonymously rather than attributed to
-- a guardian who did not make it. `carried_forward` marks those rows, and a
-- constraint stops anonymity spreading anywhere else: a decision made through
-- the RPC always names its actor. Losing the state would have been worse than
-- losing the name.

with carried as (
    insert into public.student_skill_overrides (
        student_skill_id, student_id, skill_id, organization_id, decided_state, note,
        prior_computed_state, prior_effective_state, sufficiency_at_decision,
        evidence_source, record_provenance, status, decided_by, decided_at,
        carried_forward)
    select ss.id, ss.student_id, ss.skill_id, ss.organization_id, ss.skill_state,
           'Recorded before Nestra derived states from evidence; carried forward as the decision it was.',
           'unknown', ss.skill_state, 'none',
           ss.evidence_source,
           case when ss.record_provenance = 'ai_proposed_unreviewed' then 'human_entered'
                else ss.record_provenance end,
           'active',
           coalesce(ss.human_confirmed_by, ss.entered_by, ss.created_by, ss.updated_by),
           coalesce(ss.human_confirmed_at, ss.updated_at, ss.created_at),
           true
      from public.student_skills ss
     where ss.skill_state <> 'unknown'
    returning id, student_skill_id, decided_state)
update public.student_skills ss
   set active_override_id = c.id, override_state = c.decided_state
  from carried c where c.student_skill_id = ss.id;

comment on table public.student_skill_overrides is
  'Human decisions about a skill state. Never a correction of the child and '
  'never an error report about Nestra - a decision by the person with the '
  'authority to make it. Released, never deleted.';

-- =============================================================================
-- Retracting a piece of evidence, without rewriting history
-- =============================================================================
-- `student_skill_events` is append-only and stays that way. But a parent must
-- be able to say "that one was not about this skill" or "I recorded that by
-- mistake" and have the recompute stop counting it. Mutating the event would
-- destroy the record; a separate row says so alongside it.
--
-- Deletable, unlike the override, because §21 requires every parent action to
-- be undoable and un-retracting is exactly that. The event itself is untouched
-- either way.

create table public.student_skill_evidence_exclusions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null unique references public.student_skill_events(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  reason      app.evidence_exclusion_reason not null,
  note        text,
  excluded_by uuid not null references public.profiles(id),
  excluded_at timestamptz not null default now()
);

create index student_skill_evidence_exclusions_student_idx
  on public.student_skill_evidence_exclusions (student_id);

comment on table public.student_skill_evidence_exclusions is
  'Evidence a human has retracted. The event stays exactly as recorded; this '
  'says the recompute must not count it, and who said so.';

-- =============================================================================
-- Neither table may be quietly rewritten
-- =============================================================================
-- The override row keeps what Nestra believed at the moment of the decision.
-- If those fields could be edited afterwards, the record would say a parent
-- decided something in a context she was never in. So the decision is frozen
-- and only the release fields may move.

create or replace function app.forbid_override_rewrite()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception 'a human decision is released, not deleted'
      using errcode = 'restrict_violation';
  end if;
  if new.id                is distinct from old.id
     or new.student_skill_id     is distinct from old.student_skill_id
     or new.student_id           is distinct from old.student_id
     or new.skill_id             is distinct from old.skill_id
     or new.decided_state        is distinct from old.decided_state
     or new.note                 is distinct from old.note
     or new.prior_computed_state is distinct from old.prior_computed_state
     or new.prior_effective_state is distinct from old.prior_effective_state
     or new.sufficiency_at_decision is distinct from old.sufficiency_at_decision
     or new.evidence_ids         is distinct from old.evidence_ids
     or new.usable_evidence_count is distinct from old.usable_evidence_count
     or new.decided_by           is distinct from old.decided_by
     or new.decided_at           is distinct from old.decided_at
  then
    raise exception 'what a person decided, and what Nestra knew when they decided it, cannot be edited afterwards'
      using errcode = 'restrict_violation';
  end if;
  return new;
end $fn$;

-- Revoked because every app function is: the invariant refuses any app.*
-- function that public or anon may execute, and it caught this one.
revoke all on function app.forbid_override_rewrite() from public, anon, authenticated;

create trigger student_skill_overrides_frozen
  before update or delete on public.student_skill_overrides
  for each row execute function app.forbid_override_rewrite();

create trigger student_skill_evidence_exclusions_no_update
  before update on public.student_skill_evidence_exclusions
  for each row execute function app.forbid_mutation();

-- =============================================================================
-- RLS - the same family scoping as the rows they describe
-- =============================================================================
-- Deliberately identical in shape to the student_skills policies, resolved
-- through the same capability functions, so "who may see a skill" and "who may
-- see a decision about that skill" cannot drift apart.

alter table public.student_skill_overrides enable row level security;
alter table public.student_skill_evidence_exclusions enable row level security;

create policy student_skill_overrides_select on public.student_skill_overrides
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));

create policy student_skill_overrides_insert on public.student_skill_overrides
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));

create policy student_skill_overrides_update on public.student_skill_overrides
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'update')))
  with check (app.can_student_action(student_id, 'skill', 'update'));

-- No DELETE policy: releasing is the only way a decision ends.

create policy sse_exclusions_select on public.student_skill_evidence_exclusions
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));

create policy sse_exclusions_insert on public.student_skill_evidence_exclusions
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));

create policy sse_exclusions_delete on public.student_skill_evidence_exclusions
  for delete to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'update')));

grant select, insert, update on public.student_skill_overrides to authenticated;
grant select, insert, delete on public.student_skill_evidence_exclusions to authenticated;

create index student_skills_override_idx
  on public.student_skills (active_override_id) where active_override_id is not null;

select app.assert_schema_invariants();
