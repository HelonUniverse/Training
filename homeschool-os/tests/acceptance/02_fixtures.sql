-- STEP 2.6 / B: REAL Supabase Auth users + the eight-role fixture graph.
-- Passwords are bcrypt via pgcrypto so every user can actually sign in through
-- GoTrue and receive a genuine JWT (used by storage_api_test.sh).
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

-- Impersonate exactly the way PostgREST does: set the JWT claims, then SET ROLE.
create or replace function t.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function t.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

grant usage on schema t to authenticated;
grant execute on all functions in schema t to authenticated;

-- --- real auth users ---------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated',
       v.email, extensions.crypt('AcceptanceTest123!', extensions.gen_salt('bf')),
       now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', ''
from (values
  ('11111111-1111-4111-8111-000000000001'::uuid, 'carla@acceptance.test'),   -- guardian full
  ('11111111-1111-4111-8111-000000000002'::uuid, 'pedro@acceptance.test'),   -- guardian view_only
  ('11111111-1111-4111-8111-000000000003'::uuid, 'diego@acceptance.test'),   -- other family
  ('11111111-1111-4111-8111-000000000004'::uuid, 'adele@acceptance.test'),   -- org admin
  ('11111111-1111-4111-8111-000000000005'::uuid, 'tomas@acceptance.test'),   -- assigned teacher
  ('11111111-1111-4111-8111-000000000007'::uuid, 'eva@acceptance.test'),     -- evaluator
  ('11111111-1111-4111-8111-000000000008'::uuid, 'stranger@acceptance.test'),-- unrelated
  ('11111111-1111-4111-8111-000000000009'::uuid, 'lucas@acceptance.test'),   -- student
  ('11111111-1111-4111-8111-00000000000a'::uuid, 'nora@acceptance.test'),    -- class teacher
  ('11111111-1111-4111-8111-00000000000b'::uuid, 'rosa@acceptance.test')     -- guardian standard
) as v(id, email)
on conflict (id) do nothing;

-- The on_auth_user_created trigger should have produced these.
do $$
declare v_n int;
begin
  select count(*) into v_n from public.profiles
   where id::text like '11111111-1111-4111-8111-%';
  if v_n < 10 then
    raise exception 'the auth.users -> profiles trigger produced only % of 10 profiles', v_n;
  end if;
  raise notice 'profiles auto-provisioned by trigger: %', v_n;
end $$;

-- --- the fixture graph -------------------------------------------------------
insert into public.families (id, name, primary_guardian_id, state_code, county, is_independent) values
  ('22222222-2222-4222-8222-00000000000a', 'Melendez Family', '11111111-1111-4111-8111-000000000001', 'FL', 'Osceola', true),
  ('22222222-2222-4222-8222-00000000000b', 'Rivera Family',   '11111111-1111-4111-8111-000000000003', 'FL', 'Orange',  true)
on conflict (id) do nothing;

insert into public.family_members (family_id, user_id, role, is_primary) values
  ('22222222-2222-4222-8222-00000000000a', '11111111-1111-4111-8111-000000000001', 'guardian', true),
  ('22222222-2222-4222-8222-00000000000a', '11111111-1111-4111-8111-000000000002', 'guardian', false),
  ('22222222-2222-4222-8222-00000000000b', '11111111-1111-4111-8111-000000000003', 'guardian', true)
on conflict do nothing;

insert into public.organizations (id, name, slug, type, state_code, county, created_by) values
  ('33333333-3333-4333-8333-00000000000c', 'Helon Universe', 'helon-universe', 'microschool', 'FL', 'Osceola',
   '11111111-1111-4111-8111-000000000004')
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status) values
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000004', 'org_admin', 'active'),
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000005', 'teacher',   'active'),
  ('33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-00000000000a', 'teacher',   'active')
on conflict do nothing;

insert into public.students (id, family_id, user_id, legal_first_name, legal_last_name, preferred_name,
                             date_of_birth, grade_level, state_code, county, homeschool_start_date) values
  ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a',
   '11111111-1111-4111-8111-000000000009', 'Lucas', 'Melendez', 'Lucas', date '2015-04-10', '5', 'FL', 'Osceola', date '2024-08-01'),
  ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', null,
   'Marla', 'Melendez', 'Marla', date '2017-09-22', '3', 'FL', 'Osceola', date '2024-08-01'),
  ('44444444-4444-4444-8444-00000000000f', '22222222-2222-4222-8222-00000000000b', null,
   'Sofia', 'Rivera', 'Sofia', date '2016-01-15', '4', 'FL', 'Orange', date '2025-08-01')
on conflict (id) do nothing;

insert into public.student_guardians (student_id, user_id, relationship, is_primary, access_level, granted_by) values
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001', 'mother', true,  'full',      '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000e', '11111111-1111-4111-8111-000000000001', 'mother', true,  'full',      '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000002', 'father', false, 'view_only', '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-00000000000b', 'stepmother', false, 'standard', '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000f', '11111111-1111-4111-8111-000000000003', 'father', true,  'full',      '11111111-1111-4111-8111-000000000003')
on conflict do nothing;

insert into public.student_organization_memberships
  (id, student_id, organization_id, enrollment_type, status, start_date, created_by) values
  ('55555555-5555-4555-8555-000000000010', '44444444-4444-4444-8444-00000000000d',
   '33333333-3333-4333-8333-00000000000c', 'program', 'active', current_date, '11111111-1111-4111-8111-000000000004')
on conflict (id) do nothing;

insert into public.student_staff_assignments (student_id, user_id, organization_id, role, access_level, granted_by) values
  ('44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000005',
   '33333333-3333-4333-8333-00000000000c', 'teacher', 'write', '11111111-1111-4111-8111-000000000004')
on conflict do nothing;

insert into public.classes (id, organization_id, name, type, created_by) values
  ('77777777-7777-4777-8777-000000000021', '33333333-3333-4333-8333-00000000000c',
   'Math Pod', 'pod', '11111111-1111-4111-8111-000000000004')
on conflict (id) do nothing;
insert into public.class_students (class_id, student_id, created_by) values
  ('77777777-7777-4777-8777-000000000021', '44444444-4444-4444-8444-00000000000d',
   '11111111-1111-4111-8111-000000000004') on conflict do nothing;
insert into public.class_staff (class_id, user_id, role, created_by) values
  ('77777777-7777-4777-8777-000000000021', '11111111-1111-4111-8111-00000000000a', 'lead',
   '11111111-1111-4111-8111-000000000004') on conflict do nothing;

-- evaluator grant on Marla: portfolio + reading_log only
insert into public.student_access_grants
  (id, student_id, grantee_user_id, kind, sections, access_level, status, granted_by, granted_at, expires_at) values
  ('88888888-8888-4888-8888-000000000031', '44444444-4444-4444-8444-00000000000e',
   '11111111-1111-4111-8111-000000000007', 'evaluation',
   array['portfolio','reading_log']::app.resource_type[], 'read', 'active',
   '11111111-1111-4111-8111-000000000001', now(), now() + interval '30 days'),
-- and an already-expired grant on Sofia
  ('88888888-8888-4888-8888-000000000032', '44444444-4444-4444-8444-00000000000f',
   '11111111-1111-4111-8111-000000000007', 'evaluation',
   array['portfolio']::app.resource_type[], 'read', 'active',
   '11111111-1111-4111-8111-000000000003', now() - interval '200 days', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.portfolio_items (student_id, family_id, title, occurred_on, created_by) values
  ('44444444-4444-4444-8444-00000000000d', '22222222-2222-4222-8222-00000000000a', 'Volcano experiment', current_date, '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', 'Reading response',   current_date, '11111111-1111-4111-8111-000000000001'),
  ('44444444-4444-4444-8444-00000000000f', '22222222-2222-4222-8222-00000000000b', 'Fraction worksheet', current_date, '11111111-1111-4111-8111-000000000003')
on conflict do nothing;

insert into public.reading_logs (student_id, family_id, book_title, reading_type, created_by) values
  ('44444444-4444-4444-8444-00000000000e', '22222222-2222-4222-8222-00000000000a', 'The Hobbit', 'independent', '11111111-1111-4111-8111-000000000001')
on conflict do nothing;

-- documents at each visibility, all owned by the Melendez family
insert into public.documents (id, family_id, student_id, uploaded_by, storage_path, original_filename,
                              mime_type, byte_size, sha256, scan_status, status, visibility, category) values
  ('99999999-9999-4999-8999-000000000041', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   '22222222-2222-4222-8222-00000000000a/lucas/private.pdf', 'medical-note.pdf',
   'application/pdf', 1000, repeat('b',64), 'clean', 'filed', 'family_private', 'other'),
  ('99999999-9999-4999-8999-000000000042', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   '22222222-2222-4222-8222-00000000000a/lucas/worksheet.pdf', 'worksheet.pdf',
   'application/pdf', 1000, repeat('c',64), 'clean', 'filed', 'academic_shared', 'worksheet'),
  ('99999999-9999-4999-8999-000000000046', '22222222-2222-4222-8222-00000000000a',
   '44444444-4444-4444-8444-00000000000d', '11111111-1111-4111-8111-000000000001',
   '22222222-2222-4222-8222-00000000000a/lucas/infected.pdf', 'infected.pdf',
   'application/pdf', 1000, repeat('9',64), 'infected', 'quarantined', 'academic_shared', 'other')
on conflict (id) do nothing;

insert into public.teacher_notes (id, student_id, organization_id, author_user_id, body, visibility) values
  ('aaaaaaaa-1111-4111-8111-000000000051', '44444444-4444-4444-8444-00000000000d',
   '33333333-3333-4333-8333-00000000000c', '11111111-1111-4111-8111-000000000005',
   'Private working note.', 'private_to_author')
on conflict (id) do nothing;

select 'fixtures loaded' as result,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.students) as students,
       (select count(*) from public.documents) as documents;
