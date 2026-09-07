-- =============================================================================
-- 0077  The publication gate, as functions
-- =============================================================================
-- Every one of these is SECURITY INVOKER. They add transactionality and a
-- single place to state a rule; they add no authority. If the caller is not a
-- standards administrator, the RLS policies in 0074-0076 refuse the write and
-- the function refuses with it. There is no path here that a parent, teacher,
-- org admin or evaluator can use to change what every family reads.
-- =============================================================================

/** Register an artifact. Identity is its bytes, so this is idempotent. */
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
  p_published_on    date default null)
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
    sha256, byte_size, source_url, source_language, source_published_on, created_by)
  values (p_authority::app.standards_source_authority, p_authority_name, p_artifact_name,
          p_detected_format::app.standards_source_format, p_declared_mime,
          lower(p_sha256), p_byte_size, p_source_url, p_language, p_published_on, auth.uid())
  returning id into v_id;
  return v_id;
end $fn$;

/**
 * Open a batch for (source, adapter, adapter_version).
 *
 * Returns the existing batch when the same artifact has already been parsed by
 * the same adapter at the same version - which is the whole of requirement 29's
 * "same version + same hash = no-op". A CHANGED artifact has a different sha256
 * and therefore a different source row, so it cannot silently overwrite this one.
 */
create or replace function public.open_standards_import(
  p_source uuid, p_adapter text, p_adapter_version text,
  p_framework_version uuid default null, p_scope jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
declare v_id uuid; v_status app.import_status; v_new boolean := false;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  select id, status into v_id, v_status from public.standards_import_batches
   where source_id = p_source and adapter = p_adapter and adapter_version = p_adapter_version;

  if not found then
    insert into public.standards_import_batches (
      source_id, adapter, adapter_version, framework_version_id, requested_scope,
      status, started_at, created_by)
    values (p_source, p_adapter, p_adapter_version, p_framework_version, p_scope,
            'parsing', now(), auth.uid())
    returning id, status into v_id, v_status;
    v_new := true;
  end if;

  return jsonb_build_object('batch_id', v_id, 'status', v_status::text, 'created', v_new);
end $fn$;

/** Record one parsed row. Source columns are evidence; normalized are ours. */
create or replace function public.stage_standard_record(
  p_batch uuid, p_row integer, p_status text,
  p_source_code text default null, p_source_statement text default null,
  p_source_grade text default null, p_source_domain_code text default null,
  p_source_domain_name text default null, p_source_language text default 'en',
  p_raw jsonb default '{}'::jsonb,
  p_normalized_code text default null, p_normalized_grade text default null,
  p_normalized_subject text default null, p_reference_kind text default 'benchmark',
  p_aliases text[] default '{}', p_warnings jsonb default '[]'::jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare v_id uuid;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.standards_staged_records (
    batch_id, row_number, status, source_code, source_statement, source_grade,
    source_domain_code, source_domain_name, source_language, raw,
    normalized_code, normalized_grade, normalized_subject, reference_kind,
    search_aliases, warnings)
  values (p_batch, p_row, p_status::app.staged_status, p_source_code, p_source_statement,
          p_source_grade, p_source_domain_code, p_source_domain_name, p_source_language, p_raw,
          p_normalized_code, p_normalized_grade, p_normalized_subject,
          p_reference_kind::app.standards_reference_kind, p_aliases, p_warnings)
  on conflict (batch_id, row_number) do update
    set status = excluded.status,
        normalized_code = excluded.normalized_code,
        normalized_grade = excluded.normalized_grade,
        normalized_subject = excluded.normalized_subject,
        reference_kind = excluded.reference_kind,
        search_aliases = excluded.search_aliases,
        warnings = excluded.warnings
  returning id into v_id;
  return v_id;
end $fn$;

/** A reviewer's decision. Correcting normalization is allowed; source is not. */
create or replace function public.review_staged_record(
  p_record uuid, p_decision text, p_note text default null,
  p_normalized_code text default null, p_normalized_grade text default null,
  p_normalized_subject text default null)
returns boolean language plpgsql security invoker set search_path = '' as $fn$
declare v_n integer;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;
  if p_decision not in ('approved', 'rejected', 'staged', 'unresolved') then
    raise exception 'unknown review decision: %', p_decision using errcode = 'check_violation';
  end if;

  update public.standards_staged_records s
     set status = p_decision::app.staged_status,
         review_note = coalesce(p_note, s.review_note),
         normalized_code = coalesce(p_normalized_code, s.normalized_code),
         normalized_grade = coalesce(p_normalized_grade, s.normalized_grade),
         normalized_subject = coalesce(p_normalized_subject, s.normalized_subject),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where s.id = p_record;
  get diagnostics v_n = row_count;
  return v_n = 1;
end $fn$;

/**
 * Publish the approved rows of a batch into public.standards.
 *
 * The gate. Only rows a person marked `approved` cross it, each one carrying
 * the batch, the source and the staged row it came from, so any published
 * benchmark can be traced back to the bytes it was read out of.
 *
 * A synthetic_test source can never publish: fixtures prove the architecture,
 * they do not become reference data a family might repeat to a district.
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
    -- The index is partial, so the predicate has to be restated for the
    -- inference to find it.
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

-- =============================================================================
-- The progression boundary
-- =============================================================================
-- A framework's own progression document says how ITS benchmarks build on each
-- other. That is a claim about the framework, not about how a child learns, and
-- Nestra's prerequisite graph is the learner model. A reviewer may read a
-- progression while designing skill relationships; an import may not write one.

create or replace function app.prerequisites_are_not_imported()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_type::text in ('import', 'ai_suggestion') then
    raise exception
      'a standards progression is a reference, not a learning sequence; '
      'skill prerequisites are authored, not imported'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function app.prerequisites_are_not_imported() from public, anon, authenticated;

create trigger prerequisites_are_not_imported
  before insert or update on public.skill_prerequisites
  for each row execute function app.prerequisites_are_not_imported();

revoke all on function
  public.register_standards_source(text, text, text, text, text, bigint, text, text, text, date),
  public.open_standards_import(uuid, text, text, uuid, jsonb),
  public.stage_standard_record(uuid, integer, text, text, text, text, text, text, text, jsonb, text, text, text, text, text[], jsonb),
  public.review_staged_record(uuid, text, text, text, text, text),
  public.publish_standards_batch(uuid)
from public, anon;

grant execute on function
  public.register_standards_source(text, text, text, text, text, bigint, text, text, text, date),
  public.open_standards_import(uuid, text, text, uuid, jsonb),
  public.stage_standard_record(uuid, integer, text, text, text, text, text, text, text, jsonb, text, text, text, text, text[], jsonb),
  public.review_staged_record(uuid, text, text, text, text, text),
  public.publish_standards_batch(uuid)
to authenticated, service_role;

select app.assert_schema_invariants();
