-- =============================================================================
-- STEP 2.5: privilege escalation, partitions, organization exit, export boundary
-- =============================================================================
\set CARLA    '11111111-1111-4111-8111-000000000001'
\set ADELE    '11111111-1111-4111-8111-000000000004'
\set NORA     '11111111-1111-4111-8111-00000000000a'
\set ROSA     '11111111-1111-4111-8111-00000000000b'
\set EVA      '11111111-1111-4111-8111-000000000007'
\set STRANGER '11111111-1111-4111-8111-000000000008'
\set LUCAS    '44444444-4444-4444-8444-00000000000d'
\set ORG      '33333333-3333-4333-8333-00000000000c'

-- === an authenticated stranger cannot widen access through any helper =======
begin;
select t.login(:'STRANGER');

-- the resolvers answer only for the caller and return nothing
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'none'::app.access_level, 'no student access');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'read'), 'no resource access');
select t.assert_eq((select count(*) from app.my_student_ids_for('portfolio', 'read')), 0::bigint,
  'the set resolver is empty');
select t.assert_eq((select count(*) from app.my_student_relationships()), 0::bigint,
  'no relationships at all');
select t.assert_eq((select count(*) from app.my_student_ids()), 0::bigint, 'no students');

-- internal helpers are simply not callable
do $$
begin
  begin
    perform app.permission_override('student', '44444444-4444-4444-8444-00000000000d', 'student.access');
    raise exception 'ASSERTION FAILED: internal permission_override was callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform app.assert_partition_security();
    raise exception 'ASSERTION FAILED: the partition auditor was callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform app.secure_partition('public.audit_logs_default'::regclass);
    raise exception 'ASSERTION FAILED: a DDL helper was callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform app.attach_history('public.students'::regclass);
    raise exception 'ASSERTION FAILED: attach_history was callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform app.capture_history();
    raise exception 'ASSERTION FAILED: a trigger body was callable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- telemetry, audit and history are closed
select t.assert_eq((select count(*) from public.ai_usage_events), 0::bigint, 'no AI telemetry');
select t.assert_eq((select count(*) from public.ai_usage_summary), 0::bigint, 'no AI cost projection');
select t.assert_eq((select count(*) from public.audit_logs), 0::bigint, 'no audit rows');
select t.assert_eq((select count(*) from public.record_history), 0::bigint, 'no history rows');
select t.assert_eq((select count(*) from public.documents), 0::bigint, 'no documents');
select t.assert_eq((select count(*) from public.students), 0::bigint, 'no students');
select t.assert_eq((select count(*) from public.consents), 0::bigint, 'no consents');
select t.assert_eq((select count(*) from public.staff_records), 0::bigint, 'no HR records');
select t.assert_eq((select count(*) from public.incident_reports), 0::bigint, 'no incident records');
commit;

-- === partitions stay unreachable by name ====================================
do $$
declare r record;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-000000000008', false);
  for r in select c.oid::regclass::text as rel
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relispartition and c.relkind = 'r'
            limit 5
  loop
    begin
      set local role authenticated;
      execute format('select count(*) from %s', r.rel);
      reset role;
      raise exception 'ASSERTION FAILED: partition % was directly readable', r.rel;
    exception when insufficient_privilege then
      reset role;
    end;
  end loop;
end $$;

-- and the permanent invariant holds
select t.assert_eq((select count(*) from app.assert_partition_security()), 0::bigint,
  'every partition is sealed');

-- === audit entries cannot be forged =========================================
begin;
select t.login(:'STRANGER');
select app.audit('document_viewed', 'documents', null, null, null, null, '{}'::jsonb,
                 :'CARLA'::uuid) as forged;
reset role;
select t.assert_eq(
  (select actor_user_id from public.audit_logs
    where action = 'document_viewed' order by created_at desc limit 1),
  :'STRANGER'::uuid,
  'a user session is always recorded as itself, never as the actor it claimed');
rollback;

-- === nobody can grant themselves anything ===================================
begin;
select t.login(:'STRANGER');
do $$
begin
  begin
    insert into public.user_permissions (user_id, scope_type, scope_id, permission, effect)
    values ('11111111-1111-4111-8111-000000000008', 'student',
            '44444444-4444-4444-8444-00000000000d', 'portfolio.read', 'allow');
    raise exception 'ASSERTION FAILED: a stranger granted themselves a permission';
  exception when insufficient_privilege then null;
       when check_violation then null;
  end;
  begin
    insert into public.support_access_sessions (user_id, student_id, reason, expires_at)
    values ('11111111-1111-4111-8111-000000000008', '44444444-4444-4444-8444-00000000000d',
            'I would like to look at this record', now() + interval '1 hour');
    raise exception 'ASSERTION FAILED: a non-super-admin opened a support session';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.student_staff_assignments (student_id, user_id, role, access_level, granted_by)
    values ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000008',
            'teacher', 'write', '11111111-1111-4111-8111-000000000008');
    raise exception 'ASSERTION FAILED: a stranger assigned themselves to a student';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.class_staff (class_id, user_id, role)
    values ('77777777-7777-4777-8777-000000000021', '11111111-1111-4111-8111-000000000008', 'lead');
    raise exception 'ASSERTION FAILED: a stranger staffed themselves onto a class';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- a student-scope override may only ever NARROW authority
do $$
begin
  begin
    insert into public.user_permissions (user_id, scope_type, scope_id, permission, effect)
    values ('11111111-1111-4111-8111-00000000000a', 'student',
            '44444444-4444-4444-8444-00000000000d', 'compliance_submission.submit', 'allow');
    raise exception 'ASSERTION FAILED: an ALLOW override was accepted at student scope';
  exception when check_violation then null;
  end;
end $$;

-- ... and a DENY override really does narrow
begin;
insert into public.user_permissions (user_id, scope_type, scope_id, permission, effect)
values (:'CARLA'::uuid, 'student', :'LUCAS'::uuid, 'portfolio.update', 'deny');
select t.login(:'CARLA');
select t.assert(not app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'update'),
  'a deny override removes a capability the matrix grants');
select t.assert(app.can_student_action(:'LUCAS'::uuid, 'portfolio', 'read'),
  'and narrows nothing else');
select t.assert_eq((select count(*) from app.my_student_ids_for('portfolio', 'update')
                     where my_student_ids_for = :'LUCAS'::uuid), 0::bigint,
  'the set resolver honours the same override');
rollback;

-- === no AI suggestion may be created or approved outside the pipeline =======
begin;
select t.login(:'CARLA');
do $$
begin
  begin
    insert into public.ai_suggestions (student_id, kind, payload, confidence, status,
                                       applied_record_type, applied_record_id, decided_by, decided_at)
    values ('44444444-4444-4444-8444-00000000000d', 'update_skill', '{}'::jsonb, 0.99, 'accepted',
            'student_skills', gen_random_uuid(), '11111111-1111-4111-8111-000000000001', now());
    raise exception 'ASSERTION FAILED: a user created a pre-approved AI suggestion';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- === leaving an organization ================================================
begin;
update public.student_organization_memberships
   set status = 'ended', end_date = current_date
 where id = '55555555-5555-4555-8555-000000000010';
-- Nora's class row is what an organization would also close on exit
update public.class_students set active = false, ended_on = current_date
 where class_id = '77777777-7777-4777-8777-000000000021';

select t.login(:'ADELE');
select t.assert_eq((select count(*) from public.students), 0::bigint,
  'the org admin loses student access when the enrolment ends');
select t.assert_eq((select count(*) from public.documents where student_id = :'LUCAS'::uuid), 0::bigint,
  'the former organization cannot read family-owned educational documents');
select t.assert_eq((select count(*) from public.portfolio_items), 0::bigint,
  'nor the portfolio');
select t.assert_eq((select count(*) from public.student_organization_memberships), 1::bigint,
  'but the organization keeps its own enrolment history record');
select t.assert_eq((select count(*) from public.incident_reports), 0::bigint,
  'organization-owned operational records remain organization-scoped');
reset role;

select t.login(:'NORA');
select t.assert_eq((select count(*) from public.students), 0::bigint,
  'the class teacher loses access when the class enrolment closes');
reset role;

select t.login(:'CARLA');
select t.assert_eq((select count(*) from public.students), 2::bigint,
  'the family keeps both students');
select t.assert((select count(*) from public.documents where student_id = :'LUCAS'::uuid) >= 4,
  'the family keeps every educational document');
select t.assert_eq((select count(*) from public.student_organization_memberships), 1::bigint,
  'and keeps the longitudinal enrolment history');
select t.assert((select count(*) from public.portfolio_items) >= 2,
  'and keeps the portfolio');
rollback;

-- === the export boundary ====================================================
begin;
select t.login(:'CARLA');
select t.assert(app.can_export_student(:'LUCAS'::uuid), 'a full guardian may export');
select t.assert_eq((select count(*) from app.export_manifest(:'LUCAS'::uuid) m
                     where m.included and m.table_name in
                       ('staff_records','organization_documents','ai_usage_events',
                        'audit_logs','incident_reports','record_history','job_queue')),
                   0::bigint,
  'no other party''s records are ever in a family export');
select t.assert((select count(*) from app.export_manifest(:'LUCAS'::uuid) m
                  where m.included and m.table_name in
                    ('portfolio_items','reading_logs','student_skills','learning_plans',
                     'evaluations','documents')) >= 6,
  'the family-owned educational record IS in the export');
select t.assert_eq((select m.export_filter from app.export_manifest(:'LUCAS'::uuid) m
                     where m.table_name = 'teacher_notes'),
                   'visibility in (''family'',''all'')',
  'teacher-private and staff notes are filtered out of the export');
select t.assert((select m.excluded_because from app.export_manifest(:'LUCAS'::uuid) m
                  where m.table_name = 'staff_records') is not null,
  'and the reason for each exclusion is recorded');
commit;

begin;
select t.login(:'ROSA');
select t.assert(not app.can_export_student(:'LUCAS'::uuid),
  'a standard guardian cannot export the whole record');
select t.assert_eq((select count(*) from app.export_manifest(:'LUCAS'::uuid) m where m.included), 0::bigint,
  'and the manifest returns nothing includable for them');
commit;

begin;
select t.login(:'NORA');
select t.assert(not app.can_export_student(:'LUCAS'::uuid), 'a teacher cannot export a student record');
commit;

select 'privilege escalation and boundary checks passed' as result;
