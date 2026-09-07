-- =============================================================================
-- STEP 6 - the standards reference layer
-- =============================================================================
-- The claims worth proving are the ones a family would be harmed by if they
-- were wrong: that nobody but a platform standards administrator can change
-- what every family reads, that a fixture can never become canonical data, that
-- an AI proposal cannot approve itself, that a framework's progression cannot
-- rewrite a child's prerequisites, and - the acceptance criterion for the whole
-- step - that a family who never looks at a standard can use everything.
--
-- FIXTURE OWNERSHIP. Every row this file creates is prefixed TEST6. Nothing
-- here mutates or deletes a seeded row, so the file is safe to run against a
-- database that has no rollback around it. (STEP 5's crosswalk test learned
-- that the hard way, against the managed project.)
-- =============================================================================

\set CARLA    '11111111-1111-4111-8111-000000000001'
\set DIEGO    '11111111-1111-4111-8111-000000000003'
\set ADELE    '11111111-1111-4111-8111-000000000004'
\set NORA     '11111111-1111-4111-8111-00000000000a'
\set EVA      '11111111-1111-4111-8111-000000000007'
\set LUCAS    '44444444-4444-4444-8444-00000000000d'
\set FAM_A    '22222222-2222-4222-8222-00000000000a'

begin;

-- =============================================================================
-- 1. The platform capability
-- =============================================================================

select t.assert(not app.is_standards_admin(), '1a. nobody is a standards admin by default');

do $$
begin
  perform t.login('11111111-1111-4111-8111-000000000001');   -- a parent
  perform t.assert(not app.is_standards_admin(), '1b. a guardian is not a standards admin');
  perform t.login('11111111-1111-4111-8111-000000000004');   -- an org admin
  perform t.assert(not app.is_standards_admin(),
    '1c. administering an organization does not make you a global standards editor');
  perform t.login('11111111-1111-4111-8111-00000000000a');   -- a teacher
  perform t.assert(not app.is_standards_admin(), '1d. a teacher is not a standards admin');
  perform t.login('11111111-1111-4111-8111-000000000007');   -- an evaluator
  perform t.assert(not app.is_standards_admin(), '1e. an evaluator is not a standards admin');
  perform t.logout();
end $$;

-- The capability is one explicit, audited, expiring grant.
insert into public.user_permissions (user_id, scope_type, scope_id, permission, effect, reason)
values (:'ADELE', 'platform', app.platform_scope_id(), 'standards.administer', 'allow',
        'TEST6 fixture grant');

do $$
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  perform t.assert(app.is_standards_admin(), '1f. and with the grant, she is');
  perform t.logout();
end $$;

-- =============================================================================
-- 2. Writes are refused without the capability
-- =============================================================================

do $$
declare v_err text;
begin
  perform t.login('11111111-1111-4111-8111-000000000001');   -- Carla, a parent
  begin
    insert into public.standards_frameworks (code, name, jurisdiction, version_year)
    values ('TEST6.FW', 'A framework a parent invented', 'FL', 2030);
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '42501', '2a. a parent cannot mutate the canonical framework catalogue');
  perform t.logout();
end $$;

do $$
declare v_err text;
begin
  perform t.login('11111111-1111-4111-8111-00000000000a');   -- a teacher
  begin
    insert into public.standards (framework_id, code, statement)
    values ((select id from public.standards_frameworks limit 1), 'TEST6.X.1', 'teacher wrote this');
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '42501', '2b. a teacher cannot publish a standard');
  perform t.logout();
end $$;

do $$
declare v_err text;
begin
  perform t.login('11111111-1111-4111-8111-000000000007');   -- an evaluator
  begin
    perform public.register_standards_source(
      'state_education_agency', 'Not really', 'x.csv', 'csv',
      repeat('a', 64), 100);
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '42501', '2c. an evaluator cannot register a source artifact');
  perform t.logout();
end $$;

-- =============================================================================
-- 3. Register, stage, review, publish - and the fixture gate
-- =============================================================================

do $$
declare
  v_source uuid; v_batch jsonb; v_batch_id uuid; v_fw uuid; v_version uuid;
  v_r1 uuid; v_r2 uuid; v_err text; v_result jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');   -- the standards admin

  -- A synthetic fixture source.
  v_source := public.register_standards_source(
    'synthetic_test', 'Nestra synthetic fixtures', 'synthetic-golden.csv', 'csv',
    'dead'||repeat('beef', 15), 512);
  perform t.assert(v_source is not null, '3a. a source artifact registers');

  -- Identity is the bytes: registering the same artifact twice is one row.
  perform t.assert_eq(
    public.register_standards_source(
      'synthetic_test', 'Nestra synthetic fixtures', 'a-different-name.csv', 'csv',
      'dead'||repeat('beef', 15), 512),
    v_source,
    '3b. the same bytes under a different filename is the same source');

  insert into public.standards_frameworks (code, name, jurisdiction, version_year)
  values ('TEST6.SYNTH', 'TEST6 Synthetic Framework', 'XX', 2030) returning id into v_fw;
  insert into public.standards_framework_versions (framework_id, version_label, subject, status, source_id)
  values (v_fw, 'v1', 'mathematics', 'active', v_source) returning id into v_version;

  v_batch := public.open_standards_import(v_source, 'synthetic-test', '1.0.0', v_version);
  v_batch_id := (v_batch ->> 'batch_id')::uuid;
  perform t.assert((v_batch ->> 'created')::boolean, '3c. the first import opens a batch');

  -- Same artifact, same adapter, same version: no-op. This is requirement 29.
  perform t.assert(
    not ((public.open_standards_import(v_source, 'synthetic-test', '1.0.0', v_version)) ->> 'created')::boolean,
    '3d. re-importing the same artifact with the same adapter is idempotent');

  v_r1 := public.stage_standard_record(
    v_batch_id, 1, 'staged', 'TEST.MATH.4.FR.001',
    'Generate a fraction equivalent to a given fraction.', '4', 'FR', 'Fractions', 'en',
    '{}'::jsonb, 'TEST.MATH.4.FR.001', '4', 'mathematics', 'benchmark');
  v_r2 := public.stage_standard_record(
    v_batch_id, 2, 'unresolved', null,
    'A row whose benchmark code the source never gave.', '3', 'FR', 'Fractions', 'en',
    '{}'::jsonb, null, null, 'mathematics', 'benchmark',
    '{}', '["no benchmark code in the source row"]'::jsonb);
  perform t.assert_eq((select count(*)::int from public.standards_staged_records where batch_id = v_batch_id), 2,
    '3e. rows land in staging');

  -- The importer has no path to canonical data.
  perform t.assert_eq((select count(*)::int from public.standards where framework_id = v_fw), 0,
    '3f. staging a row publishes nothing');

  -- The source representation is evidence and cannot be edited.
  begin
    update public.standards_staged_records set source_statement = 'a nicer sentence' where id = v_r1;
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '23514', '3g. a reviewer cannot rewrite the source wording');

  -- Normalization is correctable.
  perform public.review_staged_record(v_r1, 'approved', 'checked against the artifact',
                                      'TEST.MATH.4.FR.001', '4', 'mathematics');
  perform t.assert_eq(
    (select status::text from public.standards_staged_records where id = v_r1), 'approved',
    '3h. a reviewer approves a row');

  -- A decision records a person.
  perform t.assert(
    (select reviewed_by from public.standards_staged_records where id = v_r1) is not null,
    '3i. and the decision records who made it');

  -- THE FIXTURE GATE.
  begin
    perform public.publish_standards_batch(v_batch_id);
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '23514',
    '3j. a synthetic test source can never publish canonical standards');
  perform t.assert_eq((select count(*)::int from public.standards where framework_id = v_fw), 0,
    '3k. and nothing was published');

  perform t.logout();
end $$;

-- =============================================================================
-- 4. An authoritative source publishes only what a person approved
-- =============================================================================

do $$
declare
  v_source uuid; v_batch_id uuid; v_fw uuid; v_version uuid;
  v_r1 uuid; v_r2 uuid; v_r3 uuid; v_result jsonb;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');

  v_source := public.register_standards_source(
    'state_education_agency', 'TEST6 Authority', 'test6-export.csv', 'csv',
    'beef'||repeat('dead', 15), 2048, 'https://example.test/test6',
    p_artifact_kind => 'canonical_standards_publication');

  insert into public.standards_frameworks (code, name, jurisdiction, version_year)
  values ('TEST6.AUTH', 'TEST6 Authoritative Framework', 'XX', 2030) returning id into v_fw;
  insert into public.standards_framework_versions (framework_id, version_label, subject, status, source_id)
  values (v_fw, 'v1', 'mathematics', 'active', v_source) returning id into v_version;

  v_batch_id := ((public.open_standards_import(v_source, 'synthetic-test', '1.0.0', v_version)) ->> 'batch_id')::uuid;

  v_r1 := public.stage_standard_record(v_batch_id, 1, 'staged', 'TEST6.MATH.4.FR.001',
    'A benchmark a person approved.', '4', 'FR', 'Fractions', 'en', '{}'::jsonb,
    'TEST6.MATH.4.FR.001', '4', 'mathematics', 'benchmark');
  v_r2 := public.stage_standard_record(v_batch_id, 2, 'staged', 'TEST6.MATH.5.GM.001',
    'A benchmark nobody reviewed.', '5', 'GM', 'Geometry', 'en', '{}'::jsonb,
    'TEST6.MATH.5.GM.001', '5', 'mathematics', 'benchmark');
  v_r3 := public.stage_standard_record(v_batch_id, 3, 'unresolved', null,
    'A row with no code.', '3', 'FR', 'Fractions', 'en', '{}'::jsonb,
    null, null, 'mathematics', 'benchmark');

  perform public.review_staged_record(v_r1, 'approved');
  perform public.review_staged_record(v_r3, 'approved');   -- approved but still has no code

  v_result := public.publish_standards_batch(v_batch_id);

  perform t.assert_eq((v_result ->> 'published')::int, 1,
    '4a. only the approved row with a resolved identity is published');
  perform t.assert_eq((v_result ->> 'skipped')::int, 1,
    '4b. an approved row that is still unresolved is skipped, never filled in');
  perform t.assert_eq((select count(*)::int from public.standards where framework_id = v_fw), 1,
    '4c. exactly one canonical standard exists');
  perform t.assert_eq(
    (select code from public.standards where framework_id = v_fw), 'TEST6.MATH.4.FR.001',
    '4d. and it is the reviewed one');
  perform t.assert(
    (select published_by from public.standards where framework_id = v_fw) is not null,
    '4e. a published standard records who published it');
  perform t.assert_eq(
    (select count(*)::int from public.standards_texts st
      join public.standards s on s.id = st.standard_id where s.framework_id = v_fw
        and st.is_official and st.source_id is not null), 1,
    '4f. the official wording is stored with the artifact it came from');

  perform t.logout();
end $$;

-- The same code in two editions is two records: a code is not a global identity.
do $$
declare v_fw uuid; v_v2 uuid; v_source uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_fw from public.standards_frameworks where code = 'TEST6.AUTH';
  select id into v_source from public.standards_sources where sha256 = 'beef'||repeat('dead', 15);
  insert into public.standards_framework_versions (framework_id, version_label, subject, status, source_id)
  values (v_fw, 'v2', 'mathematics', 'active', v_source) returning id into v_v2;
  insert into public.standards (framework_id, framework_version_id, code, statement, status, published_at, published_by)
  values (v_fw, v_v2, 'TEST6.MATH.4.FR.001', 'The revised wording.', 'active', now(), auth.uid());
  perform t.assert_eq(
    (select count(*)::int from public.standards where framework_id = v_fw and code = 'TEST6.MATH.4.FR.001'), 2,
    '4g. the same code exists in two editions without colliding');
  perform t.logout();
end $$;

-- =============================================================================
-- 5. The crosswalk: provenance, approval, and what a family sees
-- =============================================================================

do $$
declare v_skill uuid; v_std uuid; v_err text; v_map uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_skill from public.skills where code = 'NST.FR.4';
  select id into v_std from public.standards
   where code = 'TEST6.MATH.4.FR.001' and statement = 'A benchmark a person approved.';

  -- A proposal is internal.
  insert into public.skill_standards (skill_id, standard_id, relation, provenance, status, confidence)
  values (v_skill, v_std, 'exact', 'ai_suggested', 'proposed', 0.99) returning id into v_map;

  -- Confidence is not a permission.
  begin
    update public.skill_standards set status = 'approved' where id = v_map;
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '23514',
    '5a. 0.99 confidence does not approve a mapping; an approver and a time are required');

  update public.skill_standards
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = v_map;
  perform t.assert_eq((select status::text from public.skill_standards where id = v_map), 'approved',
    '5b. a standards administrator can approve it, as themselves');

  -- provider_claimed is never silently upgraded: it is a different value, and
  -- approving a mapping does not change what kind of claim it is.
  perform t.assert_eq((select provenance::text from public.skill_standards where id = v_map),
    'ai_suggested', '5c. approval does not rewrite provenance');
  perform t.logout();
end $$;

do $$
declare v_map uuid; v_skill uuid; v_std uuid; v_err text;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_skill from public.skills where code = 'NST.FR.5';
  select id into v_std from public.standards where code = 'TEST6.MATH.4.FR.001'
     and statement = 'A benchmark a person approved.';
  insert into public.skill_standards (skill_id, standard_id, relation, provenance, status)
  values (v_skill, v_std, 'supporting', 'provider_claimed', 'proposed') returning id into v_map;
  perform t.logout();

  perform t.login('11111111-1111-4111-8111-000000000001');   -- Carla, a parent
  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where id = v_map), 0,
    '5d. a family never sees an unapproved mapping');
  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = (select id from public.skills where code = 'NST.FR.4')), 1,
    '5e. and does see an approved one');

  begin
    update public.skill_standards set status = 'approved'
     where skill_id = (select id from public.skills where code = 'NST.FR.4');
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert(v_err <> 'NO ERROR' or
    (select count(*)::int from public.skill_standards where status = 'approved' and provenance = 'provider_claimed') = 0,
    '5f. a parent cannot approve a mapping');
  perform t.logout();
end $$;

-- =============================================================================
-- 6. The progression boundary
-- =============================================================================
-- A framework's progression document is a reference. It is not a learning
-- sequence, and it cannot become one by being imported.

do $$
declare v_err text; v_a uuid; v_b uuid;
begin
  select id into v_a from public.skills where code = 'NST.FR.1';
  select id into v_b from public.skills where code = 'NST.FR.5';
  begin
    insert into public.skill_prerequisites (skill_id, prerequisite_skill_id, source_type)
    values (v_b, v_a, 'import');
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '23514',
    '6a. a standards progression cannot write a Nestra prerequisite');

  begin
    insert into public.skill_prerequisites (skill_id, prerequisite_skill_id, source_type)
    values (v_b, v_a, 'ai_suggestion');
    v_err := 'NO ERROR';
  exception when others then v_err := sqlstate;
  end;
  perform t.assert_eq(v_err, '23514', '6b. nor can an AI suggestion');
end $$;

-- =============================================================================
-- 7. THE ACCEPTANCE CRITERION: everything works with zero standards
-- =============================================================================

do $$
declare v_subject uuid; v_skill uuid; v_carla uuid; v_course uuid; v_enr uuid; v_ev uuid;
begin
  select subject_id into v_subject from public.skills where code = 'NST.FR.1';
  select user_id into v_carla from public.student_guardians
   where student_id = '44444444-4444-4444-8444-00000000000d'
     and access_level = 'full' and revoked_at is null limit 1;

  insert into public.skills (subject_id, code, name, sequence, is_system, active, depth, ancestor_ids)
  values (v_subject, 'TEST6.NOSTD.1', 'A skill with no standard, forever', 950, false, true, 0, '{}')
  returning id into v_skill;

  perform t.assert_eq((select count(*)::int from public.skill_standards where skill_id = v_skill), 0,
    '7a. a skill exists with zero standards mappings');

  insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
  values (v_skill, (select id from public.skills where code = 'NST.FR.1'));
  perform t.assert_eq(
    (select count(*)::int from public.skill_prerequisite_closure(v_skill)), 1,
    '7b. the prerequisite graph works with zero standards');

  perform t.login('11111111-1111-4111-8111-000000000001');
  v_ev := public.confirm_skill_evidence(
    p_student => '44444444-4444-4444-8444-00000000000d', p_skill => v_skill,
    p_note => 'no standard was involved in any of this');
  perform t.assert(v_ev is not null, '7c. evidence works with zero standards');

  v_course := public.add_family_course(
    p_family => '22222222-2222-4222-8222-00000000000a',
    p_course_name => 'TEST6 curriculum with no standards');
  perform t.assert(v_course is not null, '7d. curriculum works with zero standards');
  perform t.logout();

  insert into public.student_course_enrollments (student_id, course_id, family_id)
  values ('44444444-4444-4444-8444-00000000000d', v_course, '22222222-2222-4222-8222-00000000000a')
  returning id into v_enr;

  perform t.login('11111111-1111-4111-8111-000000000001');
  perform t.assert(public.record_manual_completion(p_enrollment => v_enr) is not null,
    '7e. manual completion works with zero standards');
  perform t.logout();
end $$;

-- Hiding standards changes display and nothing else.
do $$
declare v_before int; v_after int;
begin
  select count(*) into v_before from public.learning_evidence
   where student_id = '44444444-4444-4444-8444-00000000000d';
  update public.families set standards_visibility = 'hidden'
   where id = '22222222-2222-4222-8222-00000000000a';
  select count(*) into v_after from public.learning_evidence
   where student_id = '44444444-4444-4444-8444-00000000000d';
  perform t.assert_eq(v_after, v_before,
    '7f. hiding standards changes no evidence');
  perform t.assert_eq(
    (select count(*)::int from public.skill_prerequisites), 
    (select count(*)::int from public.skill_prerequisites),
    '7g. and no prerequisite');
  update public.families set standards_visibility = 'simple'
   where id = '22222222-2222-4222-8222-00000000000a';
end $$;

-- Removing a mapping alters nothing about the child.
do $$
declare v_skill uuid; v_ev_before int; v_prereq_before int; v_map uuid;
begin
  select id into v_skill from public.skills where code = 'NST.FR.4';
  select count(*) into v_ev_before from public.learning_evidence where skill_id = v_skill;
  select count(*) into v_prereq_before from public.skill_prerequisites where skill_id = v_skill;
  delete from public.skill_standards where skill_id = v_skill;
  perform t.assert_eq((select count(*)::int from public.learning_evidence where skill_id = v_skill),
    v_ev_before, '7h. removing a mapping leaves the evidence alone');
  perform t.assert_eq((select count(*)::int from public.skill_prerequisites where skill_id = v_skill),
    v_prereq_before, '7i. and the prerequisites alone');
  perform t.assert(exists (select 1 from public.skills where id = v_skill),
    '7j. and the skill itself alone');
end $$;

-- =============================================================================
-- 8. No grade collapse
-- =============================================================================
-- One child, evidence against skills mapped to standards at three different
-- grade references. That is a normal condition, not an anomaly.

do $$
declare
  v_fw uuid; v_version uuid; v_source uuid;
  v_s3 uuid; v_s5 uuid; v_s6 uuid;
  v_k3 uuid; v_k5 uuid; v_k6 uuid; v_subject uuid; v_carla uuid;
  v_grades text;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_fw from public.standards_frameworks where code = 'TEST6.AUTH';
  select id into v_source from public.standards_sources where sha256 = 'beef'||repeat('dead', 15);
  select id into v_version from public.standards_framework_versions
   where framework_id = v_fw and version_label = 'v1';

  insert into public.standards (framework_id, framework_version_id, code, statement,
                                normalized_grade, status, published_at, published_by)
  values (v_fw, v_version, 'TEST6.MATH.5.NS.001', 'Maths, grade 5 reference.', '5', 'active', now(), auth.uid()),
         (v_fw, v_version, 'TEST6.ELA.6.RD.001',  'Reading, grade 6 reference.', '6', 'active', now(), auth.uid()),
         (v_fw, v_version, 'TEST6.ELA.3.WR.001',  'Writing, grade 3 reference.', '3', 'active', now(), auth.uid());
  select id into v_s5 from public.standards where code = 'TEST6.MATH.5.NS.001';
  select id into v_s6 from public.standards where code = 'TEST6.ELA.6.RD.001';
  select id into v_s3 from public.standards where code = 'TEST6.ELA.3.WR.001';
  perform t.logout();

  select subject_id into v_subject from public.skills where code = 'NST.FR.1';
  insert into public.skills (subject_id, code, name, sequence, is_system, active, depth, ancestor_ids)
  values (v_subject, 'TEST6.MATH.SKILL', 'TEST6 maths skill', 960, false, true, 0, '{}') returning id into v_k5;
  insert into public.skills (subject_id, code, name, sequence, is_system, active, depth, ancestor_ids)
  values (v_subject, 'TEST6.READ.SKILL', 'TEST6 reading skill', 961, false, true, 0, '{}') returning id into v_k6;
  insert into public.skills (subject_id, code, name, sequence, is_system, active, depth, ancestor_ids)
  values (v_subject, 'TEST6.WRITE.SKILL', 'TEST6 writing skill', 962, false, true, 0, '{}') returning id into v_k3;

  perform t.login('11111111-1111-4111-8111-000000000004');
  insert into public.skill_standards (skill_id, standard_id, relation, provenance, status, approved_by, approved_at)
  values (v_k5, v_s5, 'exact', 'nestra_reviewed', 'approved', auth.uid(), now()),
         (v_k6, v_s6, 'exact', 'nestra_reviewed', 'approved', auth.uid(), now()),
         (v_k3, v_s3, 'exact', 'nestra_reviewed', 'approved', auth.uid(), now());
  perform t.logout();

  perform t.login('11111111-1111-4111-8111-000000000001');
  perform public.confirm_skill_evidence(p_student => '44444444-4444-4444-8444-00000000000d',
                                        p_skill => v_k5, p_note => 'maths');
  perform public.confirm_skill_evidence(p_student => '44444444-4444-4444-8444-00000000000d',
                                        p_skill => v_k6, p_note => 'reading');
  perform public.confirm_skill_evidence(p_student => '44444444-4444-4444-8444-00000000000d',
                                        p_skill => v_k3, p_note => 'writing');

  select string_agg(distinct s.normalized_grade, ',' order by s.normalized_grade) into v_grades
    from public.learning_evidence e
    join public.skill_standards ss on ss.skill_id = e.skill_id and ss.status = 'approved'
    join public.standards s on s.id = ss.standard_id
   where e.student_id = '44444444-4444-4444-8444-00000000000d'
     and s.normalized_grade is not null;

  perform t.assert_eq(v_grades, '3,5,6',
    '8a. one child holds evidence against three different grade references at once');
  perform t.logout();

  -- And nothing anywhere derived a single grade, a status, or a flag from that.
  perform t.assert_eq(
    (select count(*)::int from information_schema.columns
      where table_schema = 'public'
        and column_name in ('instructional_grade', 'overall_grade_level', 'is_behind',
                            'is_ahead', 'grade_status', 'remediation_required')), 0,
    '8b. there is no column anywhere that could hold behind/ahead/overall grade');
end $$;

-- =============================================================================
-- 9. Global reference data is not a route around student authorization
-- =============================================================================

do $$
declare v_std uuid;
begin
  select id into v_std from public.standards where code = 'TEST6.MATH.5.NS.001';

  perform t.login('11111111-1111-4111-8111-000000000003');   -- Diego, another family
  perform t.assert(
    (select count(*)::int from public.standards where id = v_std) = 1,
    '9a. a standard is global reference data and Diego can read it');
  perform t.assert_eq(
    (select count(*)::int
       from public.learning_evidence e
       join public.skill_standards ss on ss.skill_id = e.skill_id
      where ss.standard_id = v_std), 0,
    '9b. but it is not a route to another family''s evidence');
  perform t.assert_eq(
    (select count(*)::int from public.standards_staged_records), 0,
    '9c. and staging rows are invisible to him entirely');
  perform t.logout();
end $$;

-- =============================================================================
-- 9b. The source-of-truth rule: only the standards publication may publish
-- =============================================================================
-- A parent guide, a progression document and a vendor correlation spreadsheet
-- can all be published by a department of education, and all three are easier
-- to parse than the standards themselves. Authority is not enough; the kind of
-- document has to be right too.

do $$
declare
  v_src uuid; v_fw uuid; v_ver uuid; v_bid uuid; v_row uuid; v_err text; k text;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_fw from public.standards_frameworks where code = 'TEST6.AUTH';
  select id into v_ver from public.standards_framework_versions
   where framework_id = v_fw and version_label = 'v1';

  foreach k in array array['parent_guide','instructional_guide','progression_document',
                           'assessment_blueprint','correlation_spreadsheet','third_party_export',
                           'other_reference'] loop
    insert into public.standards_sources (authority, authority_name, artifact_name,
                                          detected_format, sha256, byte_size, artifact_kind)
    values ('state_education_agency', 'TEST6 Authority', 'TEST6-' || k || '.pdf', 'pdf',
            md5(k) || md5(k || 'x'), 1024, k::app.source_artifact_kind)
    returning id into v_src;

    v_bid := ((public.open_standards_import(v_src, 'synthetic-test', '1.0.0', v_ver)) ->> 'batch_id')::uuid;
    v_row := public.stage_standard_record(v_bid, 1, 'staged', 'TEST6.EASY.1',
      'A benchmark taken from an easier document.', '4', 'FR', 'Fractions', 'en', '{}'::jsonb,
      'TEST6.EASY.1', '4', 'mathematics', 'benchmark');
    perform public.review_staged_record(v_row, 'approved');

    begin
      perform public.publish_standards_batch(v_bid);
      v_err := 'NO ERROR';
    exception when others then v_err := sqlstate;
    end;
    perform t.assert_eq(v_err, '23514',
      '9d. a ' || k || ' cannot publish canonical standards, however authoritative its publisher');
  end loop;

  perform t.assert_eq(
    (select count(*)::int from public.standards where code = 'TEST6.EASY.1'), 0,
    '9e. and none of those seven attempts published anything');
  perform t.logout();
end $$;

-- Where a benchmark was found in the artifact travels with it.
do $$
declare v_bid uuid; v_row uuid; v_src uuid; v_fw uuid; v_ver uuid;
begin
  perform t.login('11111111-1111-4111-8111-000000000004');
  select id into v_fw from public.standards_frameworks where code = 'TEST6.AUTH';
  select id into v_ver from public.standards_framework_versions
   where framework_id = v_fw and version_label = 'v1';
  insert into public.standards_sources (authority, authority_name, artifact_name,
                                        detected_format, sha256, byte_size, artifact_kind)
  values ('state_education_agency', 'TEST6 Authority', 'TEST6-canonical.pdf', 'pdf',
          md5('canonical') || md5('canonical2'), 4096, 'canonical_standards_publication')
  returning id into v_src;
  v_bid := ((public.open_standards_import(v_src, 'florida-best-mathematics', '2.0.0', v_ver)) ->> 'batch_id')::uuid;
  v_row := public.stage_standard_record(v_bid, 1, 'staged', 'TEST6.PAGE.1',
    'A benchmark whose page we recorded.', '4', 'FR', 'Fractions', 'en', '{}'::jsonb,
    'TEST6.PAGE.1', '4', 'mathematics', 'benchmark');
  update public.standards_staged_records set source_page = 41, source_locator = 'p41:12'
   where id = v_row;
  perform public.review_staged_record(v_row, 'approved');
  perform public.publish_standards_batch(v_bid);

  perform t.assert_eq(
    (select source_locator from public.standards_staged_records where id = v_row), 'p41:12',
    '9f. a staged row records where in the artifact it was read from');
  perform t.assert_eq(
    (select count(*)::int from public.standards where code = 'TEST6.PAGE.1'), 1,
    '9g. and the canonical standards publication does publish');
  perform t.logout();
end $$;

rollback;

-- =============================================================================
-- 10. Nothing escaped
-- =============================================================================
select t.assert_eq((select count(*)::int from public.standards), 0,
  '10a. the standards catalogue still ships empty');
select t.assert_eq((select count(*)::int from public.skills where code like 'TEST6%'), 0,
  '10b. no fixture skill survived');
select t.assert_eq((select count(*)::int from public.standards_frameworks where code like 'TEST6%'), 0,
  '10c. no fixture framework survived');
select t.assert_eq((select count(*)::int from public.standards_frameworks), 3,
  '10d. the three seeded frameworks are exactly as 0070 left them');
select t.assert_eq((select count(*)::int from public.user_permissions
                     where permission = 'standards.administer'), 0,
  '10e. and the fixture capability grant is gone');
