-- =============================================================================
-- 0016  Lessons and assignments
-- =============================================================================

create table public.lessons (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid references public.organizations(id) on delete cascade,
  family_id                 uuid references public.families(id) on delete cascade,
  class_id                  uuid references public.classes(id) on delete set null,
  subject_id                uuid references public.subjects(id) on delete set null,
  academic_year_id          uuid references public.academic_years(id) on delete set null,
  title                     text not null,
  objective                 text,
  duration_minutes          int check (duration_minutes is null or duration_minutes > 0),
  grade_level               text,
  difficulty                text,
  learning_style            text,
  materials                 jsonb not null default '[]'::jsonb,
  sections                  jsonb not null default '{}'::jsonb,  -- warm_up/instruction/activity/...
  standards                 jsonb not null default '[]'::jsonb,
  skill_ids                 uuid[] not null default '{}',
  portfolio_recommendation  text,
  status                    app.lesson_status not null default 'draft',
  scheduled_for             date,
  template_of_id            uuid references public.lessons(id) on delete set null,
  is_template               boolean not null default false,
  locale                    text references public.locales(code),
  -- provenance
  source                    app.lesson_source not null default 'manual',
  source_type               app.source_type not null default 'manual',
  source_id                 uuid,
  entered_by                uuid references public.profiles(id),
  ai_generated              boolean not null default false,
  ai_suggestion_id          uuid,                                -- FK added in 0020
  ai_usage_event_id         uuid,                                -- FK added in 0020
  human_confirmed_by        uuid references public.profiles(id),
  human_confirmed_at        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references public.profiles(id),
  updated_by                uuid references public.profiles(id),
  deleted_at                timestamptz,
  deleted_by                uuid references public.profiles(id),
  constraint lessons_scope_ck check (organization_id is not null or family_id is not null),
  constraint lessons_ai_provenance_ck check (
    not ai_generated or (human_confirmed_by is not null and human_confirmed_at is not null))
);
create index lessons_org_idx on public.lessons (organization_id, scheduled_for) where deleted_at is null;
create index lessons_family_idx on public.lessons (family_id, scheduled_for) where deleted_at is null;
create index lessons_class_idx on public.lessons (class_id) where deleted_at is null;
create index lessons_skills_idx on public.lessons using gin (skill_ids);
select app.attach_updated_at('public.lessons');

comment on constraint lessons_ai_provenance_ck on public.lessons is
  'An AI-generated lesson is only persisted once a person has saved it; the draft '
  'preview lives in the client until then.';

alter table public.calendar_events
  add constraint calendar_events_lesson_fk
  foreign key (lesson_id) references public.lessons(id) on delete set null;

create table public.lesson_students (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  status        app.lesson_status not null default 'planned',
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  unique (lesson_id, student_id)
);
create index lesson_students_student_idx on public.lesson_students (student_id);
select app.attach_updated_at('public.lesson_students');

create table public.lesson_groups (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  unique (lesson_id, class_id)
);

create table public.assignments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  lesson_id         uuid references public.lessons(id) on delete set null,
  class_id          uuid references public.classes(id) on delete cascade,
  subject_id        uuid references public.subjects(id) on delete set null,
  title             text not null,
  instructions      text,
  due_on            date,
  points_possible   numeric(6,2) check (points_possible is null or points_possible >= 0),
  skill_ids         uuid[] not null default '{}',
  assigned_by       uuid references public.profiles(id),
  status            text not null default 'active' check (status in ('draft','active','closed','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  deleted_at        timestamptz,
  constraint assignments_scope_ck check (organization_id is not null or family_id is not null)
);
create index assignments_class_idx on public.assignments (class_id) where deleted_at is null;
create index assignments_due_idx on public.assignments (due_on) where deleted_at is null;
select app.attach_updated_at('public.assignments');

create table public.assignment_students (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  due_on        date,
  status        app.assignment_status not null default 'assigned',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assignment_students_student_idx on public.assignment_students (student_id, status);
select app.attach_updated_at('public.assignment_students');

create table public.assignment_submissions (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references public.assignments(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  submitted_at      timestamptz,
  content           text,
  document_ids      uuid[] not null default '{}',
  status            app.assignment_status not null default 'submitted',
  score             numeric(6,2) check (score is null or score >= 0),
  percentage        numeric(5,2) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  feedback          text,
  graded_by         uuid references public.profiles(id),
  graded_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  unique (assignment_id, student_id)
);
create index assignment_submissions_student_idx on public.assignment_submissions (student_id, submitted_at desc);
select app.attach_updated_at('public.assignment_submissions');

alter table public.lessons enable row level security;
alter table public.lesson_students enable row level security;
alter table public.lesson_groups enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_students enable row level security;
alter table public.assignment_submissions enable row level security;
