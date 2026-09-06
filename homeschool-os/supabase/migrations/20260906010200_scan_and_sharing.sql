-- =============================================================================
-- 0058  STEP 4 - scan pipeline boundary and document sharing
-- =============================================================================
-- SCANNING
-- --------
-- A document is created 'pending' and stays there until a trusted worker says
-- otherwise. Only service_role may call app.record_scan_result, so the client
-- can never declare its own upload clean - which is the whole point.
--
-- With NO scanner configured, documents simply remain pending and are not
-- delivered. That is the safe default: nothing is silently marked clean.
--
-- SHARING
-- -------
-- 0042 gave document_shares its policies. What was missing was a safe way to
-- create and revoke a share, and an audit trail for both. These RPCs are
-- SECURITY INVOKER, so the document.share capability is still what decides.
-- =============================================================================

-- A scan result is a real auditable event; the STEP 2 enum had no label for it.
alter type app.audit_action add value if not exists 'document_scanned';

-- --- the trusted worker boundary ---------------------------------------------

create or replace function app.record_scan_result(
  p_document uuid,
  p_result   app.scan_status,
  p_detail   text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_family uuid; v_student uuid;
begin
  -- Callable only by the trusted worker. auth.uid() is null under service_role;
  -- a user session must never reach this.
  if auth.uid() is not null then
    raise exception 'scan results may only be recorded by the scanning worker'
      using errcode = 'insufficient_privilege';
  end if;
  if p_result = 'pending' then
    raise exception 'pending is the initial state, not a result'
      using errcode = 'check_violation';
  end if;

  select family_id, student_id into v_family, v_student
    from public.documents where id = p_document;
  if not found then
    raise exception 'document not found';
  end if;

  update public.documents
     set scan_status = p_result,
         scanned_at  = now(),
         status = case p_result
                    when 'clean'    then 'filed'::app.document_status
                    when 'infected' then 'quarantined'::app.document_status
                    when 'error'    then 'failed'::app.document_status
                    else status
                  end,
         metadata = metadata || jsonb_build_object(
                      'scan', jsonb_build_object(
                        'result', p_result::text,
                        'detail', p_detail,
                        'at', to_jsonb(now())))
   where id = p_document;

  perform app.audit('document_scanned', 'document', p_document, v_student, null, v_family,
                    jsonb_build_object('result', p_result::text, 'detail', p_detail));
end;
$fn$;

revoke all on function app.record_scan_result(uuid, app.scan_status, text)
  from public, anon, authenticated;
grant execute on function app.record_scan_result(uuid, app.scan_status, text) to service_role;

comment on function app.record_scan_result(uuid, app.scan_status, text) is
  'The ONLY way a document leaves scan_status = pending. service_role only; '
  'refuses to run inside a user session.';

/**
 * PostgREST only exposes `public`, so the worker reaches the boundary through
 * this wrapper. It is granted to service_role ONLY, and the function it calls
 * refuses to run inside a user session anyway - two independent locks.
 */
create or replace function public.record_scan_result(
  p_document uuid,
  p_result   app.scan_status,
  p_detail   text default null)
returns void
language sql
security invoker
set search_path = ''
as $fn$
  select app.record_scan_result(p_document, p_result, p_detail);
$fn$;

revoke all on function public.record_scan_result(uuid, app.scan_status, text)
  from public, anon, authenticated;
grant execute on function public.record_scan_result(uuid, app.scan_status, text) to service_role;

/** Is this document safe to hand to a user yet? */
create or replace function public.document_is_deliverable(p_document uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $fn$
  select exists (
    select 1 from public.documents d
     where d.id = p_document
       and d.deleted_at is null
       and d.scan_status = 'clean');
$fn$;

-- --- sharing ------------------------------------------------------------------

create or replace function public.share_document(
  p_document     uuid,
  p_with_user    uuid        default null,
  p_with_org     uuid        default null,
  p_with_grant   uuid        default null,
  p_expires_at   timestamptz default null,
  p_can_download boolean     default true,
  p_reason       text        default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_share uuid := gen_random_uuid();
  v_student uuid; v_family uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if coalesce((p_with_user is not null)::int,0)
   + coalesce((p_with_org  is not null)::int,0)
   + coalesce((p_with_grant is not null)::int,0) <> 1 then
    raise exception 'a share names exactly one recipient' using errcode = 'check_violation';
  end if;

  -- Visible only if the caller can already read it.
  select d.student_id, d.family_id into v_student, v_family
    from public.documents d where d.id = p_document;
  if not found then
    raise exception 'document not found' using errcode = 'insufficient_privilege';
  end if;

  -- The INSERT policy re-checks document.share; this is the friendly error.
  if v_student is not null
     and not app.can_student_action(v_student, 'document', 'share') then
    raise exception 'not permitted to share this document'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.document_shares (
    id, document_id, student_id, shared_by, shared_with_user_id,
    shared_with_organization_id, shared_with_grant_id,
    expires_at, can_download, reason)
  values (
    v_share, p_document, v_student, v_user, p_with_user,
    p_with_org, p_with_grant,
    p_expires_at, coalesce(p_can_download, true), nullif(trim(coalesce(p_reason,'')),''));

  -- No app.audit() call here on purpose. 0042's audit_document_share trigger
  -- already writes the row, with more detail than this function has, and an
  -- explicit call in addition produced TWO audit rows for one share - which
  -- would quietly make "how many times was this shared" wrong.
  return v_share;
end;
$fn$;

create or replace function public.revoke_document_share(p_share uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_user uuid := auth.uid(); v_n int;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  update public.document_shares
     set revoked_at = now(), revoked_by = v_user
   where id = p_share and revoked_at is null;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;
  -- audit_document_share covers the revoke too (UPDATE branch).
end;
$fn$;

/** Recorded whenever a signed URL is minted, so every view is auditable. */
create or replace function public.record_document_view(p_document uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $fn$
declare v_student uuid; v_family uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select d.student_id, d.family_id into v_student, v_family
    from public.documents d where d.id = p_document;
  if not found then
    raise exception 'document not found' using errcode = 'insufficient_privilege';
  end if;

  perform app.audit('document_viewed', 'document', p_document, v_student, null, v_family, '{}'::jsonb);
end;
$fn$;

revoke all on function
  public.document_is_deliverable(uuid),
  public.share_document(uuid,uuid,uuid,uuid,timestamptz,boolean,text),
  public.revoke_document_share(uuid),
  public.record_document_view(uuid)
from public, anon;

grant execute on function
  public.document_is_deliverable(uuid),
  public.share_document(uuid,uuid,uuid,uuid,timestamptz,boolean,text),
  public.revoke_document_share(uuid),
  public.record_document_view(uuid)
to authenticated, service_role;

select app.assert_schema_invariants();
