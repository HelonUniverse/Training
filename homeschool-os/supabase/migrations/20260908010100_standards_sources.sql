-- =============================================================================
-- 0074  Where a standard came from, and which version of it
-- =============================================================================
-- Three ideas, kept apart on purpose:
--
--   a SOURCE   is an artifact somebody handed us - a PDF, a spreadsheet, an
--              official export - identified by its bytes, not by its filename.
--   a VERSION  is an edition of a framework. Florida B.E.S.T. 2020 and a later
--              revision are two versions, and a benchmark code means nothing
--              without one: "MA.4.FR.1.1" is not a global identity.
--   a BATCH    is one run of one adapter over one source. It is what you point
--              at when you ask "where did this row come from and who ran it".
--
-- NOTHING here is Florida-shaped. There is no florida_code, no best_strand.
-- Florida lives in an adapter (src/server/standards/adapters/), which produces
-- rows in these generic tables. The next framework is a new adapter, not a
-- schema change.
--
-- WHY A SNAPSHOT AT ALL. A state re-publishes a PDF at the same URL and the old
-- one is gone. If a family ever asks why we said a skill relates to a
-- benchmark, "we fetched it from fldoe.org at some point" is not an answer.
-- The sha256, the retrieval date, the parser and its version are.
-- =============================================================================

create type app.standards_source_format as enum (
  'pdf', 'docx', 'xlsx', 'csv', 'html', 'json', 'xml', 'unknown');

create type app.standards_source_authority as enum (
  'state_education_agency',   -- e.g. a department of education
  'state_curriculum_portal',  -- e.g. an official standards portal
  'national_body',
  'international_body',
  'organization',             -- a school's own reference framework
  'synthetic_test');          -- fixtures. Never publishable as real (0075).

create type app.import_status as enum (
  'registered', 'parsing', 'parsed', 'validation_pending',
  'review_pending', 'approved', 'published', 'rejected', 'superseded', 'failed');

create type app.framework_status as enum ('draft', 'active', 'deprecated', 'superseded');

-- --- the artifact ------------------------------------------------------------

create table public.standards_sources (
  id                 uuid primary key default gen_random_uuid(),
  authority          app.standards_source_authority not null,
  authority_name     text not null,            -- 'Florida Department of Education'
  artifact_name      text not null,            -- the file we were handed
  source_url         text,                     -- where it is published, if known
  -- Sniffed from the bytes by the importer, never taken from the extension.
  detected_format    app.standards_source_format not null,
  declared_mime      text,                     -- what the uploader claimed, for comparison
  sha256             text not null,
  byte_size          bigint not null check (byte_size >= 0),
  -- A locale code, because that is what the rest of the product speaks. The
  -- SOURCE language of a staged row is free text (a document may be in a
  -- language we have no UI for); this is the artifact's registered language.
  source_language    text not null default 'en-US' references public.locales(code),
  provided_on        date not null default current_date,
  source_published_on date,
  source_updated_on   date,
  source_notes       text,
  storage_bucket     text,
  storage_path       text,
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,
  -- Identity is the bytes. Re-registering the same artifact finds this row
  -- instead of making a second one, which is what makes re-import idempotent.
  constraint standards_sources_sha_unique unique (sha256),
  constraint standards_sources_sha_shape check (sha256 ~ '^[0-9a-f]{64}$')
);
create index standards_sources_authority_idx on public.standards_sources (authority, provided_on desc);

comment on table public.standards_sources is
  'One registered source artifact, identified by the sha256 of its bytes. The '
  'format is detected from the content: a filename is a claim, not evidence.';

-- --- the framework version ---------------------------------------------------

create table public.standards_framework_versions (
  id             uuid primary key default gen_random_uuid(),
  framework_id   uuid not null references public.standards_frameworks(id) on delete cascade,
  version_label  text not null,                -- '2020', '2023 revision'
  jurisdiction   text,
  subject        text,                         -- 'mathematics'. Generic, not a Florida strand.
  status         app.framework_status not null default 'draft',
  effective_from date,
  effective_to   date,
  superseded_by_version_id uuid references public.standards_framework_versions(id) on delete set null,
  source_id      uuid references public.standards_sources(id) on delete set null,
  source_url     text,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  constraint framework_version_unique unique (framework_id, version_label, subject),
  constraint framework_version_dates check (effective_to is null or effective_from is null
                                            or effective_to >= effective_from),
  constraint framework_version_not_self check (superseded_by_version_id is distinct from id)
);
create index framework_versions_framework_idx on public.standards_framework_versions (framework_id, status);

comment on table public.standards_framework_versions is
  'An edition of a framework. A benchmark code is only an identity WITH one of '
  'these: the same code can mean different things in two editions, and a '
  'superseded edition is kept so a mapping made under it still makes sense.';

-- --- strand / domain ---------------------------------------------------------
-- Called `domain` and not `strand` because `strand` is Florida's word. An
-- adapter maps whatever its source calls this into a domain row.

create table public.standards_domains (
  id                  uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.standards_framework_versions(id) on delete cascade,
  code                text not null,
  name                text not null,
  parent_domain_id    uuid references public.standards_domains(id) on delete cascade,
  sequence            integer not null default 100,
  created_at          timestamptz not null default now(),
  constraint standards_domain_unique unique (framework_version_id, code),
  constraint standards_domain_not_self check (parent_domain_id is distinct from id)
);
create index standards_domains_version_idx on public.standards_domains (framework_version_id, sequence);

-- --- the batch ---------------------------------------------------------------

create table public.standards_import_batches (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid not null references public.standards_sources(id) on delete cascade,
  framework_version_id uuid references public.standards_framework_versions(id) on delete set null,
  adapter              text not null,          -- 'florida-best-mathematics'
  adapter_version      text not null,          -- bumped when parsing changes
  status               app.import_status not null default 'registered',
  requested_scope      jsonb not null default '{}'::jsonb,   -- e.g. {"grades":["K","1"]}
  rows_seen            integer not null default 0,
  rows_staged          integer not null default 0,
  rows_unresolved      integer not null default 0,
  rows_rejected        integer not null default 0,
  rows_published       integer not null default 0,
  warnings             jsonb not null default '[]'::jsonb,
  error                text,
  started_at           timestamptz,
  finished_at          timestamptz,
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id) on delete set null,
  -- Same artifact + same adapter + same adapter version = the same work. The
  -- re-import path finds this row rather than parsing the file twice.
  constraint import_batch_idempotent unique (source_id, adapter, adapter_version)
);
create index import_batches_status_idx on public.standards_import_batches (status, created_at desc);

comment on table public.standards_import_batches is
  'One run of one adapter over one source artifact. Counts are reported as '
  'counts - unresolved rows are never folded into a success percentage.';

-- =============================================================================
-- RLS: global reference data, but not global WRITE
-- =============================================================================
-- Any signed-in user may read the catalogue of frameworks and versions: that is
-- what makes a standards reference useful. The import machinery is another
-- matter - a source artifact and its staging rows are internal until somebody
-- with the platform capability publishes them.

alter table public.standards_sources             enable row level security;
alter table public.standards_framework_versions  enable row level security;
alter table public.standards_domains             enable row level security;
alter table public.standards_import_batches      enable row level security;

create policy standards_sources_admin_all on public.standards_sources
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

create policy import_batches_admin_all on public.standards_import_batches
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

-- Versions and domains are readable by everyone once they are not drafts;
-- a draft edition is still being reviewed and is nobody's reference yet.
create policy framework_versions_read on public.standards_framework_versions
  for select to authenticated
  using (status <> 'draft' or app.is_standards_admin());
create policy framework_versions_admin_write on public.standards_framework_versions
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

-- 0067 gave standards_frameworks a SELECT policy and no write policy at all,
-- which made the catalogue readable and unwritable by everybody including the
-- people meant to curate it. Now that there is a capability for exactly this
-- job, it gets the write path - and only it.
create policy standards_frameworks_admin_write on public.standards_frameworks
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

create policy standards_domains_read on public.standards_domains
  for select to authenticated using (true);
create policy standards_domains_admin_write on public.standards_domains
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

select app.assert_schema_invariants();
