-- =============================================================================
-- 0024  Organization operational records and the data ownership registry
-- =============================================================================
-- Two distinct classes of record live in this system:
--
--   STUDENT EDUCATIONAL RECORD  - owned by the family, follows the student
--     forever, remains fully accessible after an organization membership ends.
--     (portfolio, skills, learning plans, progress, reading logs, family
--      uploads, evaluations, student reports, activity logs)
--
--   ORGANIZATION OPERATIONAL RECORD - owned by the organization, does NOT
--     transfer to the family when membership ends.
--     (contracts, invoices/payments [deferred], staff HR records, internal
--      administrative documents, organization-recorded attendance, incident
--      documentation, organization financial records)
--
-- The registry below encodes that split as data so the export job, the
-- retention job and the membership-end job all read the same source of truth.
-- =============================================================================

create table public.incident_reports (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  location_id         uuid references public.organization_locations(id) on delete set null,
  student_id          uuid references public.students(id) on delete set null,
  class_id            uuid references public.classes(id) on delete set null,
  occurred_at         timestamptz not null,
  category            text not null,
  summary             text not null,
  details             text,
  action_taken        text,
  reported_by         uuid references public.profiles(id),
  document_ids        uuid[] not null default '{}',
  record_class        app.record_class not null default 'organization_operational',
  shared_with_family  boolean not null default false,
  shared_at           timestamptz,
  status              text not null default 'open' check (status in ('open','under_review','closed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz
);
create index incident_reports_org_idx on public.incident_reports (organization_id, occurred_at desc) where deleted_at is null;
create index incident_reports_student_idx on public.incident_reports (student_id) where student_id is not null;
select app.attach_updated_at('public.incident_reports');

comment on column public.incident_reports.shared_with_family is
  'Incident documentation stays with the organization. A guardian sees an incident '
  'involving their child only once the organization shares it.';

create table public.staff_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  kind            text not null,                   -- 'background_check','credential','agreement','review'
  title           text not null,
  document_id     uuid references public.documents(id) on delete set null,
  effective_on    date,
  expires_on      date,
  status          text not null default 'active' check (status in ('active','expired','revoked')),
  notes           text,
  record_class    app.record_class not null default 'organization_operational',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz
);
create index staff_records_org_idx on public.staff_records (organization_id) where deleted_at is null;
create index staff_records_user_idx on public.staff_records (user_id);
create index staff_records_expiry_idx on public.staff_records (expires_on) where status = 'active';
select app.attach_updated_at('public.staff_records');

create table public.organization_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id     uuid not null references public.documents(id) on delete cascade,
  kind            text not null,                   -- 'contract','policy','handbook','financial','other'
  family_id       uuid references public.families(id) on delete set null,
  title           text not null,
  effective_on    date,
  expires_on      date,
  record_class    app.record_class not null default 'organization_operational',
  visible_to_family boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz,
  unique (organization_id, document_id)
);
create index organization_documents_org_idx on public.organization_documents (organization_id, kind) where deleted_at is null;
create index organization_documents_family_idx on public.organization_documents (family_id) where family_id is not null;
select app.attach_updated_at('public.organization_documents');

-- --- the registry ------------------------------------------------------------
create table public.data_ownership_registry (
  id                        uuid primary key default gen_random_uuid(),
  table_name                text not null unique,
  record_class              app.record_class not null,
  owner                     text not null check (owner in ('family','organization','platform','shared')),
  family_retains_on_exit    boolean not null,      -- family keeps access after membership ends
  org_retains_on_exit       boolean not null,      -- org keeps access after membership ends
  included_in_family_export boolean not null,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
select app.attach_updated_at('public.data_ownership_registry');

comment on table public.data_ownership_registry is
  'Machine-readable ownership policy. The family export job, the retention job '
  'and the membership-end job all read this table rather than hard-coding lists.';

insert into public.data_ownership_registry
  (table_name, record_class, owner, family_retains_on_exit, org_retains_on_exit, included_in_family_export, notes) values
  -- student educational record: family owns, travels with the student
  ('students',                    'student_educational', 'family', true,  false, true,  'Core student record.'),
  ('portfolio_items',             'student_educational', 'family', true,  false, true,  null),
  ('activity_logs',               'student_educational', 'family', true,  false, true,  null),
  ('reading_logs',                'student_educational', 'family', true,  false, true,  null),
  ('student_skills',              'student_educational', 'family', true,  false, true,  null),
  ('student_skill_events',        'student_educational', 'family', true,  false, true,  'Skill history.'),
  ('learning_plans',              'student_educational', 'family', true,  false, true,  null),
  ('learning_goals',              'student_educational', 'family', true,  false, true,  null),
  ('assessments',                 'student_educational', 'family', true,  false, true,  null),
  ('assessment_results',          'student_educational', 'family', true,  false, true,  null),
  ('assignment_submissions',      'student_educational', 'family', true,  false, true,  'Student work product.'),
  ('evaluations',                 'student_educational', 'family', true,  false, true,  'Annual evaluations belong to the family.'),
  ('compliance_requirements',     'student_educational', 'family', true,  false, true,  null),
  ('student_compliance_records',  'student_educational', 'family', true,  false, true,  null),
  ('document_submissions',        'student_educational', 'family', true,  false, true,  'Official filings made by the family.'),
  ('consents',                    'student_educational', 'family', true,  true,  true,  'Both sides retain the consent trail.'),
  -- shared: both sides keep their copy
  ('teacher_notes',               'shared',              'shared', true,  true,  true,  'Family sees notes shared with the family.'),
  ('messages',                    'shared',              'shared', true,  true,  true,  'Each participant retains their threads.'),
  ('lessons',                     'shared',              'shared', true,  true,  true,  'Family keeps lessons delivered to their student.'),
  -- organization operational: stays with the organization
  ('attendance',                  'organization_operational', 'organization', true, true, true,  'Org-recorded attendance is operational; the family keeps a read copy for its own records.'),
  ('incident_reports',            'organization_operational', 'organization', false, true, false, 'Shared with the family only when the org shares it.'),
  ('staff_records',               'organization_operational', 'organization', false, true, false, 'HR records.'),
  ('organization_documents',      'organization_operational', 'organization', false, true, false, 'Contracts, policies, financial documents.'),
  ('classes',                     'organization_operational', 'organization', false, true, false, null),
  ('organization_members',        'organization_operational', 'organization', false, true, false, null),
  ('family_organization_memberships','organization_operational','organization', true, true, false, 'Both sides keep the relationship record.'),
  ('student_organization_memberships','shared',          'shared', true,  true,  true,  'Longitudinal enrolment history belongs to both.'),
  -- platform
  ('audit_logs',                  'platform',            'platform', false, false, false, 'Immutable platform record.'),
  ('ai_usage_events',             'platform',            'platform', false, false, false, 'Telemetry; provider internals never exposed.'),
  ('job_queue',                   'platform',            'platform', false, false, false, null);

comment on column public.data_ownership_registry.included_in_family_export is
  'Drives the STEP 12 family data export. Documents are exported when their '
  'documents.record_class is student_educational or shared.';

alter table public.incident_reports enable row level security;
alter table public.staff_records enable row level security;
alter table public.organization_documents enable row level security;
alter table public.data_ownership_registry enable row level security;
