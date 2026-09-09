-- =============================================================================
-- 0089  refresh_suggested: a suggestion, and structurally nothing else
-- =============================================================================
-- Skills fade. Pretending otherwise makes a profile slowly untrue, and a parent
-- who is told her nine-year-old is "secure" in something he last did eighteen
-- months ago is being told something that stopped being true a while ago.
--
-- But time passing is not evidence about a child, and the way this feature goes
-- wrong is entirely predictable: it becomes a fifth state, it decays a child
-- from `secure` back down to `developing`, and a mother opens the app to find
-- her son has been demoted by a calendar.
--
-- SO IT IS NOT A STATE, AND CANNOT BECOME ONE.
--
--   0083 pins app.skill_state to exactly four labels, so `refresh_suggested`
--   cannot be added to the enum without failing the invariants.
--   Nothing here writes to student_skills at all. 0090 adds a structural check
--   that refuses the refresh functions if their source so much as contains an
--   INSERT or UPDATE against that table.
--   `secure` stays `secure` while a refresh is suggested. The advisory sits
--   beside the state and never touches it.
--
-- WHAT IT IS: a derived signal, computed on demand from five conditions, none
-- of which is sufficient alone and one of which is time. There is no
-- `refresh_suggested` column, because a stored boolean is a thing that drifts
-- out of agreement with the conditions that produced it and then gets shown to
-- somebody.
-- =============================================================================

-- --- 1. The family decides whether this exists at all ------------------------
-- OFF for everyone, including every family that already exists. A feature that
-- tells you what to revisit is a feature a family opts into, not one they
-- discover has been judging them since they signed up.

alter table public.families
  add column refresh_advisory_enabled boolean not null default false,
  add column refresh_interval_days    integer not null default 180;

alter table public.families
  add constraint families_refresh_interval_ck
    check (refresh_interval_days between 7 and 3650);

comment on column public.families.refresh_advisory_enabled is
  'Off by default and off for every existing family. A revisit suggestion is '
  'something a family turns on, never something switched on for them.';
comment on column public.families.refresh_interval_days is
  'How long since the last meaningful evidence before a revisit may be '
  'suggested. 180 days is a starting point, not a rule about children.';

-- --- 2. Why a skill is currently relevant ------------------------------------
-- An enumerated list, because "relevant" is exactly the word under which grade
-- level and benchmark expectations creep back in. Every member of this type is
-- something a HUMAN in this family did: set a goal, made a plan, enrolled in a
-- course, or asked. None of them is derivable from a child's age, a grade, a
-- standard, or what other children are doing.

create type app.refresh_relevance_reason as enum (
  'active_learning_goal',           -- a goal a person set, still active
  'active_learning_plan_priority',  -- named in an active plan's priority skills
  'active_course_enrollment',       -- a course the child is actually enrolled in
  'prerequisite_of_current_work',   -- it underpins something relevant above
  'parent_requested');              -- she asked. That is relevance enough.

comment on type app.refresh_relevance_reason is
  'The complete list of ways a skill can be currently relevant. Grade level, '
  'age, standards, benchmark expectations and cohort norms are deliberately '
  'absent and may not be added: relevance is what this family is doing, never '
  'what a child of this age is supposed to be doing.';

-- --- 3. Why there is NO suggestion -------------------------------------------
-- The negative answer is as important as the positive one. A parent who asks
-- "why is Nestra not suggesting anything here?" gets a code, not a shrug.

create type app.refresh_block_reason as enum (
  'family_has_not_enabled_it',
  'not_human_confirmed_secure',
  'evidence_too_thin_to_revisit',
  'no_current_relevance',
  'interval_has_not_elapsed',
  'recently_dismissed',
  'no_profile_yet');

create type app.refresh_decision_kind as enum (
  'dismissed',
  'revisit_requested',
  'revisit_completed');

-- --- 4. What the family said about it ----------------------------------------
-- Append-only. A dismissal is a small thing to record and a large thing to get
-- wrong: without it the product asks again tomorrow, which is nagging, and
-- nagging a homeschool parent about her own child is the fastest way to make
-- this feature something she turns off and resents.

create table public.student_skill_refresh_decisions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  skill_id          uuid not null references public.skills(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  kind              app.refresh_decision_kind not null,
  note              text,

  -- what was true when she decided. A dismissal is about THESE conditions;
  -- when they change, the question is a different question.
  effective_state_at_decision   app.skill_state,
  sufficiency_at_decision       app.evidence_sufficiency,
  anchor_at_decision            date,

  decided_by        uuid not null references public.profiles(id),
  decided_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index student_skill_refresh_decisions_lookup_idx
  on public.student_skill_refresh_decisions (student_id, skill_id, decided_at desc);

comment on table public.student_skill_refresh_decisions is
  'Dismissals, revisit requests and completed revisits. Append-only: a decision '
  'is superseded by a later one, never edited away. Nothing in here changes a '
  'skill state - dismissing a suggestion about a `secure` skill leaves it '
  '`secure`.';

create trigger student_skill_refresh_decisions_append_only
  before update or delete on public.student_skill_refresh_decisions
  for each row execute function app.forbid_mutation();

-- --- 5. RLS: the same family scoping as the skill it talks about -------------

alter table public.student_skill_refresh_decisions enable row level security;

create policy ssrd_select on public.student_skill_refresh_decisions
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));

create policy ssrd_insert on public.student_skill_refresh_decisions
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));

-- No UPDATE or DELETE policy, and the trigger above refuses both anyway.

grant select, insert on public.student_skill_refresh_decisions to authenticated;

select app.assert_schema_invariants();
