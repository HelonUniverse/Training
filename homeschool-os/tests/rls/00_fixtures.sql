-- =============================================================================
-- RLS test fixtures
-- =============================================================================
-- Loaded as the owner (bypasses RLS) to build a realistic multi-tenant graph:
--
--   Family A (Melendez)   guardians: carla (full), pedro (view_only)
--                         students:  lucas (in org), marla (not in org)
--   Family B (Rivera)     guardian:  diego            student: sofia
--   Organization "Helon"  admin: adele  teacher: tomas (assigned to lucas only)
--                         staff:  sam
--   Evaluator eva         granted read on marla until +30d
--                         expired grant on sofia
--   stranger              no relationship to anything
-- =============================================================================
create schema if not exists t;

create or replace function t.assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION FAILED: %', p_message using errcode = 'assert_failure';
  end if;
end $$;

create or replace function t.assert_eq(p_actual anyelement, p_expected anyelement, p_message text)
returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_message, p_expected, p_actual
      using errcode = 'assert_failure';
  end if;
end $$;

-- Becomes the given user as the `authenticated` role.
create or replace function t.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  execute 'set local role authenticated';
end $$;

grant usage on schema t to authenticated;
grant execute on all functions in schema t to authenticated;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-000000000001', 'carla@example.test'),
  ('11111111-1111-4111-8111-000000000002', 'pedro@example.test'),
  ('11111111-1111-4111-8111-000000000003', 'diego@example.test'),
  ('11111111-1111-4111-8111-000000000004', 'adele@example.test'),
  ('11111111-1111-4111-8111-000000000005', 'tomas@example.test'),
  ('11111111-1111-4111-8111-000000000006', 'sam@example.test'),
  ('11111111-1111-4111-8111-000000000007', 'eva@example.test'),
  ('11111111-1111-4111-8111-000000000008', 'stranger@example.test'),
  ('11111111-1111-4111-8111-000000000009', 'lucas.student@example.test');

insert into public.families (id, name, primary_guardian_id, state_code, county, is_independent) values
  ('22222222-2222-4222-8222-00000000000a', 'Melendez Family', '11111111-1111-4111-8111-000000000001', 'FL', 'Osceola', true),
  ('22222222-2222-4222-8222-00000000000b', 'Rivera Family',   '11111111-1111-4111-8111-000000000003', 'FL', 'Orange',  true);

insert into public.family_members (family_id, user_id, role, is_primary) values
  ('22222222-2222-4222-8222-00000000000a', '11111111-1111-4111-8111-000000000001', 'guardian', true),
  ('22222222-2222-4222-8222-00000000000a', '11111111-1111-4111-8111-000000000002', 'guardian', false),
  ('22222222-2222-4222-8222-00000000000b', '11111111-1111-4111-8111-000000000003', 'guardian', true);

insert into public.organizations (id, name, slug, type, state_code, county, created_by) values
  ('33333333-3333-4333-8333-00000000000c', 'Helon Universe', 'helon-universe', 'microschool', 'FL', 'Osceola',
   '11111111-1111-4111-8111-000000000004');

insert into public.organization_members (organization_id, user_id, role, status) values
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000004', 'org_admin', 'active'),
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000005', 'teacher',   'active'),
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000006', 'staff',     'active');

insert into public.students (id, family_id, user_id, legal_first_name, legal_last_name, preferred_name,
                             date_of_birth, grade_level, state_code, county, homeschool_start_date) values
  ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
   '11111111-1111-4111-8111-000000000009', 'Lucas', 'Melendez', 'Lucas', date '2015-04-10', '5', 'FL', 'Osceola', date '2024-08-01'),
  ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', null,
   'Marla', 'Melendez', 'Marla', date '2017-09-22', '3', 'FL', 'Osceola', date '2024-08-01'),
  ('44444444-4444-4444-8444-00000000000f', '22222222-2222-4222-8222-00000000000b', null,
   'Sofia', 'Rivera', 'Sofia', date '2016-01-15', '4', 'FL', 'Orange', date '2025-08-01');

insert into public.student_guardians (student_id, user_id, relationship, is_primary, access_level, granted_by) values
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001', 'mother', true,  'full',      '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000e', '11111111-1111-4111-8111-000000000001', 'mother', true,  'full',      '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000002', 'father', false, 'view_only', '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000f', '11111111-1111-4111-8111-000000000003', 'father', true,  'full',      '11111111-1111-4111-8111-000000000003');

-- Only Lucas is enrolled with the organization.
insert into public.student_organization_memberships
  (id, student_id, organization_id, enrollment_type, status, start_date, created_by) values
  ('55555555-5555-4555-8555-000000000010', '44444444-4444-4444-8444-00000000000d',
   '33333333-3333-4333-8333-00000000000c', 'program', 'active', date '2026-08-01',
   '11111111-1111-4111-8111-000000000004');

-- Tomas teaches Lucas. He is NOT assigned to Marla, and Marla is not in the org.
insert into public.student_staff_assignments (student_id, user_id, organization_id, role, access_level, granted_by) values
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000005',
   '33333333-3333-4333-8333-00000000000c', 'teacher', 'write', '11111111-1111-4111-8111-000000000004');

-- Eva may review Marla's portfolio for 30 days; her grant on Sofia has expired.
insert into public.student_access_grants
  (student_id, grantee_user_id, kind, access_level, status, granted_by, granted_at, expires_at) values
  ('44444444-4444-4444-8444-00000000000e', '11111111-1111-4111-8111-000000000007', 'evaluation', 'read',
   'active', '11111111-1111-4111-8111-000000000001', now(), now() + interval '30 days'),
  ('44444444-4444-4444-8444-00000000000f', '11111111-1111-4111-8111-000000000007', 'evaluation', 'read',
   'active', '11111111-1111-4111-8111-000000000003', now() - interval '200 days', now() - interval '1 day');

insert into public.portfolio_items (student_id, family_id, title, occurred_on, created_by) values
  ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'Volcano experiment', current_date, '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', 'Reading response',   current_date, '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000f', '22222222-2222-4222-8222-00000000000b', 'Fraction worksheet', current_date, '11111111-1111-4111-8111-000000000003');

insert into public.documents (id, family_id, student_id, uploaded_by, storage_path, original_filename,
                              mime_type, byte_size, sha256, scan_status, status) values
  ('66666666-6666-4666-8666-000000000011', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   '22222222-2222-4222-8222-00000000000a/44444444-4444-4444-8444-00000000000d/66666666-6666-4666-8666-000000000011/eval.pdf',
   'eval.pdf', 'application/pdf', 12345, repeat('a', 64), 'clean', 'filed');
