-- =============================================================================
-- 0019  Portfolio, activity log, reading log, teacher notes
-- =============================================================================

create table public.portfolio_items (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  family_id           uuid references public.families(id) on delete cascade,
  academic_year_id    uuid references public.academic_years(id) on delete set null,
  subject_id          uuid references public.subjects(id) on delete set null,
  title               text not null,
  description         text,
  skill_ids           uuid[] not null default '{}',
  activity_type       app.portfolio_activity_type not null default 'other',
  evidence_category   app.evidence_category not null default 'work_sample',
  occurred_on         date not null default current_date,
  document_ids        uuid[] not null default '{}',
  is_highlight        boolean not null default false,
  visibility          text not null default 'family'
                        check (visibility in ('private','family','staff','organization')),
  record_class        app.record_class not null default 'student_educational',
  -- provenance
  source_type         app.source_type not null default 'manual',
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid,                                   -- FK added in 0020
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles(id),
  constraint portfolio_items_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index portfolio_items_student_date_idx
  on public.portfolio_items (student_id, occurred_on desc) where deleted_at is null;
create index portfolio_items_org_date_idx
  on public.portfolio_items (organization_id, occurred_on desc) where deleted_at is null;
create index portfolio_items_skills_idx on public.portfolio_items using gin (skill_ids);
create index portfolio_items_documents_idx on public.portfolio_items using gin (document_ids);
select app.attach_updated_at('public.portfolio_items');

create table public.activity_logs (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  family_id           uuid references public.families(id) on delete cascade,
  academic_year_id    uuid references public.academic_years(id) on delete set null,
  date                date not null default current_date,
  subject_id          uuid references public.subjects(id) on delete set null,
  activity_title      text not null,
  description         text,
  resources           jsonb not null default '[]'::jsonb,
  materials           text,
  duration_minutes    int check (duration_minutes is null or duration_minutes > 0),
  staff_user_id       uuid references public.profiles(id),
  skill_ids           uuid[] not null default '{}',
  portfolio_item_id   uuid references public.portfolio_items(id) on delete set null,
  dedupe_key          text,
  -- provenance
  source_type         app.source_type not null default 'manual',
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid,                                   -- FK added in 0020
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  constraint activity_logs_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
-- Auto-generation from lessons/assignments/portfolio is idempotent by construction.
create unique index activity_logs_dedupe_idx on public.activity_logs (student_id, dedupe_key)
  where dedupe_key is not null and deleted_at is null;
create index activity_logs_student_date_idx on public.activity_logs (student_id, date desc) where deleted_at is null;
create index activity_logs_subject_idx on public.activity_logs (subject_id);
select app.attach_updated_at('public.activity_logs');

comment on column public.activity_logs.dedupe_key is
  'app.dedupe_key(source_type, source_id). Guarantees a lesson or portfolio item '
  'can never produce two activity rows.';

create table public.reading_logs (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  family_id           uuid references public.families(id) on delete cascade,
  academic_year_id    uuid references public.academic_years(id) on delete set null,
  book_title          text not null,
  author              text,
  isbn                text,
  started_on          date,
  completed_on        date,
  pages_read          int check (pages_read is null or pages_read >= 0),
  total_pages         int check (total_pages is null or total_pages >= 0),
  chapters            text,
  minutes             int check (minutes is null or minutes >= 0),
  reading_type        app.reading_type not null default 'independent',
  subject_id          uuid references public.subjects(id) on delete set null,
  notes               text,
  skill_ids           uuid[] not null default '{}',
  rating              smallint check (rating is null or (rating between 1 and 5)),
  source_document_id  uuid references public.documents(id) on delete set null,
  -- provenance
  source_type         app.source_type not null default 'manual',
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid,                                   -- FK added in 0020
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  constraint reading_logs_dates_ck check (completed_on is null or started_on is null or completed_on >= started_on),
  constraint reading_logs_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index reading_logs_student_idx on public.reading_logs (student_id, coalesce(completed_on, started_on) desc)
  where deleted_at is null;
select app.attach_updated_at('public.reading_logs');

create table public.teacher_notes (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  author_user_id  uuid not null references public.profiles(id) on delete restrict,
  subject_id      uuid references public.subjects(id) on delete set null,
  body            text not null,
  occurred_on     date not null default current_date,
  visibility      app.note_visibility not null default 'staff',
  record_class    app.record_class not null default 'shared',
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz
);
create index teacher_notes_student_idx on public.teacher_notes (student_id, occurred_on desc) where deleted_at is null;
create index teacher_notes_author_idx on public.teacher_notes (author_user_id);
select app.attach_updated_at('public.teacher_notes');

alter table public.portfolio_items enable row level security;
alter table public.activity_logs enable row level security;
alter table public.reading_logs enable row level security;
alter table public.teacher_notes enable row level security;
