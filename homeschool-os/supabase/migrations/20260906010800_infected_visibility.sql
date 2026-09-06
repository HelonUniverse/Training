-- =============================================================================
-- 0064  STEP 4 - an infected upload must still be explainable
-- =============================================================================
-- Found by test S5 in tests/e2e/security.spec.ts.
--
-- Two places excluded infected documents outright - app.can_read_document and
-- the documents_select policy itself, both rebuilt in 0050:
--
--     and scan_status <> 'infected'
--
-- The intent was right and the effect was wrong. It stopped the BYTES from
-- being delivered, but it also made the ROW disappear. So a parent who
-- photographed their child's work, saw "saved", and then had the file refused
-- by the scanner got a notification about it, tapped through, and landed on a
-- 404. From their side the upload had simply vanished, and the natural
-- conclusion is that this product loses things.
--
-- THE GATE ON THE BYTES IS ELSEWHERE AND IS UNAFFECTED. Storage policy "read
-- own clean document bytes" (0060) requires scan_status = 'clean', which
-- 'infected' will never be. Removing these two clauses therefore does not make
-- a single byte of an infected file reachable by anyone. It makes the RECORD
-- readable, by exactly the people who could already read that document, so the
-- app can say what happened.
--
-- Everything below is copied verbatim from 0050 with one line removed from
-- each. A security predicate is not something to retype from memory.
--
-- Still true after this migration:
--   * no signed URL is ever minted for an infected document (409, and the
--     storage policy would refuse anyway);
--   * document_is_deliverable() returns false for it;
--   * its status is 'quarantined' and the reason is on the audit trail;
--   * app.record_scan_result remains the only way anything reaches that state.
-- =============================================================================

create or replace function app.can_read_document(p_document uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d
     where d.id = p_document
       and d.deleted_at is null
       -- (no scan_status filter: see the header)
       and (d.uploaded_by = auth.uid()
            or (d.student_id, d.visibility) in
                 (select mv.student_id, mv.visibility from app.my_document_visibilities() mv)
            or d.id in (select app.my_shared_document_ids())
            or (d.visibility = 'organization_operational'
                and d.owner_organization_id in (select app.my_admin_org_ids()))
            or (d.student_id is null and d.family_id in (select app.my_family_ids()))));
$$;

drop policy documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (deleted_at is null
         and (uploaded_by = auth.uid()
              or (student_id, visibility) in
                   (select mv.student_id, mv.visibility from app.my_document_visibilities() mv)
              or id in (select app.my_shared_document_ids())
              or (visibility = 'organization_operational'
                  and owner_organization_id in (select app.my_admin_org_ids()))
              or (student_id is null and family_id is not null
                  and family_id in (select app.my_family_ids()))));

comment on function app.can_read_document(uuid) is
  'Who may see a document RECORD. Deliberately says nothing about scan state: '
  'whether the BYTES may be delivered is decided by the storage policy, which '
  'requires scan_status = clean. Separating the two is what lets the product '
  'tell someone their upload was refused instead of losing it silently.';

select app.assert_schema_invariants();
