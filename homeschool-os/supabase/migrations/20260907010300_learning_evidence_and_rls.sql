-- =============================================================================
-- 0069  STEP 5 - learning evidence, and who may see any of this
-- =============================================================================
-- EVIDENCE IS NOT MASTERY. This is the single most important sentence in the
-- migration.
--
-- `student_skills` and `student_skill_events` (0014) already model mastery, and
-- STEP 5 does not write to them. Not once, not as a side effect, not "just the
-- evidence_count". A worksheet that appears to involve equivalent fractions
-- means a parent has some evidence related to equivalent fractions. It does not
-- mean the child has learned them, and a product that quietly slides from the
-- first to the second is one that tells families things about their children
-- that are not true.
--
-- So learning_evidence is its OWN table. A later step may build a mastery
-- engine that reads it. Nothing in STEP 5 lets evidence become a mastery level.
-- =============================================================================

create type app.evidence_relation as enum (
  'demonstrates',  -- the work shows the skill being used
  'practices',     -- the work is practice at the skill
  'introduces',    -- the work is a first encounter
  'assesses'       -- the work measures it
);

create table public.learning_evidence (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  skill_id      uuid not null references public.skills(id) on delete cascade,
  family_id     uuid references public.families(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  relation      app.evidence_relation not null default 'demonstrates',
  occurred_on   date,

  -- WHAT the evidence is. Any of these may point somewhere; at least one must.
  portfolio_item_id uuid references public.portfolio_items(id) on delete cascade,
  document_id       uuid references public.documents(id) on delete cascade,
  assessment_result_id uuid references public.assessment_results(id) on delete cascade,
  activity_log_id   uuid references public.activity_logs(id) on delete cascade,
  enrollment_id     uuid references public.student_course_enrollments(id) on delete set null,
  lesson_id         uuid references public.course_lessons(id) on delete set null,
  progress_event_id uuid references public.external_progress_events(id) on delete set null,
  note              text,

  -- WHO says so, and did a person confirm it. An AI-proposed link is not
  -- evidence until someone says it is.
  source_type   app.source_type not null,
  ai_suggestion_id uuid references public.ai_suggestions(id) on delete set null,
  confirmed_by  uuid references auth.users(id) on delete set null,
  confirmed_at  timestamptz,

  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),

  -- Evidence about nothing is not evidence.
  constraint evidence_has_a_source check (
    portfolio_item_id is not null or document_id is not null
    or assessment_result_id is not null or activity_log_id is not null
    or progress_event_id is not null or note is not null),
  -- Confirmation is a person and a time, or it has not happened.
  constraint evidence_confirmation_complete check (
    (confirmed_by is null and confirmed_at is null)
    or (confirmed_by is not null and confirmed_at is not null))
);

create index learning_evidence_student_idx
  on public.learning_evidence (student_id, skill_id, occurred_on desc);
create index learning_evidence_skill_idx on public.learning_evidence (skill_id);
create index learning_evidence_item_idx on public.learning_evidence (portfolio_item_id);
select app.attach_updated_at('public.learning_evidence');

comment on table public.learning_evidence is
  'Work that RELATES to a skill. Never a mastery claim. student_skills holds '
  'mastery and STEP 5 does not write to it - not even evidence_count - because '
  'a product that slides from "shows this skill" to "has learned this skill" '
  'tells families things about their children that are not true.';

/**
 * Evidence proposed by a model is not confirmed evidence.
 *
 * The rule is the same one that governs skill mappings: AI proposes, humans
 * decide. Here it is enforced rather than remembered.
 */
create or replace function app.protect_evidence_provenance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type = 'ai_suggestion'
     and new.confirmed_at is not null and new.confirmed_by is null then
    raise exception 'AI-proposed evidence is confirmed by a person, or not at all'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function app.protect_evidence_provenance() from public, anon, authenticated;

create trigger protect_evidence_provenance
  before insert or update on public.learning_evidence
  for each row execute function app.protect_evidence_provenance();

-- =============================================================================
-- The capability matrix
-- =============================================================================
-- Read this as the answer to "who may do what with a curriculum, and with the
-- evidence behind a skill". Two deliberate absences:
--
--   * grant_evaluator has NO curriculum rows at all. An evaluator reviews a
--     child's work; that is not a reason to show them how the family plans its
--     year, which books they bought, or what they are behind on.
--   * grant_evaluator's learning_evidence read is section-scoped
--     (requires_section = true), so it works only when the grant the family
--     actually signed lists it. Access follows the grant, never the role.
-- =============================================================================

insert into app.capabilities (relationship, resource, action, requires_section, notes)
select v.rel::app.relationship_kind, v.res::app.resource_type,
       a::app.resource_action, v.sec, v.note
from (values

  -- === the child: may see what they are studying, may change nothing =========
  ('student_self','curriculum',        array['read'], false,
   'A student sees the course they are enrolled in. STEP 5 does not widen this.'),
  ('student_self','learning_evidence', array['read'], false, null),

  -- === guardians =============================================================
  ('guardian_full','curriculum',        array['read','create','update','delete'], false, null),
  ('guardian_full','learning_evidence', array['read','create','update','delete'], false,
   'Confirming "yes, this work shows that skill" is a create here.'),

  ('guardian_standard','curriculum',        array['read','create','update'], false,
   'Standard guardians manage the academic day; removing a curriculum is a full-guardian act.'),
  ('guardian_standard','learning_evidence', array['read','create','update'], false, null),

  ('guardian_view_only','curriculum',        array['read'], false, null),
  ('guardian_view_only','learning_evidence', array['read'], false, null),

  -- === staff, only for students they are actually assigned ==================
  ('staff_assigned_write','curriculum',        array['read','create','update'], false, null),
  ('staff_assigned_write','learning_evidence', array['read','create','update'], false, null),
  ('staff_assigned_read','curriculum',         array['read'], false, null),
  ('staff_assigned_read','learning_evidence',  array['read'], false, null),
  ('class_staff','curriculum',                 array['read'], false, null),
  ('class_staff','learning_evidence',          array['read'], false, null),

  -- === organization administration ==========================================
  ('org_admin','curriculum',        array['read','create','update','delete'], false, null),
  ('org_admin','learning_evidence', array['read','create','update'], false, null),

  -- === grants ================================================================
  -- No curriculum row for an evaluator, on purpose. See the header.
  ('grant_evaluator','learning_evidence', array['read'], true,
   'Section-scoped: only if the signed grant lists it. Never automatic.'),
  ('grant_review','learning_evidence',    array['read'], true, null),

  -- === break-glass support: read, and only read =============================
  ('platform_support','curriculum',        array['read'], false, null),
  ('platform_support','learning_evidence', array['read'], false, null)

) as v(rel, res, actions, sec, note), unnest(v.actions) as a;

-- =============================================================================
-- RLS for everything STEP 5 added
-- =============================================================================

alter table public.learning_evidence enable row level security;

-- --- evidence ----------------------------------------------------------------

create policy learning_evidence_select on public.learning_evidence
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('learning_evidence', 'read')));

create policy learning_evidence_insert on public.learning_evidence
  for insert to authenticated
  with check (app.can_student_action(student_id, 'learning_evidence', 'create'));

create policy learning_evidence_update on public.learning_evidence
  for update to authenticated
  using (app.can_student_action(student_id, 'learning_evidence', 'update'))
  with check (app.can_student_action(student_id, 'learning_evidence', 'update'));

create policy learning_evidence_delete on public.learning_evidence
  for delete to authenticated
  using (app.can_student_action(student_id, 'learning_evidence', 'delete'));

grant select, insert, update, delete on public.curriculum_providers,
      public.courses, public.course_units, public.course_lessons,
      public.learning_resources, public.student_course_enrollments,
      public.learning_evidence to authenticated;
grant select, insert on public.external_progress_events to authenticated;
grant select on public.resource_skills to authenticated;
grant select, update on public.ai_suggestion_fields to authenticated;

select app.assert_schema_invariants();
