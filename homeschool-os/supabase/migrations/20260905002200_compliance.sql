-- =============================================================================
-- 0022  Compliance rule engine (state-agnostic)
-- =============================================================================
-- Rules are DATA. No state name, statute reference or deadline is expressed in
-- application code. Adding a state is a pack of rows plus form templates.
--
-- The system reports the state of documentation held in the system. It does not
-- assert legal compliance and does not provide legal advice.
-- =============================================================================

create table public.compliance_packs (
  id              uuid primary key default gen_random_uuid(),
  state_code      char(2) not null,
  name            text not null,
  version         text not null,
  status          app.pack_status not null default 'draft',
  effective_from  date,
  effective_to    date,
  locale          text not null default 'en-US' references public.locales(code),
  notes           text,
  published_by    uuid references public.profiles(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  unique (state_code, version),
  -- A pack cannot go live without a named human publisher.
  constraint packs_publish_ck check (status <> 'active' or (published_by is not null and published_at is not null))
);
create index compliance_packs_state_idx on public.compliance_packs (state_code, status);
select app.attach_updated_at('public.compliance_packs');

alter table public.organizations
  add constraint organizations_compliance_pack_fk
  foreign key (compliance_pack_id) references public.compliance_packs(id) on delete set null;

create table public.compliance_rules (
  id                      uuid primary key default gen_random_uuid(),
  pack_id                 uuid not null references public.compliance_packs(id) on delete cascade,
  state_code              char(2) not null,
  county                  text,                                -- county rows override state rows
  code                    text not null,                       -- 'FL.NOI', 'FL.ANNUAL_EVAL'
  category                app.compliance_category not null,
  title                   text not null,
  requirement_text        text not null,
  obligation_level        app.obligation_level not null default 'unknown',
  applies_to              jsonb not null default '{}'::jsonb,
  trigger                 jsonb not null default '{}'::jsonb,
  due_date_logic          jsonb not null default '{}'::jsonb,
  required_fields         jsonb not null default '[]'::jsonb,
  satisfied_by            jsonb not null default '[]'::jsonb,
  reminder_schedule       jsonb not null default '[]'::jsonb,
  retention               jsonb not null default '{}'::jsonb,
  document_template_id    text,
  submission_method       app.submission_method not null default 'none',
  submission_destination  jsonb not null default '{}'::jsonb,
  authoritative_source_url text not null,
  authority_citation      text not null,
  last_verified_on        date,
  verified_by             uuid references public.profiles(id),
  active                  boolean not null default false,
  sequence                smallint not null default 100,
  admin_notes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  unique (pack_id, code, county),
  -- A rule may only be active once a named human has verified it against its source.
  constraint rules_verification_ck check (
    not active or (last_verified_on is not null and verified_by is not null)),
  constraint rules_source_ck check (length(btrim(authoritative_source_url)) > 0)
);
create index compliance_rules_lookup_idx on public.compliance_rules (state_code, county, active);
create index compliance_rules_pack_idx on public.compliance_rules (pack_id, sequence);
create index compliance_rules_stale_idx on public.compliance_rules (last_verified_on) where active;
select app.attach_updated_at('public.compliance_rules');

comment on constraint rules_verification_ck on public.compliance_rules is
  'Structural guard against shipping unverified legal content: a rule cannot be '
  'active without a verification date and the person who checked the source.';

create table public.district_contacts (
  id                uuid primary key default gen_random_uuid(),
  state_code        char(2) not null,
  county            text not null,
  district_name     text,
  office_name       text,
  contact_name      text,
  email             text,
  phone             text,
  address_line1     text,
  address_line2     text,
  city              text,
  postal_code       text,
  portal_url        text,
  source_url        text,
  last_verified_on  date,
  verified_by       uuid references public.profiles(id),
  active            boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  unique (state_code, county, office_name)
);
create index district_contacts_lookup_idx on public.district_contacts (state_code, county) where active;
select app.attach_updated_at('public.district_contacts');

-- A rule instantiated for one student in one academic year.
create table public.compliance_requirements (
  id                uuid primary key default gen_random_uuid(),
  rule_id           uuid not null references public.compliance_rules(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  academic_year_id  uuid references public.academic_years(id) on delete set null,
  pack_version      text,
  status            app.compliance_status not null default 'unknown',
  obligation_level  app.obligation_level not null default 'unknown',
  window_opens_on   date,
  due_on            date,
  grace_until       date,
  satisfied_at      timestamptz,
  satisfied_by_type text,
  satisfied_by_id   uuid,
  computed_inputs   jsonb not null default '{}'::jsonb,       -- why this date: the audit trail
  computed_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (rule_id, student_id, academic_year_id)
);
create index compliance_requirements_student_idx on public.compliance_requirements (student_id, status);
create index compliance_requirements_due_idx on public.compliance_requirements (due_on)
  where status in ('upcoming','needs_attention','incomplete','overdue');
select app.attach_updated_at('public.compliance_requirements');

comment on column public.compliance_requirements.computed_inputs is
  'The exact facts and offsets used to compute this due date, so the UI can '
  'explain "due Aug 22 2027 because ..." instead of showing an unexplained date.';

-- Precomputed per-student rollup read by dashboards. Never evaluated at request time.
create table public.student_compliance_records (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  academic_year_id  uuid references public.academic_years(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  state_code        char(2),
  county            text,
  pack_id           uuid references public.compliance_packs(id) on delete set null,
  overall_status    app.compliance_status not null default 'unknown',
  by_category       jsonb not null default '{}'::jsonb,
  open_items        smallint not null default 0,
  next_due_on       date,
  next_due_rule_id  uuid references public.compliance_rules(id) on delete set null,
  computed_at       timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index scr_student_year_idx on public.student_compliance_records (student_id, academic_year_id);
create index scr_next_due_idx on public.student_compliance_records (next_due_on)
  where overall_status <> 'current';
create index scr_org_idx on public.student_compliance_records (organization_id, overall_status);
select app.attach_updated_at('public.student_compliance_records');

-- Preparing and sending an official filing. Nothing here sends itself.
create table public.document_submissions (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.students(id) on delete cascade,
  organization_id         uuid references public.organizations(id) on delete set null,
  family_id               uuid references public.families(id) on delete cascade,
  rule_id                 uuid references public.compliance_rules(id) on delete set null,
  requirement_id          uuid references public.compliance_requirements(id) on delete set null,
  document_id             uuid references public.documents(id) on delete set null,
  method                  app.submission_method not null,
  destination             jsonb not null default '{}'::jsonb,   -- snapshot of the address used
  district_contact_id     uuid references public.district_contacts(id) on delete set null,
  status                  app.submission_status not null default 'draft',
  form_data               jsonb not null default '{}'::jsonb,
  signature_id            uuid,                                 -- FK added in 0023
  prepared_by             uuid references public.profiles(id),
  approved_by             uuid references public.profiles(id),
  approved_at             timestamptz,
  sent_at                 timestamptz,
  sent_by                 uuid references public.profiles(id),
  provider_message_id     text,
  transmission_evidence   jsonb not null default '{}'::jsonb,
  confirmation_document_id uuid references public.documents(id) on delete set null,
  confirmation_note       text,
  acknowledged_at         timestamptz,
  idempotency_key         text unique,
  failure_reason          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  -- An official filing cannot reach a sent state without a named human approver,
  -- a captured signature and a snapshotted destination.
  constraint submissions_send_requires_approval_ck check (
    status not in ('sent','delivered','acknowledged')
    or (approved_by is not null and approved_at is not null
        and signature_id is not null
        and destination <> '{}'::jsonb
        and sent_at is not null))
);
create index document_submissions_student_idx on public.document_submissions (student_id, created_at desc);
create index document_submissions_status_idx on public.document_submissions (status);
create index document_submissions_rule_idx on public.document_submissions (rule_id);
select app.attach_updated_at('public.document_submissions');

comment on constraint submissions_send_requires_approval_ck on public.document_submissions is
  'The database refuses to record an official filing as sent unless a person '
  'approved it, signed it, and confirmed the destination.';

alter table public.compliance_packs enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.district_contacts enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.student_compliance_records enable row level security;
alter table public.document_submissions enable row level security;
