-- STEP 2.6 / C: the representative STEP 2.5 authorization cases, on real Supabase.
-- One transaction; every check raises on failure.
do $$
declare
  CARLA    uuid := '11111111-1111-4111-8111-000000000001'; -- guardian full
  PEDRO    uuid := '11111111-1111-4111-8111-000000000002'; -- guardian view_only
  ROSA     uuid := '11111111-1111-4111-8111-00000000000b'; -- guardian standard
  ADELE    uuid := '11111111-1111-4111-8111-000000000004'; -- org admin
  TOMAS    uuid := '11111111-1111-4111-8111-000000000005'; -- assigned teacher
  NORA     uuid := '11111111-1111-4111-8111-00000000000a'; -- class teacher
  EVA      uuid := '11111111-1111-4111-8111-000000000007'; -- evaluator
  STRANGER uuid := '11111111-1111-4111-8111-000000000008';
  LUCASU   uuid := '11111111-1111-4111-8111-000000000009'; -- student
  LUCAS    uuid := '44444444-4444-4444-8444-00000000000d';
  MARLA    uuid := '44444444-4444-4444-8444-00000000000e';
  SOFIA    uuid := '44444444-4444-4444-8444-00000000000f';
  DOC_PRIV uuid := '99999999-9999-4999-8999-000000000041';
  DOC_ACAD uuid := '99999999-9999-4999-8999-000000000042';
  DOC_INF  uuid := '99999999-9999-4999-8999-000000000046';
  n bigint;
begin
  ---------------------------------------------------------------- guardian full
  perform t.login(CARLA);
  perform t.assert_eq((select count(*) from public.students), 2::bigint, 'full guardian sees 2 students');
  perform t.assert_eq(app.student_access(LUCAS), 'admin'::app.access_level, 'full guardian is admin');
  perform t.assert(app.can_read_document(DOC_PRIV), 'full guardian reads family_private');
  -- STEP 4 (migration 0064) separated the two questions. The RECORD of an
  -- infected document stays readable by the people who could already read it,
  -- so the product can explain that the file was refused instead of appearing
  -- to have lost it. The BYTES are gated by the storage policy, which requires
  -- scan_status = 'clean' - see case 5e in 04_storage_policies.sql.
  perform t.assert(app.can_read_document(DOC_INF),
    'the record of an infected document is still readable, so it can be explained');
  perform t.assert(not public.document_is_deliverable(DOC_INF),
    '... but it is never deliverable');
  perform t.assert(app.can_student_action(LUCAS,'compliance_submission','submit'), 'full guardian may file');
  perform t.assert(app.can_export_student(LUCAS), 'full guardian may export');
  perform t.logout();

  ------------------------------------------------------------ guardian standard
  perform t.login(ROSA);
  perform t.assert(app.can_student_action(LUCAS,'portfolio','create'), 'standard: academic write');
  perform t.assert(not app.can_student_action(LUCAS,'compliance_submission','submit'), 'standard: no filing');
  perform t.assert(not app.can_student_action(LUCAS,'access_grant','create'), 'standard: no sharing the child');
  perform t.assert(not app.can_read_document(DOC_PRIV), 'standard: no family_private');
  perform t.assert(not app.can_export_student(LUCAS), 'standard: no export');
  perform t.logout();

  ----------------------------------------------------------- guardian view only
  perform t.login(PEDRO);
  perform t.assert_eq(app.student_access(LUCAS), 'read'::app.access_level, 'view_only is read');
  perform t.assert(not app.can_student_action(LUCAS,'portfolio','create'), 'view_only mutates nothing');
  perform t.assert(not app.can_read_document(DOC_PRIV), 'view_only: no family_private');
  begin
    insert into public.reading_logs (student_id, family_id, book_title, reading_type)
    values (LUCAS, '22222222-2222-4222-8222-00000000000a', 'X', 'independent');
    raise exception 'ASSERTION FAILED: view_only guardian wrote a reading log';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  ------------------------------------------------------------- assigned teacher
  perform t.login(TOMAS);
  perform t.assert_eq((select count(*) from public.students), 1::bigint, 'teacher sees only the assigned student');
  perform t.assert_eq(app.student_access(MARLA), 'none'::app.access_level, 'teacher cannot reach the sibling');
  perform t.assert(app.can_student_action(LUCAS,'attendance','create'), 'teacher may record attendance');
  perform t.assert(not app.can_student_action(LUCAS,'compliance','update'), 'teacher cannot change compliance');
  perform t.assert(not app.can_read_document(DOC_PRIV), 'teacher cannot read family_private');
  perform t.assert(app.can_read_document(DOC_ACAD), 'teacher reads academic_shared');
  insert into public.attendance (student_id, organization_id, date, status, method)
  values (LUCAS, '33333333-3333-4333-8333-00000000000c', current_date, 'present', 'teacher');
  begin
    insert into public.student_compliance_records (student_id, overall_status) values (LUCAS, 'current');
    raise exception 'ASSERTION FAILED: teacher set a compliance status';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  ---------------------------------------------------------------- class teacher
  perform t.login(NORA);
  perform t.assert_eq(app.student_access(LUCAS), 'read'::app.access_level, 'class membership is READ');
  perform t.assert(app.can_student_action(LUCAS,'portfolio','create'), 'class teacher adds evidence');
  perform t.assert(not app.can_student_action(LUCAS,'guardian','update'), 'class teacher: no custody records');
  perform t.assert(not app.can_student_action(LUCAS,'consent','create'), 'class teacher: no consent');
  perform t.assert(not app.can_read_document(DOC_PRIV), 'class teacher: no family_private');
  perform t.logout();

  -------------------------------------------------------------------- evaluator
  perform t.login(EVA);
  perform t.assert_eq((select count(*) from public.students), 1::bigint, 'evaluator sees only the live grant');
  perform t.assert_eq(app.student_access(SOFIA), 'none'::app.access_level, 'expired grant is gone immediately');
  perform t.assert(app.can_student_action(MARLA,'portfolio','read'), 'granted section readable');
  perform t.assert(not app.can_student_action(MARLA,'document','read'), 'ungranted section closed');
  perform t.assert(not app.can_student_action(MARLA,'evaluation','approve'), 'evaluator cannot accept');
  perform t.assert_eq((select count(*) from public.teacher_notes), 0::bigint, 'evaluator reads no notes');
  perform t.logout();

  -------------------------------------------------------------------- org admin
  perform t.login(ADELE);
  perform t.assert_eq((select count(*) from public.students), 1::bigint, 'org admin sees the enrolled student');
  perform t.assert(not app.can_student_action(LUCAS,'compliance_submission','submit'), 'org cannot file for a family');
  perform t.assert(not app.can_student_action(LUCAS,'evaluation','approve'), 'org cannot accept an evaluation');
  perform t.logout();

  ---------------------------------------------------------------------- student
  perform t.login(LUCASU);
  perform t.assert_eq((select count(*) from public.students), 1::bigint, 'student sees only themself');
  perform t.assert_eq(app.student_access(LUCAS), 'read'::app.access_level, 'student has read on self');
  perform t.logout();

  --------------------------------------------------------------------- stranger
  perform t.login(STRANGER);
  perform t.assert_eq((select count(*) from public.students), 0::bigint, 'stranger enumerates no students');
  perform t.assert_eq((select count(*) from public.documents), 0::bigint, 'stranger sees no documents');
  perform t.assert_eq((select count(*) from public.audit_logs), 0::bigint, 'stranger sees no audit');
  perform t.assert_eq((select count(*) from public.ai_usage_events), 0::bigint, 'stranger sees no telemetry');
  perform t.assert_eq((select count(*) from app.my_student_ids_for('portfolio','read')), 0::bigint,
    'the set resolver is empty for a stranger');
  begin
    perform app.permission_override('student', LUCAS, 'student.access');
    raise exception 'ASSERTION FAILED: stranger called an internal helper';
  exception when insufficient_privilege then null;
  end;
  begin
    perform app.assert_partition_security();
    raise exception 'ASSERTION FAILED: stranger called the partition auditor';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ai_suggestions (student_id, kind, payload, confidence)
    values (LUCAS, 'update_skill', '{}'::jsonb, 0.99);
    raise exception 'ASSERTION FAILED: a user fabricated an AI suggestion';
  exception when insufficient_privilege then null;
  end;
  perform t.logout();

  ------------------------------------------------- leaving the organization
  update public.student_organization_memberships
     set status = 'ended', end_date = current_date
   where id = '55555555-5555-4555-8555-000000000010';

  perform t.login(ADELE);
  perform t.assert_eq((select count(*) from public.students), 0::bigint,
    'former organization loses student access');
  perform t.assert_eq((select count(*) from public.documents), 0::bigint,
    'former organization loses family-owned documents');
  perform t.assert_eq((select count(*) from public.student_organization_memberships), 1::bigint,
    'organization keeps its own enrolment history');
  perform t.logout();

  perform t.login(CARLA);
  perform t.assert_eq((select count(*) from public.students), 2::bigint, 'family keeps its students');
  perform t.assert((select count(*) from public.documents) >= 2, 'family keeps its documents');
  perform t.assert_eq((select count(*) from public.portfolio_items), 2::bigint, 'family keeps the portfolio');
  perform t.logout();

  -- restore for the storage tests
  update public.student_organization_memberships
     set status = 'active', end_date = null
   where id = '55555555-5555-4555-8555-000000000010';

  raise notice 'ALL RLS SMOKE CHECKS PASSED';
end $$;

-- =============================================================================
-- NEGATIVE CONTROL
-- =============================================================================
-- Everything above is a set of assertions that pass. A test suite that silently
-- fails to impersonate anyone - because SET LOCAL ROLE did not take effect, or
-- because the statements ran as a superuser that bypasses RLS - would also
-- report "all passed". This block asserts something we KNOW is false, so the
-- run is only trustworthy if this raises.
do $$
declare ok boolean := false;
begin
  begin
    perform t.login('11111111-1111-4111-8111-000000000008');  -- stranger
    -- A stranger must see zero students; assert 2 so this MUST fail.
    perform t.assert_eq((select count(*) from public.students), 2::bigint,
      'negative control: stranger must NOT see students');
  exception when assert_failure then
    ok := true;
  end;
  perform t.logout();
  if not ok then
    raise exception 'NEGATIVE CONTROL DID NOT FIRE: RLS is not being enforced in this harness, '
                    'so every assertion above is meaningless';
  end if;
  raise notice 'negative control fired correctly - RLS is genuinely enforced';
end $$;
