-- =============================================================================
-- 0076b  (the enum labels above must be committed before they can be used)
-- =============================================================================

create type app.mapping_provenance as enum (
  'official_source',    -- the framework itself publishes this relationship
  'nestra_reviewed',    -- a Nestra reviewer made and checked this call
  'imported',           -- came in with a source import, not yet re-checked
  'teacher_suggested',
  'parent_reference',   -- a family's own note that this relates to that
  'provider_claimed',   -- a curriculum vendor asserts it
  'ai_suggested');      -- a machine proposed it. Never publishable on its own.

create type app.mapping_status as enum ('proposed', 'approved', 'rejected', 'superseded');

alter table public.skill_standards
  add column provenance     app.mapping_provenance not null default 'nestra_reviewed',
  add column status         app.mapping_status not null default 'proposed',
  add column confidence     numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  add column ai_suggestion_id uuid references public.ai_suggestions(id) on delete set null,
  add column rationale      text,
  add column approved_by    uuid references auth.users(id) on delete set null,
  add column approved_at    timestamptz,
  add column superseded_by_id uuid references public.skill_standards(id) on delete set null;

comment on column public.skill_standards.provenance is
  'The AUTHORITY behind the claim, which is not the same as confidence in it. '
  'provider_claimed is never silently upgraded to nestra_reviewed.';

/**
 * A mapping becomes approved only by a person, and a machine-proposed one only
 * by a standards administrator. Confidence is not a permission.
 */
create or replace function app.protect_mapping_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' then
    if new.approved_by is null or new.approved_at is null then
      raise exception 'an approved mapping records who approved it and when'
        using errcode = 'check_violation';
    end if;
    -- An AI-proposed mapping needs a standards administrator, acting as
    -- themselves. Naming somebody else as the approver is the obvious way to
    -- dress a machine's guess up as a person's judgement, so the approver must
    -- be the caller.
    if new.provenance = 'ai_suggested'
       and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
      if not app.is_standards_admin() then
        raise exception
          'an AI-proposed mapping is approved by a standards administrator, not by its confidence'
          using errcode = 'insufficient_privilege';
      end if;
      if new.approved_by is distinct from auth.uid() then
        raise exception 'the approver of an AI-proposed mapping is the person approving it'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end $$;

revoke all on function app.protect_mapping_approval() from public, anon, authenticated;

create trigger protect_mapping_approval
  before insert or update on public.skill_standards
  for each row execute function app.protect_mapping_approval();

-- A family sees APPROVED mappings. A proposal is internal work in progress, and
-- showing one would be showing a family a guess as though it were a reference.
drop policy if exists skill_standards_select on public.skill_standards;
create policy skill_standards_select on public.skill_standards
  for select to authenticated
  using (status = 'approved' or app.is_standards_admin());
create policy skill_standards_admin_write on public.skill_standards
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

-- =============================================================================
-- A publisher's own alignment claim
-- =============================================================================
-- The preferred model is Resource -> Nestra Skill -> Standard: that is what we
-- actually believe. But when a publisher says "lesson 22 aligns to benchmark X",
-- that is a claim about THEIR lesson and THEIR reading of the benchmark, and
-- routing it through a Nestra skill would launder it into our own claim.

create table public.resource_standards (
  id            uuid primary key default gen_random_uuid(),
  standard_id   uuid not null references public.standards(id) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,
  lesson_id     uuid references public.course_lessons(id) on delete cascade,
  resource_id   uuid references public.learning_resources(id) on delete cascade,
  provenance    app.mapping_provenance not null default 'provider_claimed',
  status        app.mapping_status not null default 'proposed',
  claim_url     text,
  note          text,
  approved_by   uuid references auth.users(id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  constraint resource_standard_targets_something
    check (num_nonnulls(course_id, lesson_id, resource_id) >= 1)
);
create index resource_standards_standard_idx on public.resource_standards (standard_id);
create index resource_standards_course_idx   on public.resource_standards (course_id);

comment on table public.resource_standards is
  'A publisher''s own alignment claim, kept as theirs. Distinguished in the UI '
  'from Resource -> Skill -> Standard, which is our claim about the learning.';

alter table public.resource_standards enable row level security;

-- Readable alongside the course it belongs to; writable only by a standards
-- administrator, so a vendor claim cannot be entered as though we checked it.
create policy resource_standards_select on public.resource_standards
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = resource_standards.course_id)
         or app.is_standards_admin());
create policy resource_standards_admin_write on public.resource_standards
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

-- =============================================================================
-- Family preference: how much of this a family wants to see
-- =============================================================================

create type app.standards_visibility as enum ('hidden', 'simple', 'detailed');

alter table public.families
  add column standards_visibility app.standards_visibility not null default 'simple';

comment on column public.families.standards_visibility is
  'How much standards reference a family wants: hidden, a single quiet line, or '
  'the full reference. It changes what is DISPLAYED and nothing else - no '
  'setting here alters a child''s skills, evidence or learning path.';

select app.assert_schema_invariants();
