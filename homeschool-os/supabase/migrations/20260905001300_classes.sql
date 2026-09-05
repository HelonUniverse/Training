-- =============================================================================
-- 0013  Classes, pods, groups, programs
-- =============================================================================

create table public.classes (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  location_id       uuid references public.organization_locations(id) on delete set null,
  academic_year_id  uuid references public.academic_years(id) on delete set null,
  subject_id        uuid references public.subjects(id) on delete set null,
  name              text not null,
  description       text,
  type              app.class_type not null default 'class',
  capacity          int check (capacity is null or capacity > 0),
  age_min           smallint,
  age_max           smallint,
  grade_levels      text[] not null default '{}',
  schedule          jsonb not null default '{}'::jsonb,   -- rrule + time blocks
  status            text not null default 'active' check (status in ('draft','active','completed','cancelled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  deleted_at        timestamptz,
  deleted_by        uuid references public.profiles(id),
  constraint classes_age_range_ck check (age_max is null or age_min is null or age_max >= age_min)
);
create index classes_org_idx on public.classes (organization_id) where deleted_at is null;
create index classes_year_idx on public.classes (academic_year_id);
select app.attach_updated_at('public.classes');

create table public.class_students (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  enrolled_on  date not null default current_date,
  ended_on     date,
  active       boolean not null default true,
  status       text not null default 'enrolled'
                 check (status in ('enrolled','waitlisted','withdrawn','completed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  updated_by   uuid references public.profiles(id),
  constraint class_students_dates_ck check (ended_on is null or ended_on >= enrolled_on)
);
create unique index class_students_active_idx on public.class_students (class_id, student_id) where active;
create index class_students_student_idx on public.class_students (student_id) where active;
select app.attach_updated_at('public.class_students');

create table public.class_staff (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        app.class_staff_role not null default 'lead',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_by  uuid references public.profiles(id)
);
create unique index class_staff_active_idx on public.class_staff (class_id, user_id, role) where active;
create index class_staff_user_idx on public.class_staff (user_id) where active;
select app.attach_updated_at('public.class_staff');

comment on table public.class_staff is
  'Staffing a class grants derived access to that class''s enrolled students '
  'for as long as both the staffing row and the enrolment row are active.';

alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.class_staff enable row level security;
