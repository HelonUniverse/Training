-- =============================================================================
-- 0060  STEP 4 - reading a stored file
-- =============================================================================
-- 0035 gave the document buckets no SELECT policy at all, with the intention
-- that a route handler would mint every signed URL under service_role. STEP 4
-- rules that out: service-role credentials must not sit in a normal request
-- path, where one mistake reads every family's files.
--
-- So the read is authorised the way every other read is - by RLS, derived from
-- the document row rather than restated:
--
--     may I read these bytes?  <=>  can I see the documents row that owns them,
--                                   and has it come back clean?
--
-- The subquery is itself RLS-filtered by documents_select (which calls
-- app.can_read_document), so this policy adds no authority of its own. It only
-- narrows: a pending, failed or infected file has no readable bytes even for
-- the person who uploaded it, even though they can still see its row and be
-- told it is still processing.
--
-- The trade-off, stated plainly. /api/documents/[id]/url writes a
-- document_viewed audit row before minting a signed URL, but a user who is
-- ALREADY authorised could call storage directly with their own session and
-- read the object without producing that row. Closing that gap means putting
-- service-role credentials in the request path, which is the larger risk. The
-- audit trail records views through the product; it is not the access control.
-- =============================================================================

-- The policy joins objects to documents by path, so that lookup needs an index.
create index if not exists documents_storage_object_idx
  on public.documents (storage_bucket, storage_path) where deleted_at is null;

create policy "read own clean document bytes" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('uploads-quarantine', 'documents', 'portfolio')
    and exists (
      select 1 from public.documents d
       where d.storage_bucket = storage.objects.bucket_id
         and d.storage_path   = storage.objects.name
         and d.deleted_at is null
         and d.scan_status = 'clean'));

comment on policy "read own clean document bytes" on storage.objects is
  'Bytes are readable exactly when the owning documents row is readable AND the '
  'file scanned clean. Adds no authority: the subquery runs under documents_select.';

select app.assert_schema_invariants();
