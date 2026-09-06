-- =============================================================================
-- 0061  STEP 4 - scan_status is not the client's to write
-- =============================================================================
-- Found by test 2b in tests/rls/08_step4_capture.sql.
--
-- app.record_scan_result is service_role only and refuses to run inside a user
-- session, which made it look as though a user could not move a document out of
-- 'pending'. They could. documents_update allows `uploaded_by = auth.uid()` so
-- that a parent can fix a title they mistyped, and RLS is row-level: it has
-- nothing to say about WHICH columns an allowed update touches. So this worked,
-- straight from the browser with an ordinary session:
--
--     PATCH /rest/v1/documents?id=eq.<mine>   {"scan_status": "clean"}
--
-- and the file became deliverable without ever being scanned. Uploading the
-- malware and then clearing it yourself is one request.
--
-- The fix mirrors app.protect_document_identity(): the scan columns are simply
-- not writable from a user session. The worker runs with auth.uid() = null, so
-- it passes through untouched, and app.record_scan_result remains the only
-- granted way to reach it.
--
-- This is a column-level rule, so it belongs in a trigger rather than a policy.
-- Expressing it as `with check (scan_status = ...)` cannot work: a policy sees
-- the proposed row, not which columns the client actually named.
-- =============================================================================

create or replace function app.protect_scan_state()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- auth.uid() is null for the scanning worker (service_role) and for
  -- maintenance run as the table owner. Everyone else is a user session.
  if auth.uid() is not null
     and (new.scan_status is distinct from old.scan_status
          or new.scanned_at is distinct from old.scanned_at) then
    raise exception
      'the scan state of a document is set by the scanning worker, not by its uploader'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- A trigger function is never called directly; the schema invariants require
-- that to be true of the grants as well as of the intent.
revoke all on function app.protect_scan_state() from public, anon, authenticated;

create trigger protect_scan_state
  before update on public.documents
  for each row execute function app.protect_scan_state();

comment on function app.protect_scan_state() is
  'Refuses any change to scan_status or scanned_at from a user session. Without '
  'it, documents_update (which exists so an uploader can correct a title) also '
  'let the uploader mark their own file clean.';

select app.assert_schema_invariants();
