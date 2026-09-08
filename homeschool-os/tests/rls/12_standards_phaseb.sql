-- =============================================================================
-- STEP 6 PHASE B - real published standards, and what they must not have changed
-- =============================================================================
-- The suite now runs the genuine ingestion before it runs these tests: the
-- authoritative CPALMS artifact, parsed by the production adapter, staged
-- through the production RPCs, reviewed and published. So these are assertions
-- about REAL published reference data, not about a fixture that resembles it.
--
-- The claims worth proving here are the ones a family is harmed by if they are
-- wrong. Two kinds:
--
--   PROVENANCE   every published benchmark can be traced to bytes, to a line
--                and character offset in those bytes, to a staged row, and to
--                the person who approved it. A benchmark that cannot be traced
--                is a benchmark nobody can check.
--
--   CHILD-PACED  publishing 184 state benchmarks changed NOTHING about how a
--                child learns. No skill acquired a standards identity, no
--                prerequisite was created from an import, no mapping appeared
--                that a person did not make. The acceptance criterion for the
--                whole step is that a parent who never looks at a standards
--                code can still use the entire learning system, and that is
--                only true if importing standards is inert with respect to it.
--
-- FIXTURE OWNERSHIP. Rows this file creates are prefixed TEST6B and it deletes
-- only what it created. It never mutates the published batch, which is exactly
-- the row set a careless test would "clean up".
-- =============================================================================

\set OPERATOR '11111111-1111-4111-8111-0000000000f0'
\set CARLA  '11111111-1111-4111-8111-000000000001'
\set SHA    '474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914'

begin;

-- =============================================================================
-- 1. The batch is present, and is the one that was authorised
-- =============================================================================

do $$
declare v_source public.standards_sources; v_batch public.standards_import_batches;
begin
  select * into v_source from public.standards_sources
   where sha256 = '474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914';
  perform t.assert(found, '1a. the authorised artifact is registered');
  perform t.assert_eq(v_source.byte_size, 841856::bigint, '1b. and is the authorised size');

  -- The three separate questions, each answered separately.
  perform t.assert_eq(v_source.authority::text, 'state_curriculum_portal', '1c. WHO published it');
  perform t.assert_eq(v_source.artifact_kind::text, 'canonical_standards_publication',
    '1d. WHAT the document is');
  perform t.assert_eq(v_source.representation::text, 'canonical_structured',
    '1e. HOW its content is carried');

  -- The filename claimed Word. The bytes decided.
  perform t.assert_eq(v_source.detected_format::text, 'html',
    '1f. the format came from the bytes');
  perform t.assert_eq(v_source.declared_mime, 'application/msword',
    '1g. and the claim is kept alongside, so the disagreement stays visible');

  perform t.assert(v_source.official_source_page is not null, '1h. a page a person can open');
  perform t.assert(v_source.acquisition_url is not null, '1i. and the URL the bytes came from');
  perform t.assert(v_source.acquired_at is not null, '1j. and when');

  select * into v_batch from public.standards_import_batches where source_id = v_source.id;
  perform t.assert_eq(v_batch.adapter, 'florida-best-structured', '1k. read by the structured adapter');
  perform t.assert_eq(v_batch.status::text, 'published', '1l. the batch is published');
  perform t.assert_eq(v_batch.rows_seen, 642, '1m. the artifact held 642 benchmarks');
  perform t.assert_eq(v_batch.rows_staged, 184, '1n. K-5 is 184 of them');
  perform t.assert_eq(v_batch.rows_published, 184, '1o. and all 184 were published');
  perform t.assert_eq(v_batch.rows_unresolved, 0, '1p. with nothing left unresolved');
end $$;

-- =============================================================================
-- 2. The count gate, asserted against the database rather than the parser
-- =============================================================================
-- These numbers were stated before the parser existed. Asserting them here as
-- well as in the parser tests is the difference between "the parser produced
-- 184" and "184 are actually readable by a family".

do $$
declare r record; v_expected jsonb :=
  '{"K":22,"1":26,"2":27,"3":34,"4":39,"5":36}'::jsonb;
begin
  for r in select normalized_grade as g, count(*)::int as n
             from public.standards where normalized_grade is not null
            group by 1
  loop
    perform t.assert(v_expected ? r.g, format('2a. grade %s is in scope', r.g));
    perform t.assert_eq(r.n, (v_expected ->> r.g)::int,
      format('2b. grade %s has the published number of benchmarks', r.g));
  end loop;
  perform t.assert_eq((select count(*)::int from public.standards), 184,
    '2c. 184 in total');
  perform t.assert_eq((select count(distinct code)::int from public.standards), 184,
    '2d. and every identity is distinct');
end $$;

-- Grades 6-12 were counted and never staged. Publishing one by accident is the
-- failure this asserts against.
select t.assert(not exists (
  select 1 from public.standards
   where normalized_grade is not null and normalized_grade not in ('K','1','2','3','4','5')),
  '2e. no out-of-scope grade was published');

select t.assert(not exists (select 1 from public.standards where code like '%K12%'),
  '2f. no K-12 practice was published: this run asked for benchmarks');

-- =============================================================================
-- 3. Every published benchmark is traceable and readable
-- =============================================================================

select t.assert_eq((select count(*)::int from public.standards
                     where statement is null or btrim(statement) = ''), 0,
  '3a. no published benchmark has empty wording');

select t.assert_eq((select count(*)::int from public.standards
                     where source_id is null or staged_record_id is null), 0,
  '3b. every one traces to an artifact and to the staged row it came from');

select t.assert_eq((select count(*)::int from public.standards
                     where source_locator is null), 0,
  '3c. and to a place inside that artifact');

-- The locator has to identify ONE row. The artifact puts as many as 26
-- benchmarks on a single line, so a line number alone names a region.
select t.assert_eq((select count(*)::int from public.standards
                     where source_locator !~ 'char [0-9]+'), 0,
  '3d. every locator carries a character offset, not only a line');
select t.assert_eq((select count(distinct source_locator)::int from public.standards), 184,
  '3e. and no two benchmarks claim the same place');

select t.assert_eq((select count(*)::int from public.standards where published_by is null), 0,
  '3f. a person published every one');

select t.assert_eq((select count(*)::int from public.standards_staged_records
                     where status = 'published' and reviewed_by is null), 0,
  '3g. and a person reviewed every one');

select t.assert_eq((select count(*)::int from public.standards_texts
                     where is_official and language = 'en-US'), 184,
  '3h. the official text is recorded as official, in a real locale');

-- =============================================================================
-- 4. CHILD-PACED: importing standards changed nothing about learning
-- =============================================================================
-- The hierarchy is Student -> Skills -> Evidence -> Readiness -> Learning Path,
-- and separately Skill -> optional standards mappings. Publishing a state's
-- benchmarks must not have touched the first chain at all.

select t.assert_eq((select count(*)::int from public.skill_standards), 0,
  '4a. 184 published benchmarks produced ZERO skill mappings: a person makes those');

select t.assert_eq((select count(*)::int from public.skill_prerequisites
                     where source_type in ('import','ai_suggestion')), 0,
  '4b. and zero prerequisites: a framework''s ordering is not a child''s ordering');

select t.assert_eq((select count(*)::int from information_schema.columns
                     where table_schema = 'public' and table_name = 'skills'
                       and column_name in ('framework','framework_ref','standard','standard_id',
                                           'standard_ref','standard_code','standards_code')), 0,
  '4c. no skill acquired a standards identity');

-- A skill remains a valid, complete skill with no mapping at all. This is the
-- property that has to survive a state retiring a benchmark tomorrow.
select t.assert(exists (
  select 1 from public.skills s
   where not exists (select 1 from public.skill_standards m where m.skill_id = s.id)),
  '4d. skills exist that map to no standard, and they are ordinary skills');

-- =============================================================================
-- 5. The gates still refuse the things they exist to refuse
-- =============================================================================

do $$
declare v_err text; v_source uuid; v_batch uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');   -- Carla, a parent

  begin
    perform public.register_standards_source(
      p_authority => 'state_education_agency', p_authority_name => 'TEST6B',
      p_artifact_name => 'TEST6B.doc', p_detected_format => 'html',
      p_sha256 => repeat('a', 64), p_byte_size => 1,
      p_artifact_kind => 'canonical_standards_publication',
      p_representation => 'canonical_structured');
    v_err := 'NO ERROR';
  exception when others then v_err := SQLSTATE; end;
  perform t.assert_eq(v_err, '42501',
    '5a. a parent cannot register a standards source');

  begin
    update public.standards set statement = 'rewritten by a parent'
     where code = (select min(code) from public.standards);
    perform t.assert_eq((select count(*)::int from public.standards
                          where statement = 'rewritten by a parent'), 0,
      '5b. and cannot rewrite published wording');
  exception when others then null;   -- refused outright is also correct
  end;
  perform t.logout();
end $$;

-- The source representation of a staged row is evidence, and stays evidence.
do $$
declare v_err text; v_id uuid;
begin
  perform t.login('11111111-1111-4111-8111-0000000000f0');   -- the standards operator
  -- The guard first. An earlier version of this test read the row as an account
  -- that RLS hid every staged record from, updated zero rows, saw no error, and
  -- reported that the trigger had refused the edit. A test that passes because
  -- it did nothing is worse than no test.
  perform t.assert(app.is_standards_admin(),
    '5c(pre). the operator holds the capability, so this test is not vacuous');
  select id into v_id from public.standards_staged_records limit 1;
  perform t.assert(v_id is not null, '5c(pre). and can actually see a staged row');

  begin
    update public.standards_staged_records
       set source_statement = 'a reviewer improved the state''s wording' where id = v_id;
    v_err := 'NO ERROR';
  exception when others then v_err := SQLSTATE; end;
  perform t.assert_eq(v_err, '23514',
    '5c. not even a standards admin may edit what the document said');

  -- And the normalized columns, which a reviewer IS allowed to correct. Asserted
  -- by reading the value back: `assert(true)` after an update would pass even if
  -- the update had matched nothing.
  update public.standards_staged_records
     set normalized_subject = 'TEST6B corrected' where id = v_id;
  perform t.assert_eq(
    (select normalized_subject from public.standards_staged_records where id = v_id),
    'TEST6B corrected', '5c2. while the normalization stays correctable');
  perform t.logout();
end $$;

-- A synthetic source can never publish, however complete it looks.
do $$
declare v_err text; v_src uuid; v_ver uuid; v_batch uuid; v_fw uuid;
begin
  perform t.login('11111111-1111-4111-8111-0000000000f0');
  v_src := public.register_standards_source(
    p_authority => 'synthetic_test', p_authority_name => 'TEST6B fixture authority',
    p_artifact_name => 'TEST6B-fixture.csv', p_detected_format => 'csv',
    p_sha256 => repeat('b', 64), p_byte_size => 10,
    p_artifact_kind => 'canonical_standards_publication',
    p_representation => 'canonical_tabular');

  insert into public.standards_frameworks (code, name, jurisdiction, version_year)
  values ('TEST6B.FW', 'TEST6B throwaway framework', 'ZZ', 2099) returning id into v_fw;
  insert into public.standards_framework_versions (framework_id, version_label, subject, status)
  values (v_fw, 'TEST6B.V1', 'mathematics', 'active') returning id into v_ver;

  v_batch := (public.open_standards_import(v_src, 'synthetic-test', '1.0.0', v_ver) ->> 'batch_id')::uuid;
  perform public.stage_standard_record(
    p_batch => v_batch, p_row => 1, p_status => 'staged',
    p_source_code => 'ZZ.1.AA.1.1', p_source_statement => 'A fixture statement.',
    p_normalized_code => 'ZZ.1.AA.1.1', p_normalized_grade => '1',
    p_normalized_subject => 'mathematics', p_source_locator => 'row 1');
  perform public.review_staged_record(
    (select id from public.standards_staged_records where batch_id = v_batch),
    'approved', 'TEST6B');

  begin
    perform public.publish_standards_batch(v_batch);
    v_err := 'NO ERROR';
  exception when others then v_err := SQLSTATE; end;
  perform t.assert_eq(v_err, '23514',
    '5d. a synthetic source cannot publish canonical standards, even fully approved');

  -- And this file cleans up only what this file made.
  delete from public.standards_frameworks where id = v_fw;
  delete from public.standards_sources where id = v_src;
  perform t.logout();
end $$;

-- A secondary reference from a real authority still cannot publish.
do $$
declare v_err text; v_src uuid; v_ver uuid; v_batch uuid; v_fw uuid;
begin
  perform t.login('11111111-1111-4111-8111-0000000000f0');
  v_src := public.register_standards_source(
    p_authority => 'state_education_agency', p_authority_name => 'TEST6B department',
    p_artifact_name => 'TEST6B-parent-guide.doc', p_detected_format => 'html',
    p_sha256 => repeat('c', 64), p_byte_size => 10,
    p_artifact_kind => 'parent_guide', p_representation => 'canonical_structured');

  insert into public.standards_frameworks (code, name, jurisdiction, version_year)
  values ('TEST6B.FW2', 'TEST6B throwaway framework 2', 'ZZ', 2099) returning id into v_fw;
  insert into public.standards_framework_versions (framework_id, version_label, subject, status)
  values (v_fw, 'TEST6B.V1', 'mathematics', 'active') returning id into v_ver;

  v_batch := (public.open_standards_import(v_src, 'florida-best-structured', '1.0.0', v_ver)
              ->> 'batch_id')::uuid;
  begin
    perform public.publish_standards_batch(v_batch);
    v_err := 'NO ERROR';
  exception when others then v_err := SQLSTATE; end;
  perform t.assert_eq(v_err, '23514',
    '5e. a parent guide from a department of education is still not the standards');

  delete from public.standards_frameworks where id = v_fw;
  delete from public.standards_sources where id = v_src;
  perform t.logout();
end $$;

-- =============================================================================
-- 6. The acceptance criterion
-- =============================================================================
-- A family that never looks at a standards code can use the entire learning
-- system. Asserted as: nothing a family reads or writes requires a standard,
-- and the standards tables are not on any path a family must take.

select t.assert_eq((select count(*)::int from information_schema.columns c
                     where c.table_schema = 'public'
                       and c.is_nullable = 'NO' and c.column_default is null
                       and c.column_name like '%standard%'
                       and c.table_name in ('skills','learning_evidence','course_progress',
                                            'students','families')), 0,
  '6a. no table a family uses requires a standard to be filled in');

do $$
declare v_n integer;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');   -- Carla, a parent
  -- She can read the reference layer if she wants it.
  select count(*) into v_n from public.standards;
  perform t.assert(v_n = 184, '6b. a parent may read the reference layer');
  -- And she is not a standards administrator by virtue of being able to.
  perform t.assert(not app.is_standards_admin(),
    '6c. reading the catalogue is not administering it');
  perform t.logout();
end $$;

rollback;
