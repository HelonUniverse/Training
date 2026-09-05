-- =============================================================================
-- 0015  Calendar
-- =============================================================================
-- Recurring events store an RRULE; instances are materialised into
-- calendar_event_instances for a rolling window so day/week views are a single
-- index scan and DST transitions are resolved once, at materialisation time.
-- =============================================================================

create table public.calendar_events (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references public.organizations(id) on delete cascade,
  family_id             uuid references public.families(id) on delete cascade,
  location_id           uuid references public.organization_locations(id) on delete set null,
  class_id              uuid references public.classes(id) on delete cascade,
  lesson_id             uuid,                                  -- FK added in 0016
  academic_year_id      uuid references public.academic_years(id) on delete set null,
  title                 text not null,
  description           text,
  type                  app.event_type not null default 'other',
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  all_day               boolean not null default false,
  timezone              text not null default 'America/New_York',
  rrule                 text,
  recurrence_end_date   date,
  exdates               date[] not null default '{}',
  recurrence_parent_id  uuid references public.calendar_events(id) on delete cascade,
  status                app.event_status not null default 'scheduled',
  visibility            app.event_visibility not null default 'family',
  reminder_minutes      int[] not null default '{}',
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id),
  updated_by            uuid references public.profiles(id),
  deleted_at            timestamptz,
  deleted_by            uuid references public.profiles(id),
  constraint calendar_events_range_ck check (ends_at >= starts_at),
  constraint calendar_events_scope_ck check (organization_id is not null or family_id is not null)
);
create index calendar_events_org_start_idx on public.calendar_events (organization_id, starts_at) where deleted_at is null;
create index calendar_events_family_start_idx on public.calendar_events (family_id, starts_at) where deleted_at is null;
create index calendar_events_class_idx on public.calendar_events (class_id) where deleted_at is null;
create index calendar_events_recurrence_idx on public.calendar_events (recurrence_parent_id);
select app.attach_updated_at('public.calendar_events');

create table public.calendar_event_instances (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.calendar_events(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  class_id          uuid references public.classes(id) on delete cascade,
  occurrence_date   date not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            app.event_status not null default 'scheduled',
  overridden        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (event_id, occurrence_date)
);
create index cei_org_start_idx on public.calendar_event_instances (organization_id, starts_at);
create index cei_family_start_idx on public.calendar_event_instances (family_id, starts_at);
create index cei_class_start_idx on public.calendar_event_instances (class_id, starts_at);
select app.attach_updated_at('public.calendar_event_instances');

comment on table public.calendar_event_instances is
  'Materialised occurrences for a rolling +/-18 month window, refreshed by the '
  'materialize-events job. Range queries never expand RRULEs at read time.';

create table public.event_participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.calendar_events(id) on delete cascade,
  student_id    uuid references public.students(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  class_id      uuid references public.classes(id) on delete cascade,
  role          text not null default 'attendee' check (role in ('attendee','owner','optional')),
  response      text check (response in ('accepted','declined','tentative')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint event_participants_target_ck check (num_nonnulls(student_id, user_id, class_id) = 1)
);
create unique index event_participants_student_idx on public.event_participants (event_id, student_id) where student_id is not null;
create unique index event_participants_user_idx on public.event_participants (event_id, user_id) where user_id is not null;
create unique index event_participants_class_idx on public.event_participants (event_id, class_id) where class_id is not null;
create index event_participants_student_lookup_idx on public.event_participants (student_id);
select app.attach_updated_at('public.event_participants');

alter table public.calendar_events enable row level security;
alter table public.calendar_event_instances enable row level security;
alter table public.event_participants enable row level security;
