-- =============================================================================
-- STEP 2.5: evaluator grant scoping and document visibility
-- =============================================================================
\set CARLA '11111111-1111-4111-8111-000000000001'
\set PEDRO '11111111-1111-4111-8111-000000000002'
\set TOMAS '11111111-1111-4111-8111-000000000005'
\set EVA   '11111111-1111-4111-8111-000000000007'
\set NORA  '11111111-1111-4111-8111-00000000000a'
\set ROSA  '11111111-1111-4111-8111-00000000000b'
\set ADELE '11111111-1111-4111-8111-000000000004'
\set LUCAS '44444444-4444-4444-8444-00000000000d'
\set MARLA '44444444-4444-4444-8444-00000000000e'
\set DOC_PRIVATE   '99999999-9999-4999-8999-000000000041'
\set DOC_ACADEMIC  '99999999-9999-4999-8999-000000000042'
\set DOC_EVALUATOR '99999999-9999-4999-8999-000000000043'
\set DOC_FAMILY    '99999999-9999-4999-8999-000000000044'
\set DOC_ORG       '99999999-9999-4999-8999-000000000045'
\set NOTE_PRIVATE  'aaaaaaaa-1111-4111-8111-000000000051'
\set NOTE_STAFF    'aaaaaaaa-1111-4111-8111-000000000052'

-- === an evaluator grant is a section list, not student authority ============
-- Eva's grant on Lucas opens portfolio + reading_log only.
begin;
select t.login(:'EVA');

select t.assert(app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'read'),
  'the granted section is readable');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'reading_log', 'read'),
  'the second granted section is readable');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'read'),
  'the student''s name is readable - the report needs it');

select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'read'),
  'a section NOT in the grant stays closed');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'assessment', 'read'),
  'assessments were not granted for this student');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'teacher_note', 'read'),
  'teacher notes are not grantable to an evaluator at all');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'consent', 'read'),
  'consents are never in an evaluator''s reach');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'guardian', 'read'),
  'guardian records are never in an evaluator''s reach');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'create'),
  'an evaluator has no filing authority');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'incident', 'read'),
  'organization incident records are out of scope');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'create'),
  'a read grant confers no write');

-- the grant on Marla DOES include documents, so scoping is per grant
select t.assert(app.can_student_action(:'MARLA'::uuid, 'document', 'read'),
  'the other grant includes documents');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'read'),
  'and that does not leak across to Lucas');

-- as real queries
select t.assert((select count(*) from public.reading_logs where student_id = :'LUCAS'::uuid) >= 1,
  'the evaluator reads the granted reading log');
select t.assert_eq((select count(*) from public.documents where student_id = :'LUCAS'::uuid), 0::bigint,
  'the evaluator reads NONE of Lucas''s documents');
select t.assert_eq((select count(*) from public.teacher_notes where student_id = :'LUCAS'::uuid), 0::bigint,
  'the evaluator reads none of the teacher notes');
select t.assert_eq((select count(*) from public.consents), 0::bigint,
  'the evaluator reads no consents');
select t.assert_eq((select count(*) from public.incident_reports), 0::bigint,
  'the evaluator reads no incident records');
commit;

-- === an evaluator completes their own report but never accepts or files it ==
begin;
select t.login(:'EVA');
insert into public.evaluations (id, student_id, family_id, evaluator_user_id, status, method)
values ('cccccccc-1111-4111-8111-000000000071', :'LUCAS'::uuid,
        '22222222-2222-4222-8222-00000000000a', :'EVA'::uuid, 'accepted', 'portfolio_review');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'create'),
  'an evaluator may create their evaluation');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'sign'),
  'an evaluator may sign their own report');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'approve'),
  'an evaluator may NOT accept it on the parent''s behalf');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'submit'),
  'an evaluator may NOT submit it on the parent''s behalf');
do $$
begin
  begin
    update public.evaluations
       set status = 'accepted_by_parent',
           parent_reviewed_by = '11111111-1111-4111-8111-000000000007',
           parent_reviewed_at = now()
     where id = 'cccccccc-1111-4111-8111-000000000071';
    raise exception 'ASSERTION FAILED: an evaluator accepted their own evaluation';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.document_submissions (student_id, family_id, method, status)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'email', 'draft');
    raise exception 'ASSERTION FAILED: an evaluator filed on the family''s behalf';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- === revocation and expiry are immediate ====================================
begin;
update public.student_access_grants set status = 'revoked', revoked_at = now()
 where id = '88888888-8888-4888-8888-000000000031';
select t.login(:'EVA');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'none'::app.access_level,
  'a revoked grant loses access immediately');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'read'),
  'and the resource check agrees');
select t.assert_eq((select count(*) from public.reading_logs where student_id = :'LUCAS'::uuid), 0::bigint,
  'and the rows disappear');
rollback;

begin;
-- sag_expiry_ck refuses backdating an expiry below granted_at (early termination
-- is a revocation, not an edit), so age the whole grant instead.
update public.student_access_grants
   set granted_at = now() - interval '10 days', expires_at = now() - interval '1 second'
 where id = '88888888-8888-4888-8888-000000000031';
select t.login(:'EVA');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'none'::app.access_level,
  'an expired grant loses access immediately');
rollback;

-- === document visibility ====================================================
-- a full guardian sees everything belonging to the family
begin;
select t.login(:'CARLA');
select t.assert(app.can_read_document(:'DOC_PRIVATE'::uuid),   'full guardian: family_private');
select t.assert(app.can_read_document(:'DOC_FAMILY'::uuid),    'full guardian: family_shared');
select t.assert(app.can_read_document(:'DOC_ACADEMIC'::uuid),  'full guardian: academic_shared');
select t.assert(app.can_read_document(:'DOC_EVALUATOR'::uuid), 'full guardian: evaluator_shared');
select t.assert(not app.can_read_document(:'DOC_ORG'::uuid),   'full guardian: NOT organization operational');
commit;

-- a standard guardian does not see the sensitive private upload
begin;
select t.login(:'ROSA');
select t.assert(not app.can_read_document(:'DOC_PRIVATE'::uuid),
  'standard guardian: family_private stays private to the uploader and full guardians');
select t.assert(app.can_read_document(:'DOC_FAMILY'::uuid),   'standard guardian: family_shared');
select t.assert(app.can_read_document(:'DOC_ACADEMIC'::uuid), 'standard guardian: academic_shared');
commit;

-- a view-only guardian likewise
begin;
select t.login(:'PEDRO');
select t.assert(not app.can_read_document(:'DOC_PRIVATE'::uuid), 'view_only: no family_private');
select t.assert(app.can_read_document(:'DOC_FAMILY'::uuid),      'view_only: family_shared');
commit;

-- reaching a student does NOT mean reading every document of that student
begin;
select t.login(:'NORA');
select t.assert(app.can_read_document(:'DOC_ACADEMIC'::uuid),
  'a class teacher reads academic_shared work');
select t.assert(not app.can_read_document(:'DOC_PRIVATE'::uuid),
  'a class teacher CANNOT read a family-private document');
select t.assert(not app.can_read_document(:'DOC_FAMILY'::uuid),
  'a class teacher cannot read family-shared documents either');
select t.assert(not app.can_read_document(:'DOC_EVALUATOR'::uuid),
  'a class teacher cannot read the evaluator packet');
select t.assert(not app.can_read_document(:'DOC_ORG'::uuid),
  'a teacher is not an organization document reader by default');
select t.assert_eq((select count(*) from public.documents where student_id = :'LUCAS'::uuid), 1::bigint,
  'exactly one of Lucas''s four documents is visible to the class teacher');
commit;

-- an assigned teacher additionally sees assigned_staff documents
begin;
select t.login(:'TOMAS');
select t.assert(app.can_read_document(:'DOC_ACADEMIC'::uuid), 'assigned staff: academic_shared');
select t.assert(not app.can_read_document(:'DOC_PRIVATE'::uuid), 'assigned staff: no family_private');
commit;
-- re-label one document as assigned_staff (as the owner, outside a user session)
update public.documents set visibility = 'assigned_staff' where id = :'DOC_FAMILY'::uuid;
begin;
select t.login(:'TOMAS');
select t.assert(app.can_read_document(:'DOC_FAMILY'::uuid), 'assigned staff: assigned_staff documents');
commit;
begin;
select t.login(:'NORA');
select t.assert(not app.can_read_document(:'DOC_FAMILY'::uuid),
  'class staff are NOT assigned staff');
commit;
-- restore
update public.documents set visibility = 'family_shared' where id = '99999999-9999-4999-8999-000000000044';

-- an evaluator sees only the evaluator packet, and only with a document section
begin;
update public.student_access_grants
   set sections = array['portfolio','reading_log','document']::app.resource_type[]
 where id = '88888888-8888-4888-8888-000000000031';
select t.login(:'EVA');
select t.assert(app.can_read_document(:'DOC_EVALUATOR'::uuid),
  'with a document section, the evaluator packet is readable');
select t.assert(not app.can_read_document(:'DOC_PRIVATE'::uuid),
  'but never the family-private document');
select t.assert(not app.can_read_document(:'DOC_ACADEMIC'::uuid),
  'and not arbitrary academic documents');
rollback;

-- === explicit sharing is the escape hatch, and it is audited ================
begin;
select t.login(:'CARLA');
insert into public.document_shares (document_id, student_id, shared_with_user_id, shared_by, reason)
values (:'DOC_PRIVATE'::uuid, :'LUCAS'::uuid, :'NORA'::uuid, :'CARLA'::uuid, 'Discussed at conference');
reset role;
select t.login(:'NORA');
select t.assert(app.can_read_document(:'DOC_PRIVATE'::uuid),
  'an explicit share opens exactly one document to exactly one person');
reset role;
select t.assert_eq(
  (select count(*) from public.audit_logs
    where action = 'document_shared' and subject_id = :'DOC_PRIVATE'::uuid), 1::bigint,
  'sharing wrote an audit event');
rollback;

-- a class teacher cannot share a document they can read
begin;
select t.login(:'NORA');
do $$
begin
  begin
    insert into public.document_shares (document_id, student_id, shared_with_user_id, shared_by)
    values ('99999999-9999-4999-8999-000000000042', '44444444-4444-4444-8444-00000000000d',
            '11111111-1111-4111-8111-000000000007', '11111111-1111-4111-8111-00000000000a');
    raise exception 'ASSERTION FAILED: a class teacher shared a document onward';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- === teacher-private notes ==================================================
begin;
select t.login(:'TOMAS');
select t.assert_eq((select count(*) from public.teacher_notes where id = :'NOTE_PRIVATE'::uuid), 1::bigint,
  'the author reads their own private note');
commit;
begin;
select t.login(:'NORA');
select t.assert_eq((select count(*) from public.teacher_notes where id = :'NOTE_PRIVATE'::uuid), 0::bigint,
  'another teacher cannot read a private_to_author note');
select t.assert_eq((select count(*) from public.teacher_notes where id = :'NOTE_STAFF'::uuid), 1::bigint,
  'staff-visible notes are visible to staff');
commit;
begin;
select t.login(:'CARLA');
select t.assert_eq((select count(*) from public.teacher_notes where id = :'NOTE_PRIVATE'::uuid), 0::bigint,
  'a full guardian cannot read a teacher''s private note');
select t.assert_eq((select count(*) from public.teacher_notes where id = :'NOTE_STAFF'::uuid), 0::bigint,
  'a staff-visibility note is not a family-visible note');
commit;

select 'evaluator scope and document visibility checks passed' as result;
