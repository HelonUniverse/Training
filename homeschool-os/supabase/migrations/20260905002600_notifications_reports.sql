-- =============================================================================
-- 0026  Notifications and reports
-- =============================================================================

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  student_id      uuid references public.students(id) on delete cascade,
  type            app.notification_type not null,
  title           text not null,
  body            text,
  data            jsonb not null default '{}'::jsonb,
  link            text,
  priority        smallint not null default 3 check (priority between 1 and 5),
  dedupe_key      text,
  channels_sent   jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create unique index notifications_dedupe_idx on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create table public.notification_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            app.notification_type not null,
  in_app          boolean not null default true,
  email           boolean not null default true,
  push            boolean not null default false,
  digest          app.notification_digest not null default 'immediate',
  quiet_hours     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, type)
);
select app.attach_updated_at('public.notification_preferences');

create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  kind              app.report_kind not null,
  student_id        uuid references public.students(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  academic_year_id  uuid references public.academic_years(id) on delete set null,
  title             text,
  locale            text references public.locales(code),
  period_start      date,
  period_end        date,
  parameters        jsonb not null default '{}'::jsonb,
  data_snapshot     jsonb,                                  -- frozen at generation time
  status            app.report_status not null default 'queued',
  document_id       uuid references public.documents(id) on delete set null,
  generated_at      timestamptz,
  generated_by      uuid references public.profiles(id),
  edited_by         uuid references public.profiles(id),
  edited_at         timestamptz,
  shared_with       jsonb not null default '[]'::jsonb,
  share_token_hash  text,
  share_expires_at  timestamptz,
  error             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  constraint reports_scope_ck check (
    student_id is not null or organization_id is not null or family_id is not null),
  constraint reports_period_ck check (period_end is null or period_start is null or period_end >= period_start)
);
create index reports_student_idx on public.reports (student_id, created_at desc);
create index reports_org_idx on public.reports (organization_id, kind, created_at desc);
create unique index reports_share_token_idx on public.reports (share_token_hash) where share_token_hash is not null;
select app.attach_updated_at('public.reports');

comment on column public.reports.data_snapshot is
  'A shared report never silently changes: the numbers are frozen when it is generated.';

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reports enable row level security;
