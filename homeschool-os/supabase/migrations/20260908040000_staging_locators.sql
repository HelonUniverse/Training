-- =============================================================================
-- 0080  Making the locator columns reachable
-- =============================================================================
-- 0078 added `source_page` and `source_locator` to the staging table and to
-- public.standards, for the reason that makes a spot check possible: a person
-- who doubts a published benchmark needs to be told where in the artifact to
-- look, and a disagreement between our record and the document has to be
-- resolvable without re-parsing anything.
--
-- It did not give either column a write path. `stage_standard_record` takes no
-- locator, and `publish_standards_batch` does not carry one across. So the
-- columns exist, are documented, and would have been NULL for every row this
-- pipeline ever produced - a provenance guarantee that reads as implemented and
-- is not.
--
-- Also here: the staged row's link to its domain. `publish_standards_batch`
-- reads `r.domain_id` when building a canonical row, and nothing in the RPC
-- surface ever set it, so every published standard would have arrived with a
-- null domain while the source's strand sat unused two columns away. The
-- resolution happens INSIDE the staging RPC, from the batch's own framework
-- version, so an importer cannot attach a row to a domain from some other
-- framework by passing the wrong id.
-- =============================================================================

/**
 * Record one parsed row, with where it was read from.
 *
 * `p_source_locator` is free text on purpose: what makes a row findable differs
 * by representation. A PDF wants a page and a line span; this markup export
 * wants a line number and the grade and strand headings the row sits under; a
 * spreadsheet wants a sheet and a cell. Constraining it to a page number would
 * have made it unusable for two of those three.
 */
create or replace function public.stage_standard_record(
  p_batch uuid, p_row integer, p_status text,
  p_source_code text default null, p_source_statement text default null,
  p_source_grade text default null, p_source_domain_code text default null,
  p_source_domain_name text default null, p_source_language text default 'en',
  p_raw jsonb default '{}'::jsonb,
  p_normalized_code text default null, p_normalized_grade text default null,
  p_normalized_subject text default null, p_reference_kind text default 'benchmark',
  p_aliases text[] default '{}', p_warnings jsonb default '[]'::jsonb,
  p_source_page integer default null, p_source_locator text default null)
returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare
  v_id      uuid;
  v_version uuid;
  v_domain  uuid;
begin
  if not app.is_standards_admin() then
    raise exception 'standards administration is a platform capability'
      using errcode = 'insufficient_privilege';
  end if;

  -- The domain is resolved from THIS batch's framework version. An importer
  -- cannot hand us a domain id belonging to another framework, because it never
  -- hands us one at all.
  select framework_version_id into v_version
    from public.standards_import_batches where id = p_batch;
  if v_version is not null and p_source_domain_code is not null then
    select id into v_domain from public.standards_domains
     where framework_version_id = v_version and code = p_source_domain_code;
  end if;

  insert into public.standards_staged_records (
    batch_id, row_number, status, source_code, source_statement, source_grade,
    source_domain_code, source_domain_name, source_language, raw,
    normalized_code, normalized_grade, normalized_subject, reference_kind,
    domain_id, search_aliases, warnings, source_page, source_locator)
  values (p_batch, p_row, p_status::app.staged_status, p_source_code, p_source_statement,
          p_source_grade, p_source_domain_code, p_source_domain_name, p_source_language, p_raw,
          p_normalized_code, p_normalized_grade, p_normalized_subject,
          p_reference_kind::app.standards_reference_kind, v_domain, p_aliases, p_warnings,
          p_source_page, p_source_locator)
  on conflict (batch_id, row_number) do update
    set status = excluded.status,
        normalized_code = excluded.normalized_code,
        normalized_grade = excluded.normalized_grade,
        normalized_subject = excluded.normalized_subject,
        reference_kind = excluded.reference_kind,
        domain_id = excluded.domain_id,
        search_aliases = excluded.search_aliases,
        warnings = excluded.warnings,
        source_page = excluded.source_page,
        source_locator = excluded.source_locator
  returning id into v_id;
  return v_id;
end $fn$;

-- The 16-argument form is dropped: leaving it would leave a staging path that
-- silently cannot record where a row came from, which is exactly the state this
-- migration exists to end.
drop function if exists public.stage_standard_record(
  uuid, integer, text, text, text, text, text, text, text, jsonb, text, text,
  text, text, text[], jsonb);

revoke all on function public.stage_standard_record(
  uuid, integer, text, text, text, text, text, text, text, jsonb, text, text,
  text, text, text[], jsonb, integer, text) from public, anon;
grant execute on function public.stage_standard_record(
  uuid, integer, text, text, text, text, text, text, text, jsonb, text, text,
  text, text, text[], jsonb, integer, text) to authenticated, service_role;

/**
 * Publication, now carrying the locator across the gate.
 *
 * Identical to the 0078 body except that `source_page` and `source_locator`
 * travel with the row. A published benchmark whose provenance stops at "it came
 * from this file" cannot be checked; one that says which line of which file can.
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
      normalized_subject, search_aliases, status, source_url, source_page,
      source_locator, published_by, published_at)
    select f.framework_id, v_version, r.normalized_code, r.source_statement,
           r.source_grade, r.normalized_subject, r.domain_id, r.reference_kind,
           v_batch.source_id, r.id, r.normalized_grade, r.normalized_subject,
           r.search_aliases, 'active', v_source.source_url, r.source_page,
           r.source_locator, auth.uid(), now()
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

select app.assert_schema_invariants();
