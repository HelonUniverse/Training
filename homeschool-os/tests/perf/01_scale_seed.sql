-- =============================================================================
-- Performance fixture: realistic scale
--   100 organizations, 500 teachers, 2,000 families, 10,000 students,
--   ~500 classes with ~20,000 enrolments, 30,000 documents,
--   50,000 portfolio items, 40,000 calendar instances
-- Loaded as the owner. History triggers are disabled during bulk load and the
-- state they would have captured is not needed for query planning.
-- =============================================================================
\timing on

alter table public.students disable trigger capture_history;
alter table public.student_organization_memberships disable trigger capture_history;
alter table public.student_organization_memberships disable trigger sync_primary_org;
alter table public.documents disable trigger capture_history;

-- users: 1..500 teachers, 501..2500 guardians
insert into auth.users (id, email)
select ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid,
       'perf' || i || '@example.test'
  from generate_series(1, 2500) i;

insert into public.organizations (id, name, slug, type, state_code, county, created_by)
select ('00000000-0000-4000-9001-' || lpad(i::text, 12, '0'))::uuid,
       'Perf Org ' || i, 'perf-org-' || i, 'microschool', 'FL', 'Osceola',
       ('00000000-0000-4000-9000-' || lpad('1', 12, '0'))::uuid
  from generate_series(1, 100) i;

-- each teacher belongs to one organization; teacher 1 is also admin of org 1
insert into public.organization_members (organization_id, user_id, role, status)
select ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid,
       'teacher', 'active'
  from generate_series(1, 500) i;
insert into public.organization_members (organization_id, user_id, role, status)
values (('00000000-0000-4000-9001-' || lpad('1', 12, '0'))::uuid,
        ('00000000-0000-4000-9000-' || lpad('1', 12, '0'))::uuid, 'org_admin', 'active');

insert into public.families (id, name, state_code, county, is_independent)
select ('00000000-0000-4000-9002-' || lpad(i::text, 12, '0'))::uuid,
       'Perf Family ' || i, 'FL', 'Osceola', true
  from generate_series(1, 2000) i;

-- guardians 501..2500 map one-to-one onto families
insert into public.family_members (family_id, user_id, role, is_primary)
select ('00000000-0000-4000-9002-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad((500 + i)::text, 12, '0'))::uuid,
       'guardian', true
  from generate_series(1, 2000) i;

-- 10,000 students, 5 per family
insert into public.students (id, family_id, legal_first_name, legal_last_name, date_of_birth,
                             grade_level, state_code, county)
select ('00000000-0000-4000-9003-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9002-' || lpad((((i - 1) / 5) + 1)::text, 12, '0'))::uuid,
       'Student', 'Perf' || i, date '2014-01-01' + (i % 2000), ((i % 12) + 1)::text, 'FL', 'Osceola'
  from generate_series(1, 10000) i;

insert into public.student_guardians (student_id, user_id, access_level, granted_by)
select ('00000000-0000-4000-9003-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad((500 + ((i - 1) / 5) + 1)::text, 12, '0'))::uuid,
       'full',
       ('00000000-0000-4000-9000-' || lpad((500 + ((i - 1) / 5) + 1)::text, 12, '0'))::uuid
  from generate_series(1, 10000) i;

-- every student enrolled with one organization; org 1 is the large one (500 students)
insert into public.student_organization_memberships
  (student_id, organization_id, enrollment_type, status, start_date)
select ('00000000-0000-4000-9003-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       'program', 'active', current_date - 100
  from generate_series(1, 10000) i;

-- 500 classes, 5 per organization
insert into public.classes (id, organization_id, name, type, created_by)
select ('00000000-0000-4000-9004-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       'Perf Class ' || i, 'class',
       ('00000000-0000-4000-9000-' || lpad('1', 12, '0'))::uuid
  from generate_series(1, 500) i;

insert into public.class_staff (class_id, user_id, role)
select ('00000000-0000-4000-9004-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad(i::text, 12, '0'))::uuid, 'lead'
  from generate_series(1, 500) i;

-- 20,000 class enrolments: each student in ~2 classes of their own organization
insert into public.class_students (class_id, student_id, status)
select ('00000000-0000-4000-9004-' || lpad((((i - 1) % 100) + 1 + 100 * k)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9003-' || lpad(i::text, 12, '0'))::uuid, 'enrolled'
  from generate_series(1, 10000) i, generate_series(0, 1) k;

-- explicit assignments for a subset, so both staff paths are represented
insert into public.student_staff_assignments (student_id, user_id, organization_id, role, access_level, granted_by)
select ('00000000-0000-4000-9003-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       'teacher', 'write',
       ('00000000-0000-4000-9000-' || lpad('1', 12, '0'))::uuid
  from generate_series(1, 3000) i;

-- 30,000 documents at mixed visibility
insert into public.documents (id, family_id, student_id, uploaded_by, storage_path, original_filename,
                              mime_type, byte_size, sha256, scan_status, status, visibility, document_date)
select ('00000000-0000-4000-9005-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9002-' || lpad(((((i - 1) % 10000) / 5) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9003-' || lpad((((i - 1) % 10000) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9000-' || lpad((500 + ((((i - 1) % 10000)) / 5) + 1)::text, 12, '0'))::uuid,
       'perf/' || i || '.pdf', 'doc' || i || '.pdf', 'application/pdf', 1000,
       md5(i::text) || md5((i + 1)::text), 'clean', 'filed',
       (array['family_private','academic_shared','family_shared'])[(i % 3) + 1]::app.document_visibility,
       current_date - (i % 365)
  from generate_series(1, 30000) i;

-- 50,000 portfolio items
insert into public.portfolio_items (student_id, family_id, title, occurred_on)
select ('00000000-0000-4000-9003-' || lpad((((i - 1) % 10000) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9002-' || lpad(((((i - 1) % 10000) / 5) + 1)::text, 12, '0'))::uuid,
       'Perf item ' || i, current_date - (i % 365)
  from generate_series(1, 50000) i;

-- calendar: one recurring event per class, 80 materialised instances each
insert into public.calendar_events (id, organization_id, class_id, title, type, starts_at, ends_at)
select ('00000000-0000-4000-9006-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9004-' || lpad(i::text, 12, '0'))::uuid,
       'Perf Event ' || i, 'class', now(), now() + interval '1 hour'
  from generate_series(1, 500) i;

insert into public.calendar_event_instances
  (event_id, organization_id, class_id, occurrence_date, starts_at, ends_at)
select ('00000000-0000-4000-9006-' || lpad(i::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9001-' || lpad((((i - 1) % 100) + 1)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-9004-' || lpad(i::text, 12, '0'))::uuid,
       current_date + k, now() + (k || ' days')::interval, now() + (k || ' days')::interval + interval '1 hour'
  from generate_series(1, 500) i, generate_series(0, 79) k;

alter table public.students enable trigger capture_history;
alter table public.student_organization_memberships enable trigger capture_history;
alter table public.student_organization_memberships enable trigger sync_primary_org;
alter table public.documents enable trigger capture_history;

analyze;
select 'scale seed loaded' as result,
       (select count(*) from public.students) as students,
       (select count(*) from public.documents) as documents,
       (select count(*) from public.portfolio_items) as portfolio_items,
       (select count(*) from public.class_students) as class_enrolments,
       (select count(*) from public.calendar_event_instances) as event_instances;
