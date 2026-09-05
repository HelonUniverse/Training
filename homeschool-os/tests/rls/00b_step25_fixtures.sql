-- =============================================================================
-- STEP 2.5 fixtures - the cases the resource model has to get right
-- =============================================================================
--   nora   class teacher: staffs a class containing Lucas, with NO explicit
--          student assignment. The whole point of the class_staff relationship.
--   rosa   STANDARD guardian of Lucas (Carla is full, Pedro is view_only)
--   eva    evaluator, already granted on Marla; now granted on Lucas with
--          sections limited to portfolio + reading_log (NOT document)
--   four documents on Lucas at four visibilities, plus an org-operational one
--   two teacher notes on Lucas: one private to its author, one staff-visible
-- =============================================================================

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-00000000000a', 'nora@example.test'),
  ('11111111-1111-4111-8111-00000000000b', 'rosa@example.test');

insert into public.organization_members (organization_id, user_id, role, status) values
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-00000000000a', 'teacher', 'active');

-- Rosa is a STANDARD guardian: full academic authority, no legal authority.
insert into public.student_guardians (student_id, user_id, relationship, is_primary, access_level, granted_by)
values ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-00000000000b',
        'stepmother', false, 'standard', '11111111-1111-4111-8111-000000000001');

-- Nora reaches Lucas ONLY through this class.
insert into public.classes (id, organization_id, name, type, created_by) values
  ('77777777-7777-4777-8777-000000000021', '33333333-3333-4333-8333-00000000000c',
   'Math Pod', 'pod', '11111111-1111-4111-8111-000000000004');
insert into public.class_students (class_id, student_id, created_by) values
  ('77777777-7777-4777-8777-000000000021', '44444444-4444-4444-8444-00000000000d',
   '11111111-1111-4111-8111-000000000004');
insert into public.class_staff (class_id, user_id, role, created_by) values
  ('77777777-7777-4777-8777-000000000021', '11111111-1111-4111-8111-00000000000a', 'lead',
   '11111111-1111-4111-8111-000000000004');

-- Eva's grant on Lucas opens portfolio and reading_log ONLY.
insert into public.student_access_grants
  (id, student_id, grantee_user_id, kind, sections, access_level, status, granted_by, granted_at, expires_at)
values ('88888888-8888-4888-8888-000000000031',
        '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000007',
        'evaluation', array['portfolio','reading_log']::app.resource_type[], 'read',
        'active', '11111111-1111-4111-8111-000000000001', now(), now() + interval '30 days');

-- Documents on Lucas at each visibility.
insert into public.documents (id, family_id, student_id, uploaded_by, storage_path, original_filename,
                              mime_type, byte_size, sha256, scan_status, status, visibility, category) values
  ('99999999-9999-4999-8999-000000000041', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   'fam/lucas/private.pdf', 'medical-note.pdf', 'application/pdf', 1000, repeat('b', 64),
   'clean', 'filed', 'family_private', 'other'),
  ('99999999-9999-4999-8999-000000000042', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   'fam/lucas/worksheet.pdf', 'worksheet.pdf', 'application/pdf', 1000, repeat('c', 64),
   'clean', 'filed', 'academic_shared', 'worksheet'),
  ('99999999-9999-4999-8999-000000000043', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   'fam/lucas/eval-packet.pdf', 'eval-packet.pdf', 'application/pdf', 1000, repeat('d', 64),
   'clean', 'filed', 'evaluator_shared', 'evaluation'),
  ('99999999-9999-4999-8999-000000000044', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   'fam/lucas/family.pdf', 'family-photo.pdf', 'application/pdf', 1000, repeat('e', 64),
   'clean', 'filed', 'family_shared', 'other');

insert into public.documents (id, organization_id, owner_organization_id, uploaded_by, storage_path,
                              original_filename, mime_type, byte_size, sha256, scan_status, status,
                              visibility, record_class, category) values
  ('99999999-9999-4999-8999-000000000045', '33333333-3333-4333-8333-00000000000c',
   '33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000004',
   'org/contract.pdf', 'contract.pdf', 'application/pdf', 1000, repeat('f', 64),
   'clean', 'filed', 'organization_operational', 'organization_operational', 'contract');

-- Two notes by Tomas: one nobody else may ever read, one staff-visible.
insert into public.teacher_notes (id, student_id, organization_id, author_user_id, body, visibility) values
  ('aaaaaaaa-1111-4111-8111-000000000051', '44444444-4444-4444-8444-00000000000d',
   '33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000005',
   'Private working note about Lucas.', 'private_to_author'),
  ('aaaaaaaa-1111-4111-8111-000000000052', '44444444-4444-4444-8444-00000000000d',
   '33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000005',
   'Staff-visible observation.', 'staff');

insert into public.reading_logs (student_id, family_id, book_title, reading_type, created_by) values
  ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
   'The Hobbit', 'independent', '11111111-1111-4111-8111-000000000001');
