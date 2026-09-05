-- =============================================================================
-- RLS: write paths. Denials are where policy bugs hide.
-- =============================================================================
\set CARLA    '11111111-1111-4111-8111-000000000001'
\set PEDRO    '11111111-1111-4111-8111-000000000002'
\set TOMAS    '11111111-1111-4111-8111-000000000005'
\set SAM      '11111111-1111-4111-8111-000000000006'
\set EVA      '11111111-1111-4111-8111-000000000007'
\set STRANGER '11111111-1111-4111-8111-000000000008'
\set FAM_A    '22222222-2222-4222-8222-00000000000a'
\set FAM_B    '22222222-2222-4222-8222-00000000000b'
\set LUCAS    '44444444-4444-4444-8444-00000000000d'
\set MARLA    '44444444-4444-4444-8444-00000000000e'
\set SOFIA    '44444444-4444-4444-8444-00000000000f'

-- 1. A guardian may add a student to their own family, but not to another.
begin;
select t.login(:'CARLA');
insert into public.students (family_id, legal_first_name, legal_last_name, date_of_birth)
values (:'FAM_A'::uuid, 'Nina', 'Melendez', date '2019-03-03');
do $$
begin
  begin
    insert into public.students (family_id, legal_first_name, legal_last_name, date_of_birth)
    values ('22222222-2222-4222-8222-00000000000b', 'Intruder', 'Child', date '2019-03-03');
    raise exception 'ASSERTION FAILED: a student was inserted into another family';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 2. An assigned teacher may write evidence for their student only.
begin;
select t.login(:'TOMAS');
insert into public.portfolio_items (student_id, family_id, title)
values (:'LUCAS'::uuid, :'FAM_A'::uuid, 'Class project');
do $$
begin
  begin
    insert into public.portfolio_items (student_id, family_id, title)
    values ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', 'Not my student');
    raise exception 'ASSERTION FAILED: a teacher wrote evidence for an unassigned student';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 3. A view_only guardian cannot write.
begin;
select t.login(:'PEDRO');
do $$
begin
  begin
    insert into public.portfolio_items (student_id, family_id, title)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'Should fail');
    raise exception 'ASSERTION FAILED: a view_only guardian wrote evidence';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 4. An evaluator with a read grant cannot write, and cannot grant access onward.
begin;
select t.login(:'EVA');
do $$
begin
  begin
    insert into public.portfolio_items (student_id, family_id, title)
    values ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', 'Should fail');
    raise exception 'ASSERTION FAILED: a read-only evaluator wrote evidence';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.student_access_grants
      (student_id, grantee_email, kind, granted_by, expires_at)
    values ('44444444-4444-4444-8444-00000000000e', 'friend@example.test', 'review',
            '11111111-1111-4111-8111-000000000007', now() + interval '10 days');
    raise exception 'ASSERTION FAILED: an evaluator re-shared a student';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 5. Org staff with no assignment cannot touch student data.
begin;
select t.login(:'SAM');
do $$
begin
  begin
    insert into public.activity_logs (student_id, family_id, activity_title)
    values ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'Should fail');
    raise exception 'ASSERTION FAILED: unassigned staff wrote an activity log';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 6. A stranger's UPDATE silently matches nothing rather than leaking existence.
begin;
select t.login(:'STRANGER');
with u as (update public.students set preferred_name = 'Hacked' where id = :'LUCAS'::uuid returning 1)
select t.assert_eq((select count(*) from u), 0::bigint,
  'an unauthorised update affects zero rows');
rollback;

-- 7. Nobody may create an AI suggestion through the user-facing role:
--    proposals originate only from the pipeline (service_role).
begin;
select t.login(:'CARLA');
do $$
begin
  begin
    insert into public.ai_suggestions (student_id, kind, payload, confidence)
    values ('44444444-4444-4444-8444-00000000000d', 'update_skill', '{}'::jsonb, 0.99);
    raise exception 'ASSERTION FAILED: a user fabricated an AI suggestion';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 8. Compliance status is computed, never set by hand.
begin;
select t.login(:'CARLA');
do $$
begin
  begin
    insert into public.student_compliance_records (student_id, overall_status)
    values ('44444444-4444-4444-8444-00000000000d', 'current');
    raise exception 'ASSERTION FAILED: a user set their own compliance status';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- 9. AI telemetry is invisible to end users; the summary view is org-scoped.
begin;
select t.login(:'CARLA');
select t.assert_eq((select count(*) from public.ai_usage_events), 0::bigint,
  'a parent cannot read AI provider telemetry');
commit;

-- 10. A guardian can read the access log for their own child.
begin;
select app.audit('document_viewed', 'documents', '66666666-6666-4666-8666-000000000011',
                 '44444444-4444-4444-8444-00000000000d', null, null, '{}'::jsonb,
                 '11111111-1111-4111-8111-000000000005');
select t.login(:'CARLA');
select t.assert((select count(*) from public.audit_logs where student_id = :'LUCAS'::uuid) >= 1,
  'a guardian sees who accessed their child''s records');
reset role;
select t.login(:'STRANGER');
select t.assert_eq((select count(*) from public.audit_logs where student_id = :'LUCAS'::uuid), 0::bigint,
  'an unrelated user sees none of it');
rollback;

select 'write-path policy checks passed' as result;
