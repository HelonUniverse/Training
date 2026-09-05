-- STEP 2.6 / D: storage policy evaluation against the real storage.objects table.
-- Proves the policy predicates themselves; storage_api_test.sh proves the HTTP path.
do $$
declare
  CARLA uuid := '11111111-1111-4111-8111-000000000001';  -- Melendez family
  DIEGO uuid := '11111111-1111-4111-8111-000000000003';  -- Rivera family
  TOMAS uuid := '11111111-1111-4111-8111-000000000005';  -- teacher, no family
  FAM_A text := '22222222-2222-4222-8222-00000000000a';
  FAM_B text := '22222222-2222-4222-8222-00000000000b';
  ORG   text := '33333333-3333-4333-8333-00000000000c';
begin
  -- every bucket must be private
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

-- Which policies actually exist on storage.objects, and for which buckets.
select policyname, cmd, roles::text
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
