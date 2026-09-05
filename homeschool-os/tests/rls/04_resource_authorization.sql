-- =============================================================================
-- STEP 2.5: resource/action authorization
-- =============================================================================
\set CARLA '11111111-1111-4111-8111-000000000001'
\set PEDRO '11111111-1111-4111-8111-000000000002'
\set TOMAS '11111111-1111-4111-8111-000000000005'
\set NORA  '11111111-1111-4111-8111-00000000000a'
\set ROSA  '11111111-1111-4111-8111-00000000000b'
\set ADELE '11111111-1111-4111-8111-000000000004'
\set LUCAS '44444444-4444-4444-8444-00000000000d'
\set MARLA '44444444-4444-4444-8444-00000000000e'
\set FAM_A '22222222-2222-4222-8222-00000000000a'

-- === class membership is READ at the student level, academic WRITE by resource
begin;
select t.login(:'NORA');

select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'read'::app.access_level,
  'class membership resolves to student-level READ, not write');
select t.assert(not app.can_write_student(:'LUCAS'::uuid),
  'class membership does not confer blanket student write');

-- ... but the academic actions a teacher actually needs are granted
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'attendance', 'create'), 'may record attendance');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'attendance', 'update'), 'may correct attendance');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'create'),  'may add portfolio evidence');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'assignment', 'create'), 'may create assignments');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'skill', 'create'),      'may record skill observations');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'teacher_note', 'create'), 'may write notes');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'academic_record', 'update'), 'may work with lessons');

-- ... and nothing on the protected surface
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance', 'update'),
  'a class teacher has no authority over compliance');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'create'),
  'a class teacher cannot prepare an official filing');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'submit'),
  'a class teacher cannot file');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'consent', 'create'),
  'a class teacher cannot record consent');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'guardian', 'update'),
  'a class teacher cannot touch custody records');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'access_grant', 'create'),
  'a class teacher cannot share the student onward');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'approve'),
  'a class teacher cannot accept an evaluation');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'share'),
  'a class teacher cannot share documents');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'approve'),
  'a class teacher cannot alter retention or legal hold');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'organization_enrollment', 'update'),
  'a class teacher does not own the enrolment');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'export'),
  'a class teacher cannot export the record');

-- and still cannot reach the sibling
select t.assert_eq(app.student_access(:'MARLA'::uuid), 'none'::app.access_level,
  'teaching Lucas grants nothing over Marla');
select t.assert_eq((select count(*) from public.students where id = :'MARLA'::uuid), 0::bigint,
  'Marla is invisible to Lucas''s class teacher');
commit;

-- === the same, as real writes ===============================================
begin;
select t.login(:'NORA');
insert into public.attendance (student_id, organization_id, class_id, date, status, method)
values (:'LUCAS'::uuid, '33333333-3333-4333-8333-00000000000c',
        '77777777-7777-4777-8777-000000000021', current_date, 'present', 'teacher');
insert into public.portfolio_items (student_id, family_id, title)
values (:'LUCAS'::uuid, :'FAM_A'::uuid, 'Class math work');
do $$
begin
  begin
    insert into public.document_submissions (student_id, family_id, method, status)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'email', 'draft');
    raise exception 'ASSERTION FAILED: a class teacher prepared an official filing';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.student_guardians (student_id, user_id, access_level, granted_by)
    values ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-00000000000a',
            'full', '11111111-1111-4111-8111-00000000000a');
    raise exception 'ASSERTION FAILED: a class teacher made themselves a guardian';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.student_access_grants (student_id, grantee_email, kind, granted_by, expires_at)
    values ('44444444-4444-4444-8444-00000000000d', 'friend@example.test', 'review',
            '11111111-1111-4111-8111-00000000000a', now() + interval '10 days');
    raise exception 'ASSERTION FAILED: a class teacher shared the student onward';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- === view-only guardian mutates nothing =====================================
begin;
select t.login(:'PEDRO');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'read'), 'view_only reads portfolio');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'create'), 'view_only adds nothing');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'reading_log', 'create'), 'view_only adds no reading log');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'update'), 'view_only edits nothing');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'attendance', 'create'), 'view_only records no attendance');
do $$
begin
  begin
    insert into public.reading_logs (student_id, family_id, book_title, reading_type)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'X', 'independent');
    raise exception 'ASSERTION FAILED: a view_only guardian wrote a reading log';
  exception when insufficient_privilege then null;
  end;
end $$;
with u as (update public.students set preferred_name = 'Nope' where id = :'LUCAS'::uuid returning 1)
select t.assert_eq((select count(*) from u), 0::bigint, 'a view_only guardian updates no student row');
rollback;

-- === standard vs full guardian ==============================================
begin;
select t.login(:'ROSA');
-- full academic authority
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'create'),   'standard: academic write');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'assessment', 'create'),  'standard: assessments');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'update'), 'standard: profile edits');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'document', 'create'),    'standard: may upload');
-- no legal or administrative authority
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'guardian', 'create'),
  'standard: cannot add guardians');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'access_grant', 'create'),
  'standard: cannot grant access to the child');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'create'),
  'standard: cannot prepare a filing');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'sign'),
  'standard: cannot sign a filing');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'approve'),
  'standard: cannot accept an evaluation');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'consent', 'create'),
  'standard: cannot record consent');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'share'),
  'standard: cannot share documents');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'document', 'approve'),
  'standard: cannot change retention or legal hold');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'export'),
  'standard: cannot export the whole record');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'learning_plan', 'approve'),
  'standard: cannot activate a learning plan');
commit;

begin;
select t.login(:'CARLA');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'guardian', 'create'),   'full: manages guardians');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'access_grant', 'create'), 'full: grants access');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'submit'), 'full: files');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'sign'),   'full: signs');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'approve'), 'full: accepts evaluations');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'consent', 'create'),     'full: records consent');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'document', 'share'),     'full: shares documents');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'document', 'approve'),   'full: retention and hold');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'student_profile', 'export'), 'full: exports');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'learning_plan', 'approve'),  'full: approves plans');
commit;

-- === a learning plan cannot be activated without approval authority =========
begin;
insert into public.learning_plans (id, student_id, family_id, status, created_by)
values ('bbbbbbbb-1111-4111-8111-000000000061', :'LUCAS'::uuid, :'FAM_A'::uuid, 'draft', :'CARLA'::uuid);
select t.login(:'ROSA');
do $$
begin
  begin
    update public.learning_plans
       set status = 'active', approved_by = '11111111-1111-4111-8111-00000000000b', approved_at = now()
     where id = 'bbbbbbbb-1111-4111-8111-000000000061';
    raise exception 'ASSERTION FAILED: a standard guardian activated a learning plan';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- === compliance status can never be set by hand =============================
begin;
select t.login(:'ADELE');
do $$
begin
  begin
    insert into public.student_compliance_records (student_id, overall_status)
    values ('44444444-4444-4444-8444-00000000000d', 'current');
    raise exception 'ASSERTION FAILED: an org admin set a compliance status';
  exception when insufficient_privilege then null;
  end;
end $$;
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'compliance_submission', 'submit'),
  'an organization may not file on a family''s behalf');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'evaluation', 'approve'),
  'an organization may not accept an evaluation');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'guardian', 'update'),
  'an organization may not edit custody records');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'consent', 'create'),
  'an organization may not record consent for a family');
commit;

select 'resource authorization checks passed' as result;
