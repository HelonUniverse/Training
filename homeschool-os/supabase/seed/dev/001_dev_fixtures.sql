-- =============================================================================
-- DEVELOPMENT FIXTURES - never run in production
-- =============================================================================
-- Usage: see supabase/seed/dev/README.md
--   psql ... -v allow_dev_seed=on -v carla_id=<uuid> -v tomas_id=<uuid> \
--            -v adele_id=<uuid> -v eva_id=<uuid> -f 001_dev_fixtures.sql
-- =============================================================================
\if :{?allow_dev_seed}
\else
  \echo 'ERROR: run with -v allow_dev_seed=on (development databases only)'
  \quit
\endif

do $$
begin
  -- Second guard: refuse if the database looks like production.
  if coalesce(current_setting('app.environment', true), 'development') = 'production' then
    raise exception 'development fixtures must never be loaded in production';
  end if;
  if exists (select 1 from public.students limit 1) then
    raise notice 'students already exist - fixtures are additive, not idempotent';
  end if;
end $$;

begin;

insert into public.families (id, name, primary_guardian_id, state_code, county, timezone,
                             homeschool_start_date, is_independent, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Dev Family', :'carla_id'::uuid,
        'FL', 'Osceola', 'America/New_York', date '2024-08-01', true, :'carla_id'::uuid)
on conflict (id) do nothing;

insert into public.family_members (family_id, user_id, role, is_primary) values
  ('aaaaaaaa-0000-4000-8000-000000000001', :'carla_id'::uuid, 'guardian', true)
on conflict do nothing;

insert into public.academic_years (id, family_id, name, starts_on, ends_on, is_current) values
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   '2026-2027', date '2026-08-01', date '2027-07-31', true)
on conflict (id) do nothing;

insert into public.students (id, family_id, legal_first_name, legal_last_name, preferred_name,
                             date_of_birth, grade_level, state_code, county,
                             homeschool_start_date, current_academic_year_id, created_by) values
  ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Lucas', 'Dev', 'Lucas', date '2015-04-10', '5', 'FL', 'Osceola', date '2024-08-01',
   'aaaaaaaa-0000-4000-8000-000000000002', :'carla_id'::uuid),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000001',
   'Marla', 'Dev', 'Marla', date '2017-09-22', '3', 'FL', 'Osceola', date '2024-08-01',
   'aaaaaaaa-0000-4000-8000-000000000002', :'carla_id'::uuid)
on conflict (id) do nothing;

insert into public.student_guardians (student_id, user_id, relationship, is_primary, access_level, granted_by)
select s.id, :'carla_id'::uuid, 'mother', true, 'full', :'carla_id'::uuid
  from public.students s where s.family_id = 'aaaaaaaa-0000-4000-8000-000000000001'
on conflict do nothing;

insert into public.organizations (id, name, slug, type, state_code, county, created_by) values
  ('aaaaaaaa-0000-4000-8000-000000000021', 'Dev Microschool', 'dev-microschool', 'microschool',
   'FL', 'Osceola', :'adele_id'::uuid)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status) values
  ('aaaaaaaa-0000-4000-8000-000000000021', :'adele_id'::uuid, 'org_admin', 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000021', :'tomas_id'::uuid, 'teacher',   'active')
on conflict do nothing;

insert into public.student_organization_memberships
  (student_id, organization_id, enrollment_type, status, start_date, academic_year_id, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000021',
        'part_time', 'active', date '2026-08-01', 'aaaaaaaa-0000-4000-8000-000000000002', :'adele_id'::uuid)
on conflict do nothing;

insert into public.student_staff_assignments (student_id, user_id, organization_id, role, access_level, granted_by)
values ('aaaaaaaa-0000-4000-8000-000000000011', :'tomas_id'::uuid,
        'aaaaaaaa-0000-4000-8000-000000000021', 'teacher', 'write', :'adele_id'::uuid)
on conflict do nothing;

insert into public.classes (id, organization_id, academic_year_id, subject_id, name, type, capacity, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000031', 'aaaaaaaa-0000-4000-8000-000000000021',
        'aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000101',
        'Math Pod (Grades 4-6)', 'pod', 8, :'adele_id'::uuid)
on conflict (id) do nothing;

insert into public.class_students (class_id, student_id, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000031', 'aaaaaaaa-0000-4000-8000-000000000011', :'adele_id'::uuid)
on conflict do nothing;
insert into public.class_staff (class_id, user_id, role, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000031', :'tomas_id'::uuid, 'lead', :'adele_id'::uuid)
on conflict do nothing;

-- a week of schedule for the parent dashboard
insert into public.calendar_events (family_id, title, type, starts_at, ends_at, timezone, created_by)
select 'aaaaaaaa-0000-4000-8000-000000000001', v.title, v.type::app.event_type,
       (current_date + v.offset_days) + v.start_time, (current_date + v.offset_days) + v.end_time,
       'America/New_York', :'carla_id'::uuid
  from (values
    ('Math - Fractions', 'lesson', 0, time '10:00', time '11:00'),
    ('Reading',          'lesson', 0, time '11:00', time '12:00'),
    ('Science Lab',      'lesson', 0, time '13:30', time '14:30'),
    ('Math - Review',    'lesson', 1, time '10:00', time '11:00'),
    ('Field Trip',       'field_trip', 3, time '09:00', time '14:00')
  ) as v(title, type, offset_days, start_time, end_time);

insert into public.portfolio_items (student_id, family_id, academic_year_id, subject_id, title,
                                    description, activity_type, evidence_category, occurred_on, created_by)
values
  ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000105',
   'Volcano experiment', 'Hands-on experiment exploring chemical reactions and observation.',
   'experiment', 'work_sample', current_date - 3, :'carla_id'::uuid),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000102',
   'Reading response journal', 'Weekly comprehension responses.',
   'writing', 'work_sample', current_date - 1, :'carla_id'::uuid);

insert into public.student_skills (student_id, skill_id, mastery_level, score, confidence,
                                   entered_by, source_type, created_by)
values
  ('aaaaaaaa-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000204',
   'proficient',  92, 'teacher_observed', :'tomas_id'::uuid, 'teacher', :'tomas_id'::uuid),
  ('aaaaaaaa-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000206',
   'developing',  68, 'teacher_observed', :'tomas_id'::uuid, 'teacher', :'tomas_id'::uuid),
  ('aaaaaaaa-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000223',
   'progressing', 81, 'parent_reported',  :'carla_id'::uuid, 'parent',  :'carla_id'::uuid)
on conflict do nothing;

insert into public.reading_logs (student_id, family_id, book_title, author, started_on,
                                 reading_type, created_by)
values ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000001',
        'Charlotte''s Web', 'E. B. White', current_date - 10, 'read_aloud', :'carla_id'::uuid);

commit;
\echo 'Development fixtures loaded.'
