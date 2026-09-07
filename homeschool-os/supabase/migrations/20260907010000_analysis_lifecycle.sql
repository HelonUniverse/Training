-- =============================================================================
-- 0066  STEP 5 - the analysis lifecycle, kept separate from the malware scan
-- =============================================================================
-- Two pipelines touch a document and they are NOT the same pipeline:
--
--   scan_status      is this file SAFE?          decided by the scanner
--   analysis_status  has Nestra READ it yet?     decided by the analysis worker
--
-- A document is routinely `scan_status = clean` and `analysis_status = queued`
-- at the same time, and that distinction has to stay obvious in the schema or
-- it will stop being obvious in the code. Overloading scan_status to mean both
-- would make "is this safe" and "have we looked at it" the same question, and
-- the first time they disagree someone ships a file to a model that the scanner
-- has not cleared.
--
-- WHAT CHANGES ON AN EXISTING TABLE. document_ai_analysis was created in 0018
-- with `status text check (status in (pending,running,succeeded,failed,
-- low_confidence))`. That column is replaced by `analysis_status`, a real enum
-- carrying the states STEP 5 actually needs (queued/processing/completed/
-- partial/failed/unsupported). This is a deliberate, visible replacement, not a
-- silent widening: the table holds zero rows, is referenced by no policy, no
-- function, no view and no application code, and leaving a vestigial column
-- that means almost-but-not-quite the same thing is how the next person writes
-- a bug. `low_confidence` is not a lifecycle state - confidence is per field
-- (see ai_suggestion_fields below), so a run can complete with low confidence
-- and still be `completed`.
-- =============================================================================

create type app.analysis_status as enum (
  'not_requested',  -- nobody has asked; the default for every existing document
  'queued',         -- a job exists, the worker has not picked it up
  'processing',     -- the worker holds it
  'completed',      -- every requested field was attempted
  'partial',        -- some fields extracted, some could not be
  'failed',         -- the provider or the pipeline errored; retryable
  'unsupported'     -- we cannot decode this format; NOT a failure, and not retried
);

-- How the bytes were read. Recorded rather than guessed, so "did we OCR this?"
-- is answerable after the fact and we never OCR every PDF blindly.
create type app.extraction_strategy as enum (
  'pdf_text',       -- the PDF carried a real text layer; no OCR needed
  'pdf_ocr',        -- scanned/image PDF, rasterised and read
  'image_vision',   -- a photograph or image
  'none'            -- nothing was read (unsupported, or refused before reading)
);

-- Per-field decision state. The whole point of STEP 5's review UI is that a
-- parent accepts the subject and rejects the date, so the decision cannot live
-- on the suggestion as a whole.
create type app.suggestion_field_status as enum (
  'pending', 'accepted', 'edited', 'rejected'
);

-- --- document_ai_analysis: lifecycle, versioning, idempotency ----------------

alter table public.document_ai_analysis drop column status;

alter table public.document_ai_analysis
  add column analysis_status    app.analysis_status not null default 'queued',
  -- WHICH BYTES were analysed. A new version of a document is a different
  -- document as far as analysis is concerned, and its old extraction must not
  -- be presented as describing the new file.
  add column document_version_id uuid references public.document_versions(id) on delete set null,
  -- Bumped by an explicit "Analyze again". (document, version, analysis_version)
  -- is unique, which is what makes re-running free of charge by default.
  add column analysis_version   integer not null default 1,
  add column strategy           app.extraction_strategy not null default 'none',
  add column requested_by       uuid references auth.users(id) on delete set null,
  add column attempts           integer not null default 0,
  add column next_retry_at      timestamptz,
  add column completed_at       timestamptz,
  add constraint daa_analysis_version_positive check (analysis_version >= 1),
  add constraint daa_attempts_bounded check (attempts >= 0 and attempts <= 5);

-- THE IDEMPOTENCY RULE. One analysis per (document, version, analysis_version).
-- A parent tapping "Analyze" twice, a duplicated job, or a worker retry after a
-- lost acknowledgement all collide here rather than spending money twice.
create unique index daa_idempotency_idx
  on public.document_ai_analysis (document_id, coalesce(document_version_id, document_id), analysis_version);

create index daa_status_idx on public.document_ai_analysis (analysis_status, next_retry_at)
  where analysis_status in ('queued', 'failed');

comment on column public.document_ai_analysis.analysis_status is
  'Where this document is in the ANALYSIS pipeline. Independent of scan_status, '
  'which is the malware pipeline. A file is routinely clean and queued at once.';
comment on column public.document_ai_analysis.strategy is
  'How the bytes were actually read, recorded rather than assumed - so "did we '
  'OCR this?" stays answerable and no PDF is OCR''d blindly.';
comment on column public.document_ai_analysis.analysis_version is
  'Bumped only by an explicit "Analyze again". Together with document_version_id '
  'this is the idempotency key that stops a family paying twice for one file.';

-- --- per-field suggestions ---------------------------------------------------
-- ai_suggestions (0020) already carries the ENVELOPE: which document, which
-- kind, who decided, what was applied. What it cannot carry is the thing STEP 5
-- requires most: a high-confidence subject sitting beside a low-confidence date,
-- each accepted or rejected on its own.
--
-- A confidence on the suggestion as a whole is a lie about the fields inside it.

create table public.ai_suggestion_fields (
  id                uuid primary key default gen_random_uuid(),
  suggestion_id     uuid not null references public.ai_suggestions(id) on delete cascade,
  -- Denormalised for RLS: the policy must be answerable without joining out to
  -- the parent on every row. Kept honest by a trigger below.
  family_id         uuid references public.families(id) on delete cascade,
  organization_id   uuid references public.organizations(id) on delete set null,
  student_id        uuid references public.students(id) on delete cascade,

  field_key         text not null,
  suggested_value   jsonb,                -- null is a real answer: "no evidence"
  confidence        numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  confidence_band   app.confidence_band,
  -- WHY. A quote from the document, a page number, a note that the field was
  -- illegible. This is what makes a suggestion reviewable rather than oracular.
  evidence          text,
  evidence_page     integer,

  status            app.suggestion_field_status not null default 'pending',
  accepted_value    jsonb,                -- what the human actually kept
  decided_by        uuid references auth.users(id) on delete set null,
  decided_at        timestamptz,

  -- True when the human already had a value here before the AI spoke. The
  -- review UI shows the suggestion beside the human value and NEVER on top of
  -- it; this flag is what lets it know.
  conflicts_with_human boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint asf_field_once unique (suggestion_id, field_key),
  -- A decision has a decider and a time, or it is not a decision.
  constraint asf_decision_complete check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null)),
  -- An edit must say what it was edited to.
  constraint asf_edited_has_value check (status <> 'edited' or accepted_value is not null)
);

create index asf_suggestion_idx on public.ai_suggestion_fields (suggestion_id);
create index asf_pending_idx on public.ai_suggestion_fields (family_id, status)
  where status = 'pending';
select app.attach_updated_at('public.ai_suggestion_fields');

comment on table public.ai_suggestion_fields is
  'One row per suggested field, each with its own confidence, evidence and '
  'decision. A confident guess at the subject says nothing about the date, and '
  'a single confidence on the parent suggestion would claim otherwise.';

-- The tenant columns are derived from the parent, never supplied by the caller.
-- Without this a client could insert a field row pointing at its own family
-- while the suggestion belongs to another - and the RLS policy, which trusts
-- these columns, would let it through.
create or replace function app.inherit_suggestion_tenancy()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_parent public.ai_suggestions;
begin
  select * into v_parent from public.ai_suggestions s where s.id = new.suggestion_id;
  if not found then
    raise exception 'no such suggestion' using errcode = 'foreign_key_violation';
  end if;
  new.family_id       := v_parent.family_id;
  new.organization_id := v_parent.organization_id;
  new.student_id      := v_parent.student_id;
  return new;
end $$;

revoke all on function app.inherit_suggestion_tenancy() from public, anon, authenticated;

create trigger inherit_suggestion_tenancy
  before insert or update of suggestion_id on public.ai_suggestion_fields
  for each row execute function app.inherit_suggestion_tenancy();

comment on function app.inherit_suggestion_tenancy() is
  'Copies the tenant columns down from the parent suggestion. They are what the '
  'RLS policy reads, so letting a caller set them would let a caller choose '
  'which family owns the row.';

alter table public.ai_suggestion_fields enable row level security;

-- Reading a suggested field is reading the suggestion it belongs to, so the
-- predicate is the parent's, applied to the inherited tenant columns.
create policy ai_suggestion_fields_select on public.ai_suggestion_fields
  for select to authenticated
  using ((student_id is not null
          and student_id in (select app.my_student_ids_for('student_profile', 'read')))
         or (student_id is null and family_id is not null and app.is_family_member(family_id))
         or (student_id is null and organization_id is not null and app.is_org_member(organization_id)));

-- DECIDING is a write. It requires the authority to change the record the
-- suggestion is about - not merely to see it. A view-only guardian reads every
-- suggestion on their child and accepts none of them.
create policy ai_suggestion_fields_update on public.ai_suggestion_fields
  for update to authenticated
  using ((student_id is not null and app.can_student_action(student_id, 'portfolio', 'update'))
         or (student_id is null and family_id is not null and app.is_family_member(family_id)))
  with check ((student_id is not null and app.can_student_action(student_id, 'portfolio', 'update'))
              or (student_id is null and family_id is not null and app.is_family_member(family_id)));

-- No INSERT and no DELETE policy, deliberately. Suggestion rows are written by
-- the analysis worker under service_role and are part of the audit record; a
-- user decides them, and never authors or erases them.

comment on policy ai_suggestion_fields_update on public.ai_suggestion_fields is
  'Deciding a suggestion is a WRITE against the underlying record. Seeing a '
  'suggestion is not authority to accept it.';

select app.assert_schema_invariants();
