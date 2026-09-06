-- STEP 2.6 / D: storage authorization against the REAL storage.objects table.
--
-- Part 1 exercises the policy predicate (app.can_upload_to_prefix) directly.
-- Part 2 exercises the policies themselves by writing and reading real rows in
-- storage.objects as impersonated users, which is the check that matters.
--
-- NOTE ON DESIGN: through STEP 3 the document buckets had NO SELECT policy at
-- all, on the theory that a route handler would mint every signed URL under
-- service_role. STEP 4 replaced that (migration 0060) because service-role
-- credentials must not sit in a normal request path. Reads are now authorised
-- by RLS, derived from the document row rather than restated:
--
--     may I read these bytes?  <=>  can I see the documents row that owns them,
--                                   and has it come back clean?
--
-- So an object with no documents row is still unreadable by anyone, and a
-- pending or infected document has no readable bytes even for its uploader.
-- Case 5 below pins all three halves of that.
--
-- NOTE ON THE PLATFORM: managed Supabase installs storage.protect_delete(),
-- which blocks every direct SQL DELETE from storage.objects - including as
-- service_role. Deletion goes through the Storage HTTP API only. Case 10 pins
-- that behaviour so it is not rediscovered the hard way in STEP 3.

-- ============================ Part 1: predicates =============================
do $$
declare
  CARLA uuid := '11111111-1111-4111-8111-000000000001';  -- Melendez family
  DIEGO uuid := '11111111-1111-4111-8111-000000000003';  -- Rivera family
  TOMAS uuid := '11111111-1111-4111-8111-000000000005';  -- teacher, no family
  FAM_A text := '22222222-2222-4222-8222-00000000000a';
  FAM_B text := '22222222-2222-4222-8222-00000000000b';
  ORG   text := '33333333-3333-4333-8333-00000000000c';
begin
  if exists (select 1 from storage.buckets where public) then
    raise exception 'a storage bucket is public: %',
      (select string_agg(id, ', ') from storage.buckets where public);
  end if;

  perform t.login(CARLA);
  perform t.assert(app.can_upload_to_prefix(FAM_A || '/lucas/file.pdf'),
    'a guardian may upload under their own family prefix');
  perform t.assert(not app.can_upload_to_prefix(FAM_B || '/sofia/file.pdf'),
    'Parent A may NOT upload into Parent B''s prefix');
  perform t.assert(not app.can_upload_to_prefix(ORG || '/whatever.pdf'),
    'a guardian may not upload into an organization prefix');
  perform t.assert(not app.can_upload_to_prefix('../etc/passwd'),
    'a non-uuid prefix is refused');
  perform t.assert(not app.can_upload_to_prefix('file.pdf'),
    'a bare filename with no scope prefix is refused');
  perform t.logout();

  perform t.login(DIEGO);
  perform t.assert(app.can_upload_to_prefix(FAM_B || '/sofia/file.pdf'), 'Parent B may use their own prefix');
  perform t.assert(not app.can_upload_to_prefix(FAM_A || '/lucas/file.pdf'),
    'Parent B may NOT upload into Parent A''s prefix');
  perform t.logout();

  perform t.login(TOMAS);
  perform t.assert(not app.can_upload_to_prefix(FAM_A || '/lucas/file.pdf'),
    'a teacher may NOT upload into an unrelated family storage path');
  perform t.assert(app.can_upload_to_prefix(ORG || '/materials.pdf'),
    'a teacher may upload under their own organization prefix');
  perform t.logout();

  raise notice 'STORAGE POLICY PREDICATES PASSED';
end $$;

-- ====================== Part 2: real storage.objects rows =====================
do $$
declare
  CARLA uuid := '11111111-1111-4111-8111-000000000001';
  DIEGO uuid := '11111111-1111-4111-8111-000000000003';
  ADELE uuid := '11111111-1111-4111-8111-000000000004';
  FAM_A text := '22222222-2222-4222-8222-00000000000a';
  FAM_B text := '22222222-2222-4222-8222-00000000000b';
  ORG   text := '33333333-3333-4333-8333-00000000000c';
  LUCAS uuid := '44444444-4444-4444-8444-00000000000d';
  DOC_P uuid := '66666666-6666-4666-8666-000000000041';
  n int;
begin
  -- 1. guardian uploads into their own family prefix -> ALLOWED
  perform t.login(CARLA);
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('uploads-quarantine', FAM_A || '/lucas/real-upload.pdf', CARLA, CARLA::text);
  perform t.logout();

  -- 2. into ANOTHER family's prefix -> DENIED
  perform t.login(CARLA);
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('uploads-quarantine', FAM_B || '/sofia/steal.pdf', CARLA, CARLA::text);
    raise exception 'ASSERTION FAILED: cross-family storage write succeeded';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- 3. forging the owner column -> DENIED
  perform t.login(CARLA);
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('uploads-quarantine', FAM_A || '/lucas/forged.pdf', DIEGO, DIEGO::text);
    raise exception 'ASSERTION FAILED: forged storage owner accepted';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- 4. traversal prefix -> DENIED
  perform t.login(CARLA);
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('uploads-quarantine', '../etc/passwd', CARLA, CARLA::text);
    raise exception 'ASSERTION FAILED: traversal prefix accepted';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- 5. readability follows the owning document row, and only when clean.
  --    5a. an object with no documents row is bytes nobody claims -> invisible
  perform t.login(CARLA);
  select count(*) into n from storage.objects where bucket_id = 'uploads-quarantine';
  perform t.assert_eq(n, 0, 'an unclaimed quarantined object is readable by nobody');
  perform t.logout();

  --    5b. claim it with a PENDING document -> still invisible, even to its uploader
  insert into public.documents (id, family_id, student_id, uploaded_by, created_by,
                                storage_bucket, storage_path, original_filename,
                                mime_type, byte_size, sha256, scan_status, status)
  values (DOC_P, FAM_A::uuid, LUCAS, CARLA, CARLA,
          'uploads-quarantine', FAM_A || '/lucas/real-upload.pdf', 'real-upload.pdf',
          'application/pdf', 4096, repeat('4', 64), 'pending', 'uploaded');
  perform t.login(CARLA);
  select count(*) into n from storage.objects where bucket_id = 'uploads-quarantine';
  perform t.assert_eq(n, 0, 'a PENDING document has no readable bytes, not even for its uploader');
  perform t.assert_eq((select count(*)::int from public.documents where id = DOC_P), 1,
    '... although its row is visible, so the upload can be shown as still processing');
  perform t.logout();

  --    5c. the scanner clears it -> the uploader can read the bytes
  perform app.record_scan_result(DOC_P, 'clean');
  perform t.login(CARLA);
  select count(*) into n from storage.objects where bucket_id = 'uploads-quarantine';
  perform t.assert_eq(n, 1, 'once clean, the uploader reads their own bytes');
  perform t.logout();

  --    5d. ... and another family still cannot, clean or not
  perform t.login(DIEGO);
  select count(*) into n from storage.objects where bucket_id = 'uploads-quarantine';
  perform t.assert_eq(n, 0, 'a clean document''s bytes stay invisible to another family');
  perform t.logout();

  --    5e. infected bytes become unreadable again
  update public.documents set scan_status = 'infected' where id = DOC_P;
  perform t.login(CARLA);
  select count(*) into n from storage.objects where bucket_id = 'uploads-quarantine';
  perform t.assert_eq(n, 0, 'an INFECTED document is never delivered, not even to its uploader');
  perform t.logout();
  update public.documents set scan_status = 'clean' where id = DOC_P;

  -- 6. the service-role scanner DOES see it (this is how files leave quarantine)
  select count(*) into n from storage.objects
   where bucket_id = 'uploads-quarantine' and name = FAM_A || '/lucas/real-upload.pdf';
  perform t.assert_eq(n, 1, 'the service-role scanner sees the quarantined object');

  -- 7. avatars are scoped to the caller's own uuid folder, and ARE readable
  perform t.login(CARLA);
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('avatars', CARLA::text || '/me.png', CARLA, CARLA::text);
  select count(*) into n from storage.objects where bucket_id = 'avatars';
  perform t.assert_eq(n, 1, 'a user reads their own avatar');
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('avatars', DIEGO::text || '/notme.png', CARLA, CARLA::text);
    raise exception 'ASSERTION FAILED: wrote into another user''s avatar folder';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  -- 8. org branding: writable by an org admin
  perform t.login(ADELE);
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('org-branding', ORG || '/logo.png', ADELE, ADELE::text);
  select count(*) into n from storage.objects where bucket_id = 'org-branding';
  perform t.assert_eq(n, 1, 'an org admin reads org branding');
  perform t.logout();

  -- 9. ... and not by a guardian, who also cannot see it
  perform t.login(CARLA);
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('org-branding', ORG || '/hacked.png', CARLA, CARLA::text);
    raise exception 'ASSERTION FAILED: a guardian wrote org branding';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();
  perform t.login(DIEGO);
  select count(*) into n from storage.objects where bucket_id = 'org-branding';
  perform t.assert_eq(n, 0, 'a non-member does not see org branding');
  perform t.logout();

  -- 10. managed Supabase blocks direct SQL DELETE on storage.objects entirely
  begin
    delete from storage.objects
     where bucket_id = 'uploads-quarantine' and name = FAM_A || '/lucas/real-upload.pdf';
    raise exception 'ASSERTION FAILED: direct storage delete was permitted';
  exception when insufficient_privilege then null;
  end;

  raise notice 'ALL REAL STORAGE.OBJECTS CASES PASSED';
end $$;

-- Which policies actually exist on storage.objects, and for which buckets.
select policyname, cmd, roles::text
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
