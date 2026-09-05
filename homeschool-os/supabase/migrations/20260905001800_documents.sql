-- =============================================================================
-- 0018  Documents and AI document analysis
-- =============================================================================
-- The uploaded file is IMMUTABLE. Everything the AI derives from it is stored
-- separately in document_ai_analysis, so re-analysis never risks the original.
-- =============================================================================

create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete set null,
  family_id           uuid references public.families(id) on delete cascade,
  student_id          uuid references public.students(id) on delete cascade,
  academic_year_id    uuid references public.academic_years(id) on delete set null,
  subject_id          uuid references public.subjects(id) on delete set null,
  uploaded_by         uuid references public.profiles(id),
  storage_bucket      text not null default 'documents',
  storage_path        text not null,
  original_filename   text not null,
  mime_type           text not null,
  byte_size           bigint not null check (byte_size > 0),
  sha256              text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  page_count          int,
  title               text,
  description         text,
  category            app.document_category not null default 'unclassified',
  document_date       date,
  status              app.document_status not null default 'uploaded',
  scan_status         app.scan_status not null default 'pending',
  scanned_at          timestamptz,
  record_class        app.record_class not null default 'student_educational',
  owner_organization_id uuid references public.organizations(id) on delete set null,
  visibility          text not null default 'family'
                        check (visibility in ('private','family','staff','organization')),
  is_official         boolean not null default false,
  retention_until     date,
  legal_hold          boolean not null default false,
  source              text not null default 'upload'
                        check (source in ('upload','generated','evaluator','import','organization')),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles(id),
  constraint documents_scope_ck check (
    family_id is not null or organization_id is not null or student_id is not null),
  -- A document under legal hold or inside a retention window cannot be soft-deleted.
  constraint documents_retention_ck check (
    deleted_at is null
    or (not legal_hold and (retention_until is null or retention_until < current_date)))
);
create unique index documents_family_hash_idx on public.documents (family_id, sha256)
  where deleted_at is null and family_id is not null;
create index documents_student_date_idx on public.documents (student_id, document_date desc) where deleted_at is null;
create index documents_org_idx on public.documents (organization_id) where deleted_at is null;
create index documents_inbox_idx on public.documents (family_id, created_at desc)
  where status in ('uploaded','processing','needs_review');
create index documents_scan_pending_idx on public.documents (scan_status) where scan_status = 'pending';
create index documents_retention_idx on public.documents (retention_until) where retention_until is not null;
select app.attach_updated_at('public.documents');

comment on column public.documents.record_class is
  'student_educational documents follow the family forever. organization_operational '
  'documents (contracts, HR, incident paperwork) stay with the organization.';
comment on column public.documents.sha256 is
  'Content address. Also powers duplicate detection and tamper evidence.';

alter table public.assessments
  add constraint assessments_source_document_fk
  foreign key (source_document_id) references public.documents(id) on delete set null;

-- Generated artefacts (a rendered NOI, a report PDF) may be regenerated; the
-- original upload is never versioned because it is never changed.
create table public.document_versions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.documents(id) on delete cascade,
  version       int not null,
  storage_path  text not null,
  byte_size     bigint not null,
  sha256        text not null,
  generated_by  uuid references public.profiles(id),
  reason        text,
  created_at    timestamptz not null default now(),
  unique (document_id, version)
);
create index document_versions_doc_idx on public.document_versions (document_id, version desc);

create table public.document_ai_analysis (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  family_id         uuid references public.families(id) on delete cascade,
  provider          text not null,
  model             text not null,
  prompt_version    text not null,
  schema_version    text not null default 'document_analysis.v1',
  status            text not null default 'pending'
                      check (status in ('pending','running','succeeded','failed','low_confidence')),
  text_content      text,
  ocr_used          boolean not null default false,
  raw_response      jsonb,
  extracted         jsonb not null default '{}'::jsonb,
  page_confidences  jsonb not null default '[]'::jsonb,
  detected_entities jsonb not null default '{}'::jsonb,
  missing_fields    jsonb not null default '[]'::jsonb,
  unreadable_regions jsonb not null default '[]'::jsonb,
  confidence        numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  confidence_band   app.confidence_band,
  ai_usage_event_id uuid,                                   -- FK added in 0020
  duration_ms       int,
  error             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index daa_document_idx on public.document_ai_analysis (document_id, created_at desc);
create index daa_family_idx on public.document_ai_analysis (family_id);
select app.attach_updated_at('public.document_ai_analysis');

comment on table public.document_ai_analysis is
  'Derived data only. The source file is never modified; re-running analysis '
  'appends a new row so extraction history is preserved.';

-- The stored file is immutable: identity columns cannot change after insert.
-- Re-processing writes a new document_ai_analysis row; regeneration writes a
-- new document_versions row. The original bytes are never touched.
create or replace function app.protect_document_identity()
returns trigger language plpgsql as $$
begin
  if new.storage_path is distinct from old.storage_path
     or new.storage_bucket is distinct from old.storage_bucket
     or new.sha256 is distinct from old.sha256
     or new.byte_size is distinct from old.byte_size
     or new.original_filename is distinct from old.original_filename then
    raise exception 'the stored file of a document is immutable (document %)', old.id
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;
create trigger protect_document_identity
  before update on public.documents
  for each row execute function app.protect_document_identity();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_ai_analysis enable row level security;
