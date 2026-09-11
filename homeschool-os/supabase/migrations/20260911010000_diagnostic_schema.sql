-- =============================================================================
-- 0092  The adaptive diagnostic: sessions, items, observations, and the record
--       of why it went where it went
-- =============================================================================
-- The question this answers is "what does Nestra have useful evidence about, and
-- where would it be reasonable to explore next" - not "what grade is this child".
-- Everything below is shaped by that difference.
--
-- FOUR THINGS THAT ARE DELIBERATELY ABSENT FROM THIS SCHEMA:
--
--   No score. Not on an item, not on a session, not on a child. There is no
--   number to maximize and nothing that could be divided by anything else on its
--   way to a screen.
--
--   No global ability. There is no column anywhere holding "how good at maths" -
--   a session is scoped to one branch and its findings stay there. Difficulty
--   with fractions cannot become a fact about reading, or even about arithmetic.
--
--   No difficulty rank on items. Items within a skill have a presentation
--   `sequence` so routing is deterministic, and that is all it is. The adaptive
--   part happens between SKILLS, guided by the prerequisite graph.
--
--   No grade, no age. Nothing here stores or reads either, and 0094 refuses the
--   routing functions if their source so much as mentions the columns.
--
-- WHY OBSERVATIONS DO NOT GO STRAIGHT INTO THE PROFILE. A diagnostic that writes
-- its own findings into the canonical profile, and then reads that profile to
-- decide where to go next, is a machine growing more confident by listening to
-- itself. Observations live here, session-local, until a person reviews them.
-- =============================================================================

create type app.diagnostic_modality as enum (
  'question',
  'short_response',
  'demonstration',
  'uploaded_work',
  'parent_observation',
  'interactive');

comment on type app.diagnostic_modality is
  'How an observation is gathered. Present from the start so the diagnostic is '
  'not silently architected as a multiple-choice test: a child demonstrating '
  'something at the kitchen table is evidence of the same standing as an item '
  'answered on a screen.';

-- What a person SAW. Not what Nestra concluded.
create type app.diagnostic_outcome as enum (
  'demonstrated',
  'not_demonstrated',   -- this observation did not show the skill under these
                        -- conditions. It is not "cannot", "failed" or "behind".
  'skipped',
  'not_today');

comment on type app.diagnostic_outcome is
  '`not_demonstrated` means only that this observation did not demonstrate the '
  'skill under these conditions. It never means cannot do it, failed, behind, '
  'deficient, or needing remediation, and it can never lower a profile state. '
  '`skipped` and `not_today` are not unsuccessful observations and can never '
  'count toward the frustration floor.';

create type app.diagnostic_session_status as enum (
  'active', 'paused', 'completed', 'stopped');

create type app.diagnostic_reason_code as enum (
  'existing_evidence_skip',
  'explore_next_skill',
  'prerequisite_probe',
  'uncertainty_probe',
  'success_boundary_reached',
  'frustration_floor_reached',
  'branch_complete');

create type app.diagnostic_stop_reason as enum (
  'branch_complete',
  'frustration_floor',
  'parent_stopped',
  'no_items_available',
  'rule_version_changed');

create type app.diagnostic_review_status as enum ('pending', 'confirmed', 'rejected');

-- =============================================================================
-- Items
-- =============================================================================
-- Catalogue content, not child data: every authenticated user may read them and
-- nobody may write them through the API. `prompt_key` is an i18n key rather than
-- prose, so the wording a child sees is translated and reviewable in the
-- catalogs the family-language guard already checks - rather than sitting in a
-- database row nobody lints.

create table public.diagnostic_items (
  id          uuid primary key default gen_random_uuid(),
  skill_id    uuid not null references public.skills(id) on delete cascade,
  modality    app.diagnostic_modality not null default 'question',
  prompt_key  text not null,
  sequence    integer not null default 1,
  is_seed     boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  constraint diagnostic_items_sequence_ck check (sequence >= 1),
  unique (skill_id, sequence, modality)
);

comment on column public.diagnostic_items.sequence is
  'Presentation order within a skill, so routing is reproducible. It is NOT a '
  'difficulty rank and must never be read as one - the adaptive part of this '
  'diagnostic happens between skills, along the prerequisite graph.';

alter table public.diagnostic_items enable row level security;
create policy diagnostic_items_select on public.diagnostic_items
  for select to authenticated using (active);
grant select on public.diagnostic_items to authenticated;

-- =============================================================================
-- Sessions
-- =============================================================================

create table public.diagnostic_sessions (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students(id) on delete cascade,
  organization_id      uuid references public.organizations(id) on delete set null,
  branch_root_skill_id uuid not null references public.skills(id) on delete cascade,

  status               app.diagnostic_session_status not null default 'active',
  rule_version         text not null,
  -- what the profile looked like when this began, so the route can be re-read
  -- years later against the knowledge it was actually made with
  starting_context     jsonb not null default '{}'::jsonb,

  started_by           uuid not null references public.profiles(id),
  started_at           timestamptz not null default now(),
  paused_at            timestamptz,
  completed_at         timestamptz,
  stop_reason          app.diagnostic_stop_reason,
  stopped_by           uuid references public.profiles(id),
  note                 text,
  created_at           timestamptz not null default now(),

  constraint diagnostic_sessions_finished_ck
    check ((status in ('completed','stopped')) = (completed_at is not null)),
  constraint diagnostic_sessions_stop_reason_ck
    check (status not in ('completed','stopped') or stop_reason is not null)
);

create index diagnostic_sessions_student_idx
  on public.diagnostic_sessions (student_id, started_at desc);
create unique index diagnostic_sessions_one_open_idx
  on public.diagnostic_sessions (student_id, branch_root_skill_id)
  where status in ('active', 'paused');

comment on table public.diagnostic_sessions is
  'One exploration of one branch, for one child. Scoped to a branch on purpose: '
  'there is no session that spans a whole subject, and therefore nothing that '
  'could become a general statement about a child.';

-- =============================================================================
-- What was presented, and why
-- =============================================================================

create table public.diagnostic_session_items (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.diagnostic_sessions(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  skill_id     uuid not null references public.skills(id) on delete cascade,
  item_id      uuid not null references public.diagnostic_items(id) on delete restrict,
  sequence     integer not null,
  reason_code  app.diagnostic_reason_code not null,
  presented_at timestamptz not null default now(),
  unique (session_id, sequence),
  unique (session_id, item_id)
);

create index diagnostic_session_items_session_idx
  on public.diagnostic_session_items (session_id, sequence);

-- =============================================================================
-- What happened
-- =============================================================================
-- A proposal, not a fact about the child. `review_status` starts `pending` and
-- only a person moves it. Nothing here is readable by the recompute in Phase 3
-- until it has been promoted into an evidence event by that person.

create table public.diagnostic_observations (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.diagnostic_sessions(id) on delete cascade,
  session_item_id uuid not null unique references public.diagnostic_session_items(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  skill_id        uuid not null references public.skills(id) on delete cascade,
  outcome         app.diagnostic_outcome not null,
  note            text,
  observed_by     uuid not null references public.profiles(id),
  observed_at     timestamptz not null default now(),

  review_status   app.diagnostic_review_status not null default 'pending',
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  review_note     text,
  promoted_event_id uuid references public.student_skill_events(id) on delete set null,

  constraint diagnostic_observations_review_ck
    check ((review_status = 'pending') = (reviewed_at is null)),
  -- only something a person watched happen can become evidence
  constraint diagnostic_observations_promotable_ck
    check (promoted_event_id is null
           or (review_status = 'confirmed' and outcome = 'demonstrated'))
);

create index diagnostic_observations_session_idx
  on public.diagnostic_observations (session_id, observed_at);
create index diagnostic_observations_student_idx
  on public.diagnostic_observations (student_id, skill_id);

comment on table public.diagnostic_observations is
  'What a person saw during a session. A proposal until reviewed, and invisible '
  'to the Phase 3 recompute either way - promotion writes a separate evidence '
  'event through the existing human-review path.';

-- =============================================================================
-- Why it went where it went
-- =============================================================================
-- Structured codes, resolvable ids. The audit trail is the record; any sentence
-- a screen shows is rendered from this and is never the source of truth.

create table public.diagnostic_routing_decisions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.diagnostic_sessions(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  sequence     integer not null,
  reason_code  app.diagnostic_reason_code not null,
  from_skill_id uuid references public.skills(id) on delete set null,
  to_skill_id   uuid references public.skills(id) on delete set null,
  detail       jsonb not null default '{}'::jsonb,
  decided_at   timestamptz not null default now(),
  unique (session_id, sequence)
);

create index diagnostic_routing_decisions_session_idx
  on public.diagnostic_routing_decisions (session_id, sequence);

-- =============================================================================
-- Nothing in a session may be rewritten after the fact
-- =============================================================================
-- A route that could be edited afterwards is not an audit trail. Observations
-- accept UPDATE only so a person can review them; the trigger refuses any change
-- to what was actually seen.

create or replace function app.forbid_observation_rewrite()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception 'a diagnostic observation is reviewed, not deleted'
      using errcode = 'restrict_violation';
  end if;
  if new.id is distinct from old.id
     or new.session_id      is distinct from old.session_id
     or new.session_item_id is distinct from old.session_item_id
     or new.student_id      is distinct from old.student_id
     or new.skill_id        is distinct from old.skill_id
     or new.outcome         is distinct from old.outcome
     or new.note            is distinct from old.note
     or new.observed_by     is distinct from old.observed_by
     or new.observed_at     is distinct from old.observed_at
  then
    raise exception 'what was observed cannot be edited afterwards; only its review may change'
      using errcode = 'restrict_violation';
  end if;
  return new;
end $fn$;

revoke all on function app.forbid_observation_rewrite() from public, anon, authenticated;

create trigger diagnostic_observations_frozen
  before update or delete on public.diagnostic_observations
  for each row execute function app.forbid_observation_rewrite();

create trigger diagnostic_session_items_append_only
  before update or delete on public.diagnostic_session_items
  for each row execute function app.forbid_mutation();

create trigger diagnostic_routing_decisions_append_only
  before update or delete on public.diagnostic_routing_decisions
  for each row execute function app.forbid_mutation();

-- =============================================================================
-- RLS - the same family scoping as every other thing about a child
-- =============================================================================

alter table public.diagnostic_sessions           enable row level security;
alter table public.diagnostic_session_items      enable row level security;
alter table public.diagnostic_observations       enable row level security;
alter table public.diagnostic_routing_decisions  enable row level security;

create policy diagnostic_sessions_select on public.diagnostic_sessions
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy diagnostic_sessions_insert on public.diagnostic_sessions
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'create'));
create policy diagnostic_sessions_update on public.diagnostic_sessions
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'update')))
  with check (app.can_student_action(student_id, 'skill', 'update'));

create policy diagnostic_session_items_select on public.diagnostic_session_items
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy diagnostic_session_items_insert on public.diagnostic_session_items
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));

create policy diagnostic_observations_select on public.diagnostic_observations
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy diagnostic_observations_insert on public.diagnostic_observations
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));
create policy diagnostic_observations_update on public.diagnostic_observations
  for update to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'update')))
  with check (app.can_student_action(student_id, 'skill', 'update'));

create policy diagnostic_routing_decisions_select on public.diagnostic_routing_decisions
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('skill', 'read')));
create policy diagnostic_routing_decisions_insert on public.diagnostic_routing_decisions
  for insert to authenticated
  with check (app.can_student_action(student_id, 'skill', 'update'));

grant select, insert, update on public.diagnostic_sessions to authenticated;
grant select, insert on public.diagnostic_session_items to authenticated;
grant select, insert, update on public.diagnostic_observations to authenticated;
grant select, insert on public.diagnostic_routing_decisions to authenticated;

select app.assert_schema_invariants();
