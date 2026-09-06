-- =============================================================================
-- 0062  STEP 4 - recording a page of views in one call
-- =============================================================================
-- The portfolio timeline shows the family's own photographs, which means one
-- signed URL per visible item. Every one of those hands real bytes to a
-- browser, so every one is a view worth recording - but doing it a row at a
-- time is a round trip per thumbnail, and a scroll would spend more time
-- auditing than rendering.
--
-- SECURITY INVOKER, so each id is still filtered by documents_select: a
-- document the caller cannot read produces no row, and the array is not a way
-- to write audit entries about documents belonging to anyone else.
-- =============================================================================

create or replace function public.record_document_views(p_documents uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_n integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(array_length(p_documents, 1), 0) = 0 then
    return 0;
  end if;
  if array_length(p_documents, 1) > 100 then
    raise exception 'too many documents in one view batch' using errcode = 'check_violation';
  end if;

  -- Both statements read through documents_select, so ids the caller cannot
  -- see fall out here and produce nothing.
  select count(*)::int into v_n
    from public.documents d
   where d.id = any(p_documents) and d.deleted_at is null and d.scan_status = 'clean';

  perform app.audit('document_viewed', 'documents', d.id, d.student_id, null, d.family_id,
                    jsonb_build_object('batch', true))
     from public.documents d
    where d.id = any(p_documents)
      and d.deleted_at is null
      and d.scan_status = 'clean';

  return v_n;
end;
$fn$;

revoke all on function public.record_document_views(uuid[]) from public, anon;
grant execute on function public.record_document_views(uuid[]) to authenticated, service_role;

comment on function public.record_document_views(uuid[]) is
  'Records one document_viewed audit row per readable, clean document in the '
  'batch. Ids the caller cannot see are silently absent, never an error.';

select app.assert_schema_invariants();
