-- =============================================================================
-- 0078  What KIND of document this is, and which kinds may publish
-- =============================================================================
-- The source-of-truth decision for the first ingestion is Florida's B.E.S.T.
-- Standards for Mathematics, as published by the Florida Department of
-- Education. Not a parent guide. Not an instructional guide. Not a standards
-- progression document. Not an assessment blueprint. Not an instructional
-- materials correlation spreadsheet. Not a third-party export.
--
-- Those documents are USEFUL and several are far easier to parse, which is
-- exactly the problem: the easiest artifact to extract benchmarks from is
-- rarely the one the state actually publishes as the standards, and a benchmark
-- taken from a vendor's correlation spreadsheet is a vendor's transcription of
-- a state document. A family may repeat it to a district as the standard.
--
-- 0074 already recorded WHO published an artifact (`authority`). It did not
-- record WHAT the artifact is, so nothing stopped a correlation spreadsheet
-- from a department of education being registered and published as canonical.
-- This adds that, and makes the publication gate check it.
--
-- Secondary artifacts remain welcome. They register with their own kind, keep
-- their own provenance, and simply cannot become canonical standards.
-- =============================================================================

create type app.source_artifact_kind as enum (
  'canonical_standards_publication',  -- the standards themselves, as published
  'parent_guide',
  'instructional_guide',
  'progression_document',
  'assessment_blueprint',
  'correlation_spreadsheet',
  'third_party_export',
  'other_reference',
  'synthetic_fixture');

alter table public.standards_sources
  add column artifact_kind app.source_artifact_kind not null default 'other_reference';

comment on column public.standards_sources.artifact_kind is
  'WHAT this document is, which is a separate question from who published it. '
  'Only canonical_standards_publication may produce canonical standards; every '
  'other kind registers as a secondary reference with its own provenance.';

/**
 * Registration, now able to DECLARE what the document is.
 *
 * Without this parameter every artifact registered through the RPC would default
 * to `other_reference` and the canonical path would be unreachable - a gate that
 * refuses everything is not a gate, it is an outage. The default stays
 * `other_reference` on purpose: declaring a document to be the standards is a
 * deliberate act, not what happens when the caller says nothing.
 */
create or replace function public.register_standards_source(
  p_authority       text,
  p_authority_name  text,
  p_artifact_name   text,
  p_detected_format text,
  p_sha256          text,
  p_byte_size       bigint,
  p_source_url      text default null,
  p_declared_mime   text default null,
  p_language        text default 'en-US',
  p_published_on    date default null,
  p_artifact_kind   text default 'other_reference')
returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare v_id uuid;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  select id into v_id from public.standards_sources where sha256 = lower(p_sha256);
  if found then
    return v_id;   -- same bytes, same source. Re-registering is a no-op.
  end if;

  insert into public.standards_sources (
    authority, authority_name, artifact_name, detected_format, declared_mime,
    sha256, byte_size, source_url, source_language, source_published_on,
    artifact_kind, created_by)
  values (p_authority::app.standards_source_authority, p_authority_name, p_artifact_name,
          p_detected_format::app.standards_source_format, p_declared_mime,
          lower(p_sha256), p_byte_size, p_source_url, p_language, p_published_on,
          p_artifact_kind::app.source_artifact_kind, auth.uid())
  returning id into v_id;
  return v_id;
end $fn$;

-- The 10-argument form from 0077 is gone: leaving it would leave a registration
-- path that silently cannot declare a kind.
drop function if exists public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date);

revoke all on function public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date, text) from public, anon;
grant execute on function public.register_standards_source(
  text, text, text, text, text, bigint, text, text, text, date, text)
  to authenticated, service_role;

/**
 * The publication gate, now checking the artifact's kind as well as its
 * authority. Replaces the 0077 body; the only change is the second refusal.
 */
create or replace function public.publish_standards_batch(p_batch uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
declare
  v_batch   public.standards_import_batches;
  v_source  public.standards_sources;
  v_version uuid;
  v_published integer := 0;
  v_skipped   integer := 0;
  r record;
  v_std uuid;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_batch from public.standards_import_batches where id = p_batch;
  if not found then raise exception 'no such batch' using errcode = 'check_violation'; end if;
  select * into v_source from public.standards_sources where id = v_batch.source_id;

  if v_source.authority = 'synthetic_test' then
    raise exception 'a synthetic test source cannot publish canonical standards'
      using errcode = 'check_violation',
            hint = 'Fixtures prove the pipeline. Canonical rows need an authoritative artifact.';
  end if;

  -- STEP 6 Phase B: the easiest document to parse is rarely the one the state
  -- publishes as the standards.
  if v_source.artifact_kind <> 'canonical_standards_publication' then
    raise exception
      'a % is a secondary reference and cannot publish canonical standards', v_source.artifact_kind
      using errcode = 'check_violation',
            hint = 'Register the authority''s own standards publication. Guides, '
                   'progressions, blueprints and correlation spreadsheets keep '
                   'their own provenance as secondary references.';
  end if;

  v_version := v_batch.framework_version_id;
  if v_version is null then
    raise exception 'this batch has no framework version; a code without a version is not an identity'
      using errcode = 'check_violation';
  end if;

  for r in
    select * from public.standards_staged_records
     where batch_id = p_batch and status = 'approved' order by row_number
  loop
    if r.normalized_code is null or r.source_statement is null then
      v_skipped := v_skipped + 1;   -- unresolved stays unresolved. We do not fill it in.
      continue;
    end if;

    insert into public.standards (
      framework_id, framework_version_id, code, statement, grade_band, subject_hint,
      domain_id, reference_kind, source_id, staged_record_id, normalized_grade,
      normalized_subject, search_aliases, status, source_url, published_by, published_at)
    select f.framework_id, v_version, r.normalized_code, r.source_statement,
           r.source_grade, r.normalized_subject, r.domain_id, r.reference_kind,
           v_batch.source_id, r.id, r.normalized_grade, r.normalized_subject,
           r.search_aliases, 'active', v_source.source_url, auth.uid(), now()
      from public.standards_framework_versions f where f.id = v_version
    on conflict (framework_version_id, code) where framework_version_id is not null do nothing
    returning id into v_std;

    if v_std is not null then
      v_published := v_published + 1;
      update public.standards_staged_records
         set status = 'published', published_standard_id = v_std where id = r.id;
      if r.source_statement is not null then
        insert into public.standards_texts (standard_id, language, statement, source_id,
                                            authority_name, is_official)
        values (v_std, case when r.source_language = 'en' then 'en-US'
                            when r.source_language = 'es' then 'es-US'
                            else r.source_language end,
                r.source_statement, v_batch.source_id, v_source.authority_name, true)
        on conflict do nothing;
      end if;
    else
      v_skipped := v_skipped + 1;
    end if;
    v_std := null;
  end loop;

  update public.standards_import_batches
     set status = 'published', rows_published = v_published, finished_at = now()
   where id = p_batch;

  return jsonb_build_object('published', v_published, 'skipped', v_skipped);
end $fn$;

-- --- where each benchmark was found in the artifact ---------------------------
-- Requirement 4: retain source page/location where practical. For a PDF this is
-- the page number and the line span the text was read from - which is what makes
-- a spot check possible ("open page 41 and look"), and what makes a
-- disagreement between our record and the document resolvable.

alter table public.standards_staged_records
  add column source_page       integer check (source_page is null or source_page > 0),
  add column source_locator    text;

comment on column public.standards_staged_records.source_locator is
  'Where in the artifact this row was read from - a page and line span for a '
  'PDF, a sheet and cell for a spreadsheet. What a human needs in order to '
  'check our record against the original.';

alter table public.standards
  add column source_page    integer check (source_page is null or source_page > 0),
  add column source_locator text;

select app.assert_schema_invariants();
