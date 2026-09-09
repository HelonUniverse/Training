-- =============================================================================
-- 0082  A four-state model, and the retirement of the percentage
-- =============================================================================
-- `app.mastery_level` was not_started · introduced · developing · progressing ·
-- proficient · mastered, and the column defaulted to `not_started`.
--
-- `not_started` is a verdict about a child. A newly onboarded child would appear
-- with every skill marked "has not started" when the truth is that Nestra has no
-- evidence yet - and the child may well do those things daily. The replacement
-- has an honest default:
--
--     unknown → emerging → developing → secure
--
-- `unknown` says only that Nestra lacks sufficient evidence to characterize the
-- skill. It never implies not started, inability, deficiency, being behind, or
-- needing instruction.
--
-- `student_skills.score numeric(5,2)` bounded 0-100 is retired here. A
-- percentage on a child is the field that becomes "your child is at 62%", and it
-- is not the conceptual source of truth for anything. `student_skill_events.delta`
-- goes with it: a delta is the change in a score that no longer exists.
--
-- HOW THE OLD SCALE MAPS, and why nothing is promoted:
--
--   not_started → unknown      no evidence is not a claim about the child
--   introduced  → unknown      instruction happened; the CHILD showed nothing
--   developing  → developing
--   progressing → developing   never map upward past what evidence supports
--   proficient  → developing   see below
--   mastered    → secure
--
-- Only `mastered` becomes `secure`, because in the old schema `mastered` was the
-- single value that carried a human-confirmation constraint. `proficient` sat
-- below it and carried no such guarantee, so promoting it to the top of the new
-- scale would manufacture a confirmation nobody made.
--
-- `emerging` is NEVER produced by this migration. No old value meant "the child
-- has shown early signs" as distinct from anything else, and inventing it would
-- be inventing knowledge about a child.
-- =============================================================================

create type app.skill_state as enum (
  'unknown',      -- Nestra lacks sufficient evidence to characterize this skill
  'emerging',
  'developing',
  'secure');

comment on type app.skill_state is
  'What a child has SHOWN. `unknown` is a statement about what Nestra knows, '
  'never about the child: it must never imply not started, inability, '
  'deficiency, being behind, or needing instruction. There is no fifth state - '
  'refresh_suggested is a separate advisory signal, not a state.';

-- --- student_skills: the current belief --------------------------------------

alter table public.student_skills
  add column skill_state app.skill_state not null default 'unknown';

update public.student_skills set skill_state = case mastery_level
    when 'not_started' then 'unknown'
    when 'introduced'  then 'unknown'
    when 'developing'  then 'developing'
    when 'progressing' then 'developing'
    when 'proficient'  then 'developing'
    when 'mastered'    then 'secure'
    end::app.skill_state;

drop index if exists student_skills_review_idx;
alter table public.student_skills drop column mastery_level;
alter table public.student_skills drop column score;
create index student_skills_review_idx on public.student_skills (student_id, skill_state);

-- --- student_skill_events: the immutable record ------------------------------
-- Nullable, as `mastery_level` was: an event may record evidence without
-- asserting a state at all.

alter table public.student_skill_events
  add column skill_state app.skill_state;

-- ---------------------------------------------------------------------------
-- student_skill_events is append-only, enforced by a BEFORE UPDATE trigger.
-- A backfill is an UPDATE, so the trigger blocks this migration.
--
-- THIS IS NOT A REASON TO WEAKEN THE TRIGGER. Re-expressing a fact in new
-- columns is not the same act as rewriting history: the historical claim is
-- unchanged, only the columns carrying it are. So the trigger is suspended for
-- exactly the backfill, restored immediately, and the restoration is verified
-- before the migration is allowed to finish.
--
-- Found by running the migration over synthetic rows. Against the empty tables
-- every environment actually has, the UPDATE touches nothing, the trigger never
-- fires, and this migration looks perfect right up until the first deployment
-- that has events in it.
-- ---------------------------------------------------------------------------
alter table public.student_skill_events disable trigger student_skill_events_append_only;


update public.student_skill_events set skill_state = case mastery_level
    when 'not_started' then 'unknown'
    when 'introduced'  then 'unknown'
    when 'developing'  then 'developing'
    when 'progressing' then 'developing'
    when 'proficient'  then 'developing'
    when 'mastered'    then 'secure'
    end::app.skill_state;


alter table public.student_skill_events enable trigger student_skill_events_append_only;

-- The restoration is a post-condition, not an assumption.
do $guard$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
     where tgrelid = 'public.student_skill_events'::regclass
       and tgname = 'student_skill_events_append_only'
       and tgenabled <> 'D')
  then
    raise exception 'the append-only trigger on student_skill_events was left disabled';
  end if;
end $guard$;

alter table public.student_skill_events drop column mastery_level;
alter table public.student_skill_events drop column score;
alter table public.student_skill_events drop column delta;

drop type app.mastery_level;

-- =============================================================================
-- AI alone may never mark a skill `secure` - rebuilt, and corrected
-- =============================================================================
-- The 0012 constraint required `confidence in ('teacher_observed',
-- 'assessment_confirmed')` before a skill could be `mastered`.
--
-- THAT WAS WRONG FOR THIS PRODUCT. It made a parent's own observation
-- insufficient, so in a homeschool - where the parent IS the teacher - no parent
-- could ever record that their child is secure in anything without a third party
-- or a test. That contradicts parent authority, and it is the kind of rule that
-- quietly tells a mother her judgement about her own child does not count.
--
-- What the rule was actually protecting is that a MACHINE must not be the one
-- deciding. So the new constraint asks about provenance and human confirmation,
-- not about which human it was:
--
--   `secure` requires a human confirmation, and requires that the row is not an
--   unreviewed AI proposal. Any observation authority may reach it - parent
--   included.
-- =============================================================================

alter table public.student_skills
  add constraint student_skills_secure_requires_human_ck check (
    skill_state <> 'secure'
    or (record_provenance <> 'ai_proposed_unreviewed'
        and human_confirmed_by is not null
        and human_confirmed_at is not null));

comment on column public.student_skills.skill_state is
  'The current state. `secure` requires human confirmation from any observation '
  'authority, parent included - a machine may never decide it.';

select app.assert_schema_invariants();
