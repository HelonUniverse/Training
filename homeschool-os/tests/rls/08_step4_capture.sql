-- =============================================================================
-- STEP 4 - capture, storage delivery, sharing and invitations
-- =============================================================================
-- Everything here runs through the real policies as a real user. The claims
-- being tested are the ones a family would care about if they were wrong:
-- nobody can declare their own upload safe, an infected file is never handed
-- out, a duplicate check cannot be turned into a cross-tenant oracle, and an
-- invitation link is worthless to whoever else finds it.
-- =============================================================================

do $$
declare
  CARLA uuid := '11111111-1111-4111-8111-000000000001';  -- guardian, full access
  PEDRO uuid := '11111111-1111-4111-8111-000000000002';  -- guardian, view_only
  DIEGO uuid := '11111111-1111-4111-8111-000000000003';  -- other family
  ADELE uuid := '11111111-1111-4111-8111-000000000004';  -- org admin
  TOMAS uuid := '11111111-1111-4111-8111-000000000005';  -- teacher (Lucas only)
  STRANGER uuid := '11111111-1111-4111-8111-000000000008';
  FAM_A uuid := '22222222-2222-4222-8222-00000000000a';
  FAM_B uuid := '22222222-2222-4222-8222-00000000000b';
  LUCAS uuid := '44444444-4444-4444-8444-00000000000d';
  SOFIA uuid := '44444444-4444-4444-8444-00000000000f';
  ORG   uuid := '33333333-3333-4333-8333-00000000000c';
  HASH_1 text := repeat('1', 64);
  HASH_2 text := repeat('2', 64);
  r       jsonb;
  doc1    uuid;
  doc2    uuid;
  item    uuid;
  n       int;
  txt     text;
begin
  -- ------------------------------------------------------------------ 1
  -- A capture records a document that is PENDING, not clean. scan_status is
  -- not a parameter, so there is no value the client could have sent instead.
  perform t.login(CARLA);
  r := public.register_document(
         'uploads-quarantine', FAM_A || '/lucas/2026/photo.jpg', 'photo.jpg',
         'image/jpeg', 204800, HASH_1, FAM_A, LUCAS, 'Volcano write-up');
  doc1 := (r->>'id')::uuid;
  perform t.assert(doc1 is not null, '1a. the capture was recorded');
  perform t.assert_eq((r->>'duplicate')::boolean, false, '1b. it is not a duplicate');
  perform t.assert_eq(
    (select scan_status::text from public.documents where id = doc1), 'pending',
    '1c. a freshly captured document is PENDING, never clean');
  perform t.assert_eq(
    (select visibility::text from public.documents where id = doc1), 'family_private',
    '1d. nothing is shared outside the family by default');
  perform t.assert_eq((select count(*)::int from public.document_versions where document_id = doc1), 1,
    '1e. the original version is recorded alongside it');

  -- ------------------------------------------------------------------ 2
  -- The uploader cannot mark their own file clean. This is THE property that
  -- makes "scanned" mean anything.
  begin
    perform public.record_scan_result(doc1, 'clean');
    raise exception 'ASSERTION FAILED: 2. a user marked their own upload clean';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.documents set scan_status = 'clean' where id = doc1;
    perform t.assert_eq((select scan_status::text from public.documents where id = doc1),
      'pending', '2b. a direct UPDATE of scan_status changed nothing the user can see');
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 3
  -- Pending bytes are undeliverable, even to the person who uploaded them.
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('uploads-quarantine', FAM_A || '/lucas/2026/photo.jpg', CARLA, CARLA::text);

  perform t.login(CARLA);
  select count(*) into n from storage.objects
   where name = FAM_A || '/lucas/2026/photo.jpg';
  perform t.assert_eq(n, 0, '3. a PENDING document has no readable bytes, not even for its uploader');
  perform t.logout();

  -- ------------------------------------------------------------------ 4
  -- The worker clears it. Only then are the bytes delivered.
  perform app.record_scan_result(doc1, 'clean', 'test harness');
  perform t.login(CARLA);
  select count(*) into n from storage.objects where name = FAM_A || '/lucas/2026/photo.jpg';
  perform t.assert_eq(n, 1, '4a. a clean document delivers its bytes to the family');
  perform t.assert(public.document_is_deliverable(doc1), '4b. and reports itself deliverable');
  perform t.logout();

  perform t.login(DIEGO);
  select count(*) into n from storage.objects where name = FAM_A || '/lucas/2026/photo.jpg';
  perform t.assert_eq(n, 0, '4c. another family still sees nothing');
  perform t.logout();

  -- ------------------------------------------------------------------ 5
  -- An infected file is never delivered to anyone, ever.
  perform app.record_scan_result(doc1, 'infected', 'EICAR test signature');
  perform t.login(CARLA);
  select count(*) into n from storage.objects where name = FAM_A || '/lucas/2026/photo.jpg';
  perform t.assert_eq(n, 0, '5a. an INFECTED document delivers nothing to its own uploader');
  perform t.assert(not public.document_is_deliverable(doc1), '5b. and says so');
  -- The RECORD stays visible on purpose (0064). Hiding it too made a refused
  -- upload look as though the product had simply lost the file, so a parent
  -- could be notified about something they could not then open or understand.
  select count(*) into n from public.documents where id = doc1;
  perform t.assert_eq(n, 1, '5c. the record stays readable, so the refusal can be explained');
  perform t.assert_eq(
    (select status::text from public.documents where id = doc1), 'quarantined',
    '5d. ... and says plainly that it is quarantined');
  perform t.logout();
  perform app.record_scan_result(doc1, 'clean', 'restored for later cases');

  -- ------------------------------------------------------------------ 6
  -- The duplicate check is not a cross-tenant oracle. Family B holds HASH_1;
  -- Family A must be unable to observe that in any way.
  perform t.login(DIEGO);
  r := public.register_document(
         'uploads-quarantine', FAM_B || '/sofia/2026/same.jpg', 'same.jpg',
         'image/jpeg', 204800, HASH_1, FAM_B, SOFIA, 'Same bytes, other household');
  doc2 := (r->>'id')::uuid;
  perform t.assert(doc2 is not null and doc2 <> doc1,
    '6a. the identical file saves normally for an unrelated family');
  perform t.assert_eq((r->>'duplicate')::boolean, false,
    '6b. and is NOT reported as a duplicate of the other family''s copy');
  perform t.logout();

  perform t.login(STRANGER);
  select count(*) into n from public.find_duplicate_document(HASH_1);
  perform t.assert_eq(n, 0, '6c. someone unrelated to either family matches nothing');
  perform t.logout();

  -- ------------------------------------------------------------------ 7
  -- Within one family it IS reported, and reports the row they already have.
  perform t.login(CARLA);
  select count(*) into n from public.find_duplicate_document(HASH_1);
  perform t.assert_eq(n, 1, '7a. the family that owns these bytes is told they already have them');
  r := public.register_document(
         'uploads-quarantine', FAM_A || '/lucas/2026/again.jpg', 'again.jpg',
         'image/jpeg', 204800, HASH_1, FAM_A, LUCAS, 'Saved twice by mistake');
  perform t.assert_eq((r->>'duplicate')::boolean, true,
    '7b. re-saving the same bytes is reported, not raised as a constraint error');
  perform t.assert_eq((r->>'id')::uuid, doc1, '7c. and points at the copy they already had');
  perform t.logout();

  -- ------------------------------------------------------------------ 8
  -- Capturing against a child you do not have is refused.
  perform t.login(CARLA);
  begin
    perform public.create_portfolio_item(SOFIA, 'Not my child');
    raise exception 'ASSERTION FAILED: 8. wrote a portfolio item for another family''s child';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 9
  -- A view-only guardian may look but not capture.
  perform t.login(PEDRO);
  perform t.assert(not app.can_student_action(LUCAS, 'portfolio', 'create'),
    '9a. a view-only guardian holds no create capability');
  begin
    perform public.create_portfolio_item(LUCAS, 'Added by a view-only guardian');
    raise exception 'ASSERTION FAILED: 9b. a view-only guardian created a portfolio item';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 10
  -- An afternoon photographed six times is ONE entry, not six.
  perform t.login(CARLA);
  select count(*) into n from public.portfolio_items where student_id = LUCAS;
  perform public.log_activity(
    LUCAS, 'Everglades field trip', 'field_trip', current_date, 180, null,
    'We saw a manatee.', array[doc1]);
  perform t.assert_eq(
    (select count(*)::int from public.portfolio_items where student_id = LUCAS), n + 1,
    '10a. an activity with several photos produces exactly one portfolio item');
  perform t.assert_eq(
    (select count(*)::int from public.activity_logs
      where student_id = LUCAS and portfolio_item_id is not null), 1,
    '10b. and the activity points at it');
  perform t.logout();

  -- ------------------------------------------------------------------ 11
  -- Attaching more evidence to someone else's entry is refused.
  perform t.login(CARLA);
  item := public.create_portfolio_item(LUCAS, 'Fractions practice');
  perform t.logout();
  perform t.login(DIEGO);
  begin
    perform public.attach_documents(item, array[doc2]);
    raise exception 'ASSERTION FAILED: 11. attached evidence to another family''s entry';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 12
  -- Sharing requires the share capability, and is audited.
  perform t.login(PEDRO);
  begin
    perform public.share_document(doc1, TOMAS);
    raise exception 'ASSERTION FAILED: 12a. a view-only guardian shared a document';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  perform t.login(CARLA);
  perform t.assert(public.share_document(doc1, TOMAS) is not null,
    '12b. a full guardian may share with the teacher');
  perform t.assert_eq(
    (select count(*)::int from public.audit_logs
      where action = 'document_shared' and subject_id = doc1), 1,
    '12c. and the share is on the audit trail');
  perform t.logout();

  -- ------------------------------------------------------------------ 13
  -- A share names exactly one recipient - never "everyone".
  perform t.login(CARLA);
  begin
    perform public.share_document(doc1);
    raise exception 'ASSERTION FAILED: 13a. shared a document with nobody named';
  exception when check_violation then null;
  end;
  begin
    perform public.share_document(doc1, TOMAS, ORG);
    raise exception 'ASSERTION FAILED: 13b. shared with two recipients at once';
  exception when check_violation then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 14
  -- Viewing is recorded, so "who has seen this" is answerable.
  perform t.login(CARLA);
  perform public.record_document_view(doc1);
  perform t.assert_eq(
    (select count(*)::int from public.audit_logs
      where action = 'document_viewed' and subject_id = doc1), 1,
    '14. a view is on the audit trail');
  perform t.logout();

  raise notice 'STEP 4 CAPTURE / STORAGE / SHARING CASES PASSED';
end $$;

-- =============================================================================
-- Invitations and the email outbox
-- =============================================================================
do $$
declare
  ADELE uuid := '11111111-1111-4111-8111-000000000004';
  CARLA uuid := '11111111-1111-4111-8111-000000000001';
  TOMAS uuid := '11111111-1111-4111-8111-000000000005';
  ORG   uuid := '33333333-3333-4333-8333-00000000000c';
  INV   uuid := '77777777-7777-4777-8777-000000000031';
  INV2  uuid := '77777777-7777-4777-8777-000000000032';
  TOKEN text := 'a-real-looking-invitation-token-value';
  BOGUS text := 'not-a-token-at-all';
  delivery uuid;
  n int;
begin
  -- An org admin issues an invitation for the teacher's own address.
  perform t.login(ADELE);
  insert into public.invitations (id, organization_id, email, invite_kind, role, token_hash,
                                  expires_at, created_by)
  values (INV, ORG, 'tomas@example.test', 'org_member', 'teacher',
          encode(extensions.digest(TOKEN, 'sha256'), 'hex'), now() + interval '14 days', ADELE);

  delivery := public.queue_invitation_email(INV);
  perform t.assert(delivery is not null, '15a. the outbox row was written');

  -- ------------------------------------------------------------------ 15
  -- The outbox must never hold a live token. A backup of this table is not a
  -- set of usable invitation links.
  select count(*) into n from public.email_deliveries
   where id = delivery and payload::text like '%' || TOKEN || '%';
  perform t.assert_eq(n, 0, '15b. the outbox row contains no token');
  perform t.logout();

  -- ------------------------------------------------------------------ 16
  -- Someone outside the organization cannot read its outbox.
  perform t.login(CARLA);
  select count(*) into n from public.email_deliveries;
  perform t.assert_eq(n, 0, '16. a parent cannot read another organization''s email outbox');
  perform t.logout();

  -- ------------------------------------------------------------------ 17
  -- A wrong token is indistinguishable from every other failure: no rows.
  perform t.login(TOMAS);
  select count(*) into n from public.preview_invitation(BOGUS);
  perform t.assert_eq(n, 0, '17a. a bogus token previews nothing at all');
  begin
    perform public.accept_invitation(BOGUS);
    raise exception 'ASSERTION FAILED: 17b. a bogus token was accepted';
  exception when insufficient_privilege then null;
  end;

  -- ------------------------------------------------------------------ 18
  -- The right person accepts, and gets exactly the role on the invitation.
  select count(*) into n from public.preview_invitation(TOKEN);
  perform t.assert_eq(n, 1, '18a. the invited person can preview it');
  perform public.accept_invitation(TOKEN);
  perform t.assert_eq(
    (select role::text from public.organization_members
      where organization_id = ORG and user_id = TOMAS), 'teacher',
    '18b. the role granted is the one on the invitation, not one the client chose');

  -- ------------------------------------------------------------------ 19
  -- The link is single-use.
  begin
    perform public.accept_invitation(TOKEN);
    raise exception 'ASSERTION FAILED: 19. an invitation was redeemed twice';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- ------------------------------------------------------------------ 20
  -- A leaked link is worthless to whoever finds it: the signed-in account's
  -- own email must be the invited one.
  perform t.login(ADELE);
  insert into public.invitations (id, organization_id, email, invite_kind, role, token_hash,
                                  expires_at, created_by)
  values (INV2, ORG, 'someone.else@example.test', 'org_member', 'org_admin',
          encode(extensions.digest('second-token', 'sha256'), 'hex'),
          now() + interval '14 days', ADELE);
  perform t.logout();

  perform t.login(CARLA);
  begin
    perform public.accept_invitation('second-token');
    raise exception 'ASSERTION FAILED: 20a. a forwarded invitation was redeemed by the wrong person';
  exception when insufficient_privilege then null;
  end;
  perform t.assert_eq(
    (select count(*)::int from public.organization_members
      where organization_id = ORG and user_id = CARLA), 0,
    '20b. and no membership was created');
  perform t.logout();

  -- An expired invitation behaves exactly like a wrong one.
  update public.invitations set expires_at = now() - interval '1 day' where id = INV2;
  perform t.login(ADELE);
  select count(*) into n from public.preview_invitation('second-token');
  perform t.assert_eq(n, 0, '20c. an expired invitation previews nothing');
  perform t.logout();

  raise notice 'STEP 4 INVITATION CASES PASSED';
end $$;
