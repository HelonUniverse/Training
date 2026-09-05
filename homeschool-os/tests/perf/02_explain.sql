-- =============================================================================
-- Authorization performance at scale. Run after 01_scale_seed.sql.
--   GUARDIAN  user 501  - 5 students          (the common case)
--   TEACHER   user 1    - ~200 via 2 classes + 30 explicit assignments
--   ORGADMIN  user 1    - 100 students in org 1
-- =============================================================================
\set GUARDIAN '00000000-0000-4000-9000-000000000501'
\set TEACHER  '00000000-0000-4000-9000-000000000001'


\echo '=== 1. parent: student list ==='
begin;
select t.login(:'GUARDIAN');
explain (analyze, buffers, costs off, timing off)
  select id, preferred_name, grade_level from public.students order by legal_last_name;
commit;

\echo '=== 2. parent: portfolio feed ==='
begin;
select t.login(:'GUARDIAN');
explain (analyze, buffers, costs off, timing off)
  select id, title, occurred_on from public.portfolio_items order by occurred_on desc limit 20;
commit;

\echo '=== 3. parent: document inbox (per-row visibility) ==='
begin;
select t.login(:'GUARDIAN');
explain (analyze, buffers, costs off, timing off)
  select id, original_filename, document_date from public.documents order by document_date desc limit 20;
commit;

\echo '=== 4. teacher: student list (class + assignment paths) ==='
begin;
select t.login(:'TEACHER');
explain (analyze, buffers, costs off, timing off)
  select id, preferred_name from public.students order by legal_last_name limit 50;
commit;

\echo '=== 5. teacher: portfolio across their caseload ==='
begin;
select t.login(:'TEACHER');
explain (analyze, buffers, costs off, timing off)
  select id, title from public.portfolio_items order by occurred_on desc limit 50;
commit;

\echo '=== 6. org admin: student roster ==='
begin;
select t.login(:'TEACHER');
explain (analyze, buffers, costs off, timing off)
  select id, preferred_name from public.students order by legal_last_name limit 100;
commit;

\echo '=== 7. org admin: document list (per-row visibility) ==='
begin;
select t.login(:'TEACHER');
explain (analyze, buffers, costs off, timing off)
  select id, original_filename from public.documents order by document_date desc limit 50;
commit;

\echo '=== 8. calendar: a week of instances ==='
begin;
select t.login(:'TEACHER');
explain (analyze, buffers, costs off, timing off)
  select id, starts_at from public.calendar_event_instances
   where starts_at between now() and now() + interval '7 days'
   order by starts_at limit 100;
commit;

\echo '=== 9. helper micro-benchmarks ==='
begin;
select t.login(:'GUARDIAN');
explain (analyze, costs off, timing off)
  select app.can_student_action('00000000-0000-4000-9003-000000000001'::uuid, 'portfolio', 'read');
explain (analyze, costs off, timing off)
  select count(*) from app.my_student_ids_for('portfolio', 'read');
explain (analyze, costs off, timing off)
  select count(*) from app.my_student_relationships();
commit;

begin;
select t.login(:'TEACHER');
explain (analyze, costs off, timing off)
  select count(*) from app.my_student_ids_for('portfolio', 'read');
commit;
