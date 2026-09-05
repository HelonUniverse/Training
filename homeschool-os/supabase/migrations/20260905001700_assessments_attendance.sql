-- =============================================================================
-- 0017  Assessments and attendance
-- =============================================================================

create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  student_id        uuid references public.students(id) on delete cascade,
  class_id          uuid references public.classes(id) on delete cascade,
  subject_id        uuid references public.subjects(id) on delete set null,
  academic_year_id  uuid references public.academic_years(id) on delete set null,
  title             text not null,
  type              app.assessment_type not null default 'quiz',
  administered_on   date not null default current_date,
  points_possible   numeric(6,2) check (points_possible is null or points_possible >= 0),
  skill_ids         uuid[] not null default '{}',
  source_document_id uuid,                                   -- FK added in 0018
  -- provenance
  source_type       app.source_type not null default 'manual',
  source_id         uuid,
  entered_by        uuid references public.profiles(id),
  ai_generated      boolean not null default false,
  ai_suggestion_id  uuid,                                    -- FK added in 0020
  human_confirmed_by uuid references public.profiles(id),
  human_confirmed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  deleted_at        timestamptz,
  constraint assessments_target_ck check (student_id is not null or class_id is not null),
  constraint assessments_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index assessments_student_idx on public.assessments (student_id, administered_on desc) where deleted_at is null;
create index assessments_class_idx on public.assessments (class_id, administered_on desc) where deleted_at is null;
select app.attach_updated_at('public.assessments');

create table public.assessment_results (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.assessments(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  points_earned     numeric(6,2) check (points_earned is null or points_earned >= 0),
  percentage        numeric(5,2) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  per_skill         jsonb not null default '[]'::jsonb,      -- [{skill_id, correct, total}]
  notes             text,
  confidence        app.confidence_level not null default 'assessment_confirmed',
  -- provenance
  source_type       app.source_type not null default 'assessment',
  source_id         uuid,
  entered_by        uuid references public.profiles(id),
  ai_generated      boolean not null default false,
  ai_suggestion_id  uuid,                                    -- FK added in 0020
  human_confirmed_by uuid references public.profiles(id),
  human_confirmed_at timestamptz,
  recorded_by       uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  unique (assessment_id, student_id),
  constraint assessment_results_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index assessment_results_student_idx on public.assessment_results (student_id);
select app.attach_updated_at('public.assessment_results');

-- Attendance recorded by an organization is an ORGANIZATION OPERATIONAL record
-- (record_class), while a family's own attendance log is a student educational
-- record. See 0024 for the ownership semantics this drives.
create table public.attendance (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete cascade,
  class_id          uuid references public.classes(id) on delete cascade,
  event_instance_id uuid references public.calendar_event_instances(id) on delete set null,
  date              date not null,
  status            app.attendance_status not null,
  minutes           int check (minutes is null or minutes >= 0),
  notes             text,
  method            app.attendance_method not null default 'teacher',
  record_class      app.record_class not null default 'student_educational',
  recorded_by       uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id)
);
-- One record per student per day per class (or per day when there is no class).
create unique index attendance_student_day_class_idx
  on public.attendance (student_id, date, class_id) where class_id is not null;
create unique index attendance_student_day_idx
  on public.attendance (student_id, date) where class_id is null;
create index attendance_org_date_idx on public.attendance (organization_id, date);
create index attendance_class_date_idx on public.attendance (class_id, date);
select app.attach_updated_at('public.attendance');

-- Attendance taken by an organization defaults to an operational record.
create or replace function app.default_attendance_record_class()
returns trigger language plpgsql as $$
begin
  if new.organization_id is not null and new.method <> 'parent_checkin' then
    new.record_class := 'organization_operational';
  end if;
  return new;
end;
$$;
create trigger set_attendance_record_class
  before insert on public.attendance
  for each row execute function app.default_attendance_record_class();

alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;
alter table public.attendance enable row level security;
