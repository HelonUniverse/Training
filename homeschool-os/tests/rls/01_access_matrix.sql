-- =============================================================================
-- RLS: the access matrix
-- =============================================================================
\set CARLA    '11111111-1111-4111-8111-000000000001'
\set PEDRO    '11111111-1111-4111-8111-000000000002'
\set DIEGO    '11111111-1111-4111-8111-000000000003'
\set ADELE    '11111111-1111-4111-8111-000000000004'
\set TOMAS    '11111111-1111-4111-8111-000000000005'
\set SAM      '11111111-1111-4111-8111-000000000006'
\set EVA      '11111111-1111-4111-8111-000000000007'
\set STRANGER '11111111-1111-4111-8111-000000000008'
\set LUCASU   '11111111-1111-4111-8111-000000000009'
\set LUCAS    '44444444-4444-4444-8444-00000000000d'
\set MARLA    '44444444-4444-4444-8444-00000000000e'
\set SOFIA    '44444444-4444-4444-8444-00000000000f'
\set ORG      '33333333-3333-4333-8333-00000000000c'

-- --- 1. guardian scope -------------------------------------------------------
begin;
select t.login(:'CARLA');
select t.assert_eq((select count(*) from public.students), 2::bigint,
  'a guardian sees exactly their own two students');
select t.assert_eq((select count(*) from public.students where id = :'SOFIA'::uuid), 0::bigint,
  'a guardian cannot see another family''s student');
select t.assert_eq((select count(*) from public.portfolio_items), 2::bigint,
  'portfolio is scoped to the guardian''s students');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'admin'::app.access_level,
  'a full guardian administers their student');
commit;

-- --- 2. view-only guardian (custody split) ----------------------------------
begin;
select t.login(:'PEDRO');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'read'::app.access_level,
  'a view_only guardian reads but cannot write');
select t.assert(not app.can_write_student(:'LUCAS'::uuid),
  'a view_only guardian is denied write');
select t.assert_eq((select count(*) from public.students where id = :'MARLA'::uuid), 0::bigint,
  'guardianship is per student, not per family');
commit;

-- --- 3. teacher: assignment only, never the whole roster ---------------------
begin;
select t.login(:'TOMAS');
select t.assert_eq((select count(*) from public.students), 1::bigint,
  'a teacher sees only students they are assigned to');
select t.assert_eq((select count(*) from public.students where id = :'LUCAS'::uuid), 1::bigint,
  'the assigned student is visible');
select t.assert_eq((select count(*) from public.students where id = :'MARLA'::uuid), 0::bigint,
  'a sibling of an assigned student is NOT visible without an assignment');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'write'::app.access_level,
  'an assigned teacher has write access');
select t.assert_eq(app.student_access(:'MARLA'::uuid), 'none'::app.access_level,
  'org membership alone grants no student access');
commit;

-- --- 4. org staff without assignment -----------------------------------------
begin;
select t.login(:'SAM');
select t.assert_eq((select count(*) from public.students), 0::bigint,
  'a staff member with no assignment reaches no students');
select t.assert(app.can_view_organization(:'ORG'::uuid),
  'a staff member can still see the organization itself');
commit;

-- --- 5. org admin: only actively enrolled students ---------------------------
begin;
select t.login(:'ADELE');
select t.assert_eq((select count(*) from public.students), 1::bigint,
  'an org admin sees only students with an active membership');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'admin'::app.access_level,
  'an org admin administers enrolled students');
select t.assert_eq(app.student_access(:'MARLA'::uuid), 'none'::app.access_level,
  'a non-enrolled sibling is invisible to the org admin');
select t.assert_eq(app.student_access(:'SOFIA'::uuid), 'none'::app.access_level,
  'another organization''s/family''s student is invisible');
commit;

-- --- 6. evaluator: time-boxed, single student --------------------------------
begin;
select t.login(:'EVA');
select t.assert_eq((select count(*) from public.students), 1::bigint,
  'an evaluator sees only the student they were granted');
select t.assert_eq(app.student_access(:'MARLA'::uuid), 'read'::app.access_level,
  'an active grant yields read access');
select t.assert_eq(app.student_access(:'SOFIA'::uuid), 'none'::app.access_level,
  'an EXPIRED grant yields no access');
commit;

-- --- 7. student self-scope ---------------------------------------------------
begin;
select t.login(:'LUCASU');
select t.assert_eq((select count(*) from public.students), 1::bigint,
  'a student sees only themself');
select t.assert_eq(app.student_access(:'LUCAS'::uuid), 'read'::app.access_level,
  'a student has read access to their own record');
commit;

-- --- 8. stranger -------------------------------------------------------------
begin;
select t.login(:'STRANGER');
select t.assert_eq((select count(*) from public.students), 0::bigint, 'a stranger sees no students');
select t.assert_eq((select count(*) from public.portfolio_items), 0::bigint, 'a stranger sees no portfolio');
select t.assert_eq((select count(*) from public.documents), 0::bigint, 'a stranger sees no documents');
select t.assert_eq((select count(*) from public.families), 0::bigint, 'a stranger sees no families');
select t.assert_eq((select count(*) from public.organizations), 0::bigint, 'a stranger sees no organizations');
select t.assert_eq((select count(*) from public.audit_logs), 0::bigint, 'a stranger sees no audit rows');
commit;

-- --- 9. revocation is immediate ---------------------------------------------
begin;
update public.student_guardians set revoked_at = now()
 where student_id = :'MARLA'::uuid and user_id = :'CARLA'::uuid;
select t.login(:'CARLA');
select t.assert_eq(app.student_access(:'MARLA'::uuid), 'none'::app.access_level,
  'revoking guardianship removes access immediately');
rollback;

-- --- 10. ending an org membership revokes access but keeps history -----------
begin;
update public.student_organization_memberships
   set status = 'ended', end_date = current_date
 where id = '55555555-5555-4555-8555-000000000010';

select t.login(:'ADELE');
select t.assert_eq((select count(*) from public.students), 0::bigint,
  'ending a membership revokes the org admin''s access to the student');
select t.assert_eq((select count(*) from public.student_organization_memberships), 1::bigint,
  'the historical membership row survives for the organization''s own records');
reset role;

select t.login(:'CARLA');
select t.assert_eq((select count(*) from public.students where id = :'LUCAS'::uuid), 1::bigint,
  'the family keeps the student record after leaving the organization');
select t.assert_eq((select count(*) from public.portfolio_items where student_id = :'LUCAS'::uuid), 1::bigint,
  'the family keeps the educational record after leaving the organization');
select t.assert_eq((select count(*) from public.student_organization_memberships), 1::bigint,
  'the family also retains the longitudinal enrolment history');
rollback;
