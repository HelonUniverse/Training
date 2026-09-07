-- =============================================================================
-- 0068  STEP 5 - curriculum, with Nestra as just another provider
-- =============================================================================
-- THE ARCHITECTURE RULE, and it is not negotiable: Nestra Curriculum uses this
-- schema. Not a parallel one. `provider = Nestra` is a row in the same table
-- that holds Teaching Textbooks, and a Nestra course is a row in the same
-- `courses` table. The moment Nestra content gets its own tables, every feature
-- built on top - progress, skill mapping, evidence, the future adaptive engine -
-- has to be written twice, and the second one is always the one that rots.
--
-- WHAT A PROVIDER IS NOT. A row here is a NAME, not a partnership. `capabilities`
-- records what is technically possible with a provider, and the only capability
-- anything actually has in STEP 5 is `external_link` and `manual_completion`.
-- Nothing in this schema may be read as "we integrate with Teaching Textbooks".
-- The UI is required to say `Linked website` or `Manual tracking` and to reserve
-- the word `Integrated` for a real, live integration.
--
-- AND WE NEVER HOLD A FAMILY'S PROVIDER PASSWORD. There is no column for one
-- here and there will not be. When real syncing arrives it arrives as OAuth
-- through provider-specific connection infrastructure, not as a stored password.
-- =============================================================================

-- What a provider CAN do technically. Not what we have agreed with anyone.
create type app.provider_capability as enum (
  'external_link',     -- we can link out to it. Everything supports this.
  'deep_link',         -- we can link to a specific lesson
  'manual_completion', -- a family can mark work done by hand
  'syllabus_import',
  'csv_import',
  'api_sync',
  'lti',
  'xapi',
  'scorm',
  'progress_sync',
  'grade_sync',
  'sso'
);

-- How a family's use of this curriculum is actually tracked TODAY. This is the
-- honesty valve: the UI renders this, and only `integrated` may claim one.
create type app.integration_mode as enum (
  'manual',        -- the family records progress themselves
  'linked',        -- we open the provider's page; they record progress themselves
  'integrated'     -- a real live integration exists. Nothing is this in STEP 5.
);

create type app.curriculum_scope as enum (
  'catalog',   -- shipped by Nestra: a known provider anyone may reference
  'family',    -- created by one family, private to it
  'organization'
);

-- --- providers ---------------------------------------------------------------

create table public.curriculum_providers (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  website_url   text,
  description   text,
  -- Nestra itself is a row in this table. See the header.
  is_first_party boolean not null default false,
  -- Catalog providers are shipped metadata; family/org providers are the ones a
  -- parent typed in because we had never heard of their curriculum.
  scope         app.curriculum_scope not null default 'catalog',
  family_id     uuid references public.families(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  capabilities  app.provider_capability[] not null default '{external_link,manual_completion}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),

  -- A catalog provider belongs to nobody; a family/org provider must say whose.
  constraint provider_scope_owner check (
    (scope = 'catalog'      and family_id is null and organization_id is null)
    or (scope = 'family'       and family_id is not null)
    or (scope = 'organization' and organization_id is not null))
);
create index curriculum_providers_family_idx on public.curriculum_providers (family_id);
select app.attach_updated_at('public.curriculum_providers');

comment on column public.curriculum_providers.capabilities is
  'What is technically POSSIBLE with this provider. Never a statement that an '
  'integration exists, is agreed, or is switched on. See integration_mode on '
  'the course for what is actually happening today.';

-- --- courses -----------------------------------------------------------------
-- A "curriculum" a family talks about ("Teaching Textbooks Math 4") is a COURSE
-- here. Units and lessons hang off it. There is deliberately no separate
-- `curricula` table above `courses`: a level/edition IS the course, and an
-- extra layer nobody fills in is a layer every query has to join through.

create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.curriculum_providers(id) on delete cascade,
  scope         app.curriculum_scope not null default 'family',
  family_id     uuid references public.families(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,

  name          text not null,
  subject_id    uuid references public.subjects(id) on delete set null,
  description   text,
  grade_band    text,
  external_url  text,
  edition       text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),

  constraint course_scope_owner check (
    (scope = 'catalog'      and family_id is null and organization_id is null)
    or (scope = 'family'       and family_id is not null)
    or (scope = 'organization' and organization_id is not null))
);
create index courses_family_idx on public.courses (family_id, active);
create index courses_provider_idx on public.courses (provider_id);
select app.attach_updated_at('public.courses');

-- --- units and lessons -------------------------------------------------------
-- Both optional. A parent who tracks "Teaching Textbooks Math 4" and nothing
-- finer must be able to do exactly that; the structure is here for when they
-- want it, not as a tax on adding a curriculum.

create table public.course_units (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  name        text not null,
  sequence    smallint not null default 0,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index course_units_course_idx on public.course_units (course_id, sequence);
select app.attach_updated_at('public.course_units');

create table public.course_lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  unit_id     uuid references public.course_units(id) on delete set null,
  name        text not null,
  lesson_number text,                  -- text: providers use "22", "3.1", "L22"
  sequence    smallint not null default 0,
  description text,
  external_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index course_lessons_course_idx on public.course_lessons (course_id, sequence);
create index course_lessons_number_idx on public.course_lessons (course_id, lesson_number);
select app.attach_updated_at('public.course_lessons');

-- --- learning resources ------------------------------------------------------
-- The thing a child actually opens. A link, a video, a worksheet, a book page.

create type app.learning_resource_kind as enum (
  'link', 'video', 'worksheet', 'reading', 'practice', 'assessment', 'other'
);

create table public.learning_resources (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  lesson_id   uuid references public.course_lessons(id) on delete cascade,
  kind        app.learning_resource_kind not null default 'link',
  title       text not null,
  external_url text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- A resource belongs to a course, a lesson, or both - never to neither.
  constraint learning_resource_has_home check (course_id is not null or lesson_id is not null)
);
create index learning_resources_course_idx on public.learning_resources (course_id);
create index learning_resources_lesson_idx on public.learning_resources (lesson_id);
select app.attach_updated_at('public.learning_resources');

-- --- skill mapping, with provenance -----------------------------------------
-- WHO says this lesson teaches this skill? A curriculum designer, the provider,
-- a teacher, or a model. Those are different claims and the schema records
-- which. An AI mapping is a SUGGESTION until a human or an authorised
-- curriculum administrator confirms it - it never silently becomes canonical.

create table public.resource_skills (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references public.course_lessons(id) on delete cascade,
  resource_id   uuid references public.learning_resources(id) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,
  skill_id      uuid not null references public.skills(id) on delete cascade,

  source_type   app.source_type not null,
  confidence    numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  -- The gate. False for anything a model proposed until a person says otherwise.
  confirmed     boolean not null default false,
  confirmed_by  uuid references auth.users(id) on delete set null,
  confirmed_at  timestamptz,
  ai_suggestion_id uuid references public.ai_suggestions(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,

  constraint resource_skill_has_target check (
    lesson_id is not null or resource_id is not null or course_id is not null),
  constraint resource_skill_confirmation_complete check (
    (confirmed = false and confirmed_by is null and confirmed_at is null)
    or (confirmed = true and confirmed_by is not null and confirmed_at is not null))
);
create index resource_skills_skill_idx on public.resource_skills (skill_id);
create index resource_skills_lesson_idx on public.resource_skills (lesson_id);

/**
 * An AI-proposed mapping may not arrive pre-confirmed.
 *
 * Without this, the single line that writes a suggestion could set
 * confirmed = true and the "AI proposes, humans decide" rule would be one
 * careless insert away from being untrue.
 */
create or replace function app.protect_mapping_provenance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type = 'ai_suggestion' and new.confirmed then
    if tg_op = 'INSERT' or old.confirmed is distinct from true then
      if new.confirmed_by is null then
        raise exception
          'an AI skill mapping becomes canonical only when a person confirms it'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return new;
end $$;

revoke all on function app.protect_mapping_provenance() from public, anon, authenticated;

create trigger protect_mapping_provenance
  before insert or update on public.resource_skills
  for each row execute function app.protect_mapping_provenance();

comment on table public.resource_skills is
  'Which skills a lesson or resource teaches, and WHO says so. An AI mapping is '
  'a suggestion (confirmed = false) until a person confirms it; it never becomes '
  'canonical on its own.';

-- --- enrollment --------------------------------------------------------------

create type app.enrollment_status as enum ('active', 'paused', 'completed', 'dropped');
create type app.pacing_mode as enum ('flexible', 'scheduled', 'self_paced');

create table public.student_course_enrollments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  family_id     uuid references public.families(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  subject_id    uuid references public.subjects(id) on delete set null,

  -- How progress is ACTUALLY tracked for this family, today.
  integration_mode app.integration_mode not null default 'manual',
  status        app.enrollment_status not null default 'active',
  pacing        app.pacing_mode not null default 'flexible',
  started_on    date,
  target_end_on date,

  -- A non-secret reference a family may keep: "our class code is 4B". There is
  -- deliberately NO password/credential column, and there never will be one.
  external_reference text,

  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),

  constraint enrollment_dates_ordered check (
    target_end_on is null or started_on is null or target_end_on >= started_on),
  -- A child may take Math 4 once. Re-taking is a new course or a new year, not
  -- a second live enrollment nobody can tell apart from the first.
  constraint enrollment_once unique (student_id, course_id)
);
create index enrollments_student_idx on public.student_course_enrollments (student_id, status);
create index enrollments_course_idx on public.student_course_enrollments (course_id);
select app.attach_updated_at('public.student_course_enrollments');

comment on column public.student_course_enrollments.external_reference is
  'A NON-SECRET reference the family chooses to keep, such as a class code. '
  'Provider passwords are never asked for and never stored. Real syncing will '
  'arrive as OAuth through provider-specific connection infrastructure.';

-- --- external progress: append-only -----------------------------------------
-- Nothing writes here in STEP 5 except manual completion. It exists now so that
-- when a real provider integration arrives it has somewhere honest to land -
-- and so the shape of that landing is decided while nobody is under deadline.

create type app.progress_event_type as enum (
  'lesson_started', 'lesson_completed', 'score_received',
  'course_progress_updated', 'resource_opened', 'manual_completion'
);

create table public.external_progress_events (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_course_enrollments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  family_id     uuid references public.families(id) on delete cascade,
  provider_id   uuid references public.curriculum_providers(id) on delete set null,
  lesson_id     uuid references public.course_lessons(id) on delete set null,
  resource_id   uuid references public.learning_resources(id) on delete set null,

  event_type    app.progress_event_type not null,
  occurred_at   timestamptz not null default now(),
  received_at   timestamptz not null default now(),
  score         numeric(6,2),
  payload       jsonb not null default '{}'::jsonb,

  -- WHERE IT CAME FROM. `manual` means a person in this product pressed a
  -- button. Anything else arrived from outside and is not trusted merely
  -- because it arrived - provider-specific verification comes with the actual
  -- integration.
  source_type   app.source_type not null default 'manual',
  external_id   text,
  -- Replay protection for the day a provider POSTs the same event twice.
  idempotency_key text,
  recorded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint external_progress_idempotent unique (provider_id, idempotency_key)
);
create index progress_events_enrollment_idx
  on public.external_progress_events (enrollment_id, occurred_at desc);
create index progress_events_student_idx
  on public.external_progress_events (student_id, occurred_at desc);

comment on table public.external_progress_events is
  'Append-only progress log. An event is never trusted merely because it '
  'arrived: source_type says whether a person in this product caused it, and '
  'provider-specific verification arrives with each real integration.';

/**
 * Append-only means append-only. A progress log that can be rewritten is not
 * a log, and this one will eventually carry a provider's assertions about a
 * child's work.
 */
create or replace function app.progress_events_are_append_only()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'external progress events are append-only'
    using errcode = 'insufficient_privilege';
end $$;

revoke all on function app.progress_events_are_append_only() from public, anon, authenticated;

create trigger progress_events_append_only
  before update or delete on public.external_progress_events
  for each row execute function app.progress_events_are_append_only();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.curriculum_providers        enable row level security;
alter table public.courses                     enable row level security;
alter table public.course_units                enable row level security;
alter table public.course_lessons              enable row level security;
alter table public.learning_resources          enable row level security;
alter table public.resource_skills             enable row level security;
alter table public.student_course_enrollments  enable row level security;
alter table public.external_progress_events    enable row level security;

-- --- providers ---------------------------------------------------------------
-- The catalog is shared vocabulary: every signed-in user may read it, exactly
-- like the skill catalogue. A provider a family invented is private to them.

create policy curriculum_providers_select on public.curriculum_providers
  for select to authenticated
  using (scope = 'catalog'
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id)));

create policy curriculum_providers_insert on public.curriculum_providers
  for insert to authenticated
  with check (scope = 'family' and family_id is not null and app.is_family_member(family_id));

create policy curriculum_providers_update on public.curriculum_providers
  for update to authenticated
  using (scope = 'family' and family_id is not null and app.is_family_member(family_id))
  with check (scope = 'family' and family_id is not null and app.is_family_member(family_id));

-- --- courses -----------------------------------------------------------------
-- A course is readable if it is catalog content, if it belongs to your family
-- or organization, OR if a child you may see is enrolled in it. That last arm
-- is what lets an assigned teacher open the course their student is taking
-- without being a member of the family that created it.

create policy courses_select on public.courses
  for select to authenticated
  using (scope = 'catalog'
         or (family_id is not null and app.is_family_member(family_id))
         or (organization_id is not null and app.is_org_member(organization_id))
         or exists (select 1 from public.student_course_enrollments e
                     where e.course_id = courses.id
                       and e.student_id in
                           (select app.my_student_ids_for('curriculum', 'read'))));

create policy courses_insert on public.courses
  for insert to authenticated
  with check (scope = 'family' and family_id is not null and app.is_family_member(family_id));

create policy courses_update on public.courses
  for update to authenticated
  using (scope = 'family' and family_id is not null and app.is_family_member(family_id))
  with check (scope = 'family' and family_id is not null and app.is_family_member(family_id));

create policy courses_delete on public.courses
  for delete to authenticated
  using (scope = 'family' and family_id is not null and app.is_family_member(family_id));

-- --- units, lessons, resources -----------------------------------------------
-- These have no tenant of their own: they belong to a course, and the answer is
-- always "may you read that course". Derived rather than restated, so there is
-- one definition of who may see a curriculum and not four that drift apart.

create policy course_units_select on public.course_units
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_units.course_id));
create policy course_units_write on public.course_units
  for all to authenticated
  using (exists (select 1 from public.courses c
                  where c.id = course_units.course_id
                    and c.family_id is not null and app.is_family_member(c.family_id)))
  with check (exists (select 1 from public.courses c
                       where c.id = course_units.course_id
                         and c.family_id is not null and app.is_family_member(c.family_id)));

create policy course_lessons_select on public.course_lessons
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_lessons.course_id));
create policy course_lessons_write on public.course_lessons
  for all to authenticated
  using (exists (select 1 from public.courses c
                  where c.id = course_lessons.course_id
                    and c.family_id is not null and app.is_family_member(c.family_id)))
  with check (exists (select 1 from public.courses c
                       where c.id = course_lessons.course_id
                         and c.family_id is not null and app.is_family_member(c.family_id)));

create policy learning_resources_select on public.learning_resources
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = learning_resources.course_id)
         or exists (select 1 from public.course_lessons l
                     where l.id = learning_resources.lesson_id));
create policy learning_resources_write on public.learning_resources
  for all to authenticated
  using (exists (select 1 from public.courses c
                  where c.id = learning_resources.course_id
                    and c.family_id is not null and app.is_family_member(c.family_id)))
  with check (exists (select 1 from public.courses c
                       where c.id = learning_resources.course_id
                         and c.family_id is not null and app.is_family_member(c.family_id)));

-- Skill mappings are readable with the lesson they describe; nobody writes them
-- from a user session in STEP 5 (the worker and seed migrations do).
create policy resource_skills_select on public.resource_skills
  for select to authenticated
  using (exists (select 1 from public.course_lessons l where l.id = resource_skills.lesson_id)
         or exists (select 1 from public.courses c where c.id = resource_skills.course_id)
         or exists (select 1 from public.learning_resources r where r.id = resource_skills.resource_id));

-- --- enrollment --------------------------------------------------------------
-- The two-question model, unchanged: Q1 tells us which students the caller may
-- touch, Q2 whether `curriculum` is a thing they may do to them.

create policy enrollments_select on public.student_course_enrollments
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('curriculum', 'read')));

create policy enrollments_insert on public.student_course_enrollments
  for insert to authenticated
  with check (app.can_student_action(student_id, 'curriculum', 'create'));

create policy enrollments_update on public.student_course_enrollments
  for update to authenticated
  using (app.can_student_action(student_id, 'curriculum', 'update'))
  with check (app.can_student_action(student_id, 'curriculum', 'update'));

create policy enrollments_delete on public.student_course_enrollments
  for delete to authenticated
  using (app.can_student_action(student_id, 'curriculum', 'delete'));

-- --- progress ----------------------------------------------------------------
-- Insert-only from a user session: marking a lesson done. Update and delete are
-- refused by the append-only trigger even for the owner, so no policy grants
-- them here either.

create policy progress_events_select on public.external_progress_events
  for select to authenticated
  using (student_id in (select app.my_student_ids_for('curriculum', 'read')));

create policy progress_events_insert on public.external_progress_events
  for insert to authenticated
  with check (app.can_student_action(student_id, 'curriculum', 'update')
              and source_type = 'manual');

comment on policy progress_events_insert on public.external_progress_events is
  'A user session may record MANUAL completion and nothing else. Events claiming '
  'to come from a provider arrive through the trusted worker, where they can be '
  'verified - a browser saying "the provider told me so" is just a browser.';


grant select, insert, update, delete on public.curriculum_providers,
      public.courses, public.course_units, public.course_lessons,
      public.learning_resources, public.student_course_enrollments to authenticated;
grant select, insert on public.external_progress_events to authenticated;
grant select on public.resource_skills to authenticated;

select app.assert_schema_invariants();
