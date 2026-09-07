-- =============================================================================
-- 0075  Staging, and the gate between parsed and canonical
-- =============================================================================
-- THE RULE THIS FILE EXISTS TO ENFORCE:
--
--     Source Artifact -> Parse -> Normalize -> Validate -> Stage -> Human -> Publish
--
-- and never
--
--     Source Artifact -> AI -> Canonical Standards
--
-- Parsed is not verified. Verified is not relevant to a child. Published is not
-- required learning. Each of those is a different claim, so each gets its own
-- state rather than one `imported` boolean.
--
-- SOURCE REPRESENTATION VS OUR METADATA. A staged row keeps what the document
-- actually said - code, wording, grade, strand, in the source's own language -
-- separately from what we made of it. A reviewer may correct our normalization
-- freely and cannot touch the source columns at all: rewriting official wording
-- and still calling it official is the failure mode this separation prevents.
--
-- UNKNOWN IS VALID. `unresolved`, `ambiguous`, `parse_error` and
-- `source_conflict` are real, reportable outcomes. A parser that guesses a
-- missing benchmark code from its neighbours produces a number a family may
-- repeat to a district. A parser that says "row 214 is unresolved" produces
-- work for a person, which is the correct outcome.
-- =============================================================================

create type app.staged_status as enum (
  'staged',           -- parsed cleanly, waiting for a person
  'unresolved',       -- the source did not say; we are NOT guessing
  'ambiguous',        -- the source said two things
  'parse_error',      -- we could not read this row
  'source_conflict',  -- disagrees with an already-published record
  'duplicate',        -- the same identity twice in one source
  'approved',
  'rejected',
  'published',
  'superseded');

create type app.standards_reference_kind as enum (
  'benchmark',        -- the ordinary case: one expectation
  'practice',         -- a mathematical practice / habit of mind
  'cross_cutting',    -- spans grades and domains, belongs to no single skill
  'domain',           -- a grouping published as a record in its own right
  'cluster',
  'progression_note');

-- --- the staging table -------------------------------------------------------

create table public.standards_staged_records (
  id                   uuid primary key default gen_random_uuid(),
  batch_id             uuid not null references public.standards_import_batches(id) on delete cascade,
  row_number           integer not null,
  status               app.staged_status not null default 'staged',

  -- ---- what the SOURCE said. A reviewer never edits these. ----
  source_code          text,
  source_statement     text,
  source_grade         text,
  source_domain_code   text,
  source_domain_name   text,
  source_reference_kind text,
  source_language      text not null default 'en',
  raw                  jsonb not null default '{}'::jsonb,   -- the row as parsed

  -- ---- what NESTRA made of it. A reviewer may correct these. ----
  normalized_code      text,
  normalized_grade     text,
  normalized_subject   text,
  reference_kind       app.standards_reference_kind not null default 'benchmark',
  domain_id            uuid references public.standards_domains(id) on delete set null,
  search_aliases       text[] not null default '{}',

  warnings             jsonb not null default '[]'::jsonb,
  review_note          text,
  reviewed_by          uuid references auth.users(id) on delete set null,
  reviewed_at          timestamptz,
  published_standard_id uuid references public.standards(id) on delete set null,
  created_at           timestamptz not null default now(),
  constraint staged_row_unique unique (batch_id, row_number),
  -- A decision is a person and a time, or it has not happened.
  constraint staged_review_complete check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)),
  constraint staged_decided_reviewed check (
    status not in ('approved','rejected','published') or reviewed_by is not null)
);
create index staged_batch_idx  on public.standards_staged_records (batch_id, status, row_number);
create index staged_status_idx on public.standards_staged_records (status);
create index staged_code_idx   on public.standards_staged_records (normalized_code);

comment on table public.standards_staged_records is
  'Parsed rows waiting for a person. Source columns record what the document '
  'said; normalized columns record what we made of it. The importer writes '
  'here and nowhere else - it has no path to public.standards.';

/** The source representation is evidence. It is not editable after staging. */
create or replace function app.protect_staged_source_representation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_code            is distinct from old.source_code
     or new.source_statement    is distinct from old.source_statement
     or new.source_grade        is distinct from old.source_grade
     or new.source_domain_code  is distinct from old.source_domain_code
     or new.source_domain_name  is distinct from old.source_domain_name
     or new.source_language     is distinct from old.source_language
     or new.raw                 is distinct from old.raw then
    raise exception
      'the source representation is what the document said and cannot be edited; '
      'correct the normalized columns instead'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function app.protect_staged_source_representation() from public, anon, authenticated;

create trigger protect_staged_source_representation
  before update on public.standards_staged_records
  for each row execute function app.protect_staged_source_representation();

-- =============================================================================
-- Canonical standards, made version-aware
-- =============================================================================
-- public.standards exists from 0067 and ships empty, so these columns can be
-- added without a backfill. framework_version_id is what turns a code into an
-- identity; provenance is what lets a reader tell a published benchmark from a
-- fixture.

alter table public.standards
  add column framework_version_id uuid references public.standards_framework_versions(id) on delete cascade,
  add column domain_id            uuid references public.standards_domains(id) on delete set null,
  add column reference_kind       app.standards_reference_kind not null default 'benchmark',
  add column source_id            uuid references public.standards_sources(id) on delete set null,
  add column staged_record_id     uuid references public.standards_staged_records(id) on delete set null,
  add column normalized_grade     text,
  add column normalized_subject   text,
  add column search_aliases       text[] not null default '{}',
  add column status               app.framework_status not null default 'active',
  add column superseded_by_id     uuid references public.standards(id) on delete set null,
  add column effective_from       date,
  add column effective_to         date,
  add column published_by         uuid references auth.users(id) on delete set null,
  add column published_at         timestamptz,
  add constraint standards_not_self_superseded check (superseded_by_id is distinct from id);

-- Identity is (version, code), not code. The 0067 constraint was
-- (framework_id, code), which cannot hold two editions of the same benchmark.
alter table public.standards drop constraint if exists standards_code_unique;
create unique index standards_version_code_unique
  on public.standards (framework_version_id, code)
  where framework_version_id is not null;

comment on column public.standards.statement is
  'The official wording, as published. Never rewritten by us - a paraphrase '
  'presented as the source text is a misquotation of a state document.';

-- --- official text in more than one language ---------------------------------
-- Florida publishes B.E.S.T. in Spanish. That is a second OFFICIAL text, not a
-- translation we produced, and the difference is the whole point of this table:
-- there is nowhere here to put a machine translation and call it official.

create table public.standards_texts (
  id           uuid primary key default gen_random_uuid(),
  standard_id  uuid not null references public.standards(id) on delete cascade,
  language     text not null references public.locales(code),
  statement    text not null,
  source_id    uuid references public.standards_sources(id) on delete set null,
  authority_name text,
  is_official  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint standards_text_unique unique (standard_id, language, is_official),
  -- An official text must say which artifact it came from. A translation with
  -- no source is somebody's paraphrase, and may not claim to be official.
  constraint official_text_needs_a_source check (not is_official or source_id is not null)
);
create index standards_texts_standard_idx on public.standards_texts (standard_id, language);

comment on table public.standards_texts is
  'Official wording in each language the authority actually publishes. '
  'is_official requires a source artifact: we do not translate a state '
  'document ourselves and label the result official.';

-- --- RLS ---------------------------------------------------------------------

alter table public.standards_staged_records enable row level security;
alter table public.standards_texts          enable row level security;

create policy staged_records_admin_all on public.standards_staged_records
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

create policy standards_texts_read on public.standards_texts
  for select to authenticated using (true);
create policy standards_texts_admin_write on public.standards_texts
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

-- The 0067 read policy on public.standards was `using (true)`. Now that rows
-- can arrive unpublished, a reader sees published reference data only.
drop policy if exists standards_select on public.standards;
create policy standards_select on public.standards
  for select to authenticated
  using ((published_at is not null and status <> 'draft') or app.is_standards_admin());
create policy standards_admin_write on public.standards
  for all to authenticated using (app.is_standards_admin()) with check (app.is_standards_admin());

select app.assert_schema_invariants();
