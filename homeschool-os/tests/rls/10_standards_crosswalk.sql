-- =============================================================================
-- STEP 6 pre-correction - a standard is never a skill's identity
-- =============================================================================
-- The governing rule: a standard can disappear tomorrow and the child's
-- learning history must still make sense.
--
-- Everything here is one skill's life story, told in the order it actually
-- happens: born with no standard at all, mapped to Florida B.E.S.T., mapped to
-- a second framework at the same time, one mapping removed, a framework version
-- superseded. The skill's id and its canonical identity are re-checked after
-- every one of those, because "the skill did not move" is the whole claim.
--
-- The frameworks used are the ones 0070 seeds by NAME and URL only. No standard
-- CODE in this file is presented as real: the two used below are explicitly
-- test fixtures, created and destroyed inside the transaction, and the crosswalk
-- still ships empty afterwards. An invented code that escaped into the product
-- is worse than no code, because a parent may repeat it to a district.
-- =============================================================================

begin;

-- =============================================================================
-- 1. The legacy representation is gone, and cannot come back
-- =============================================================================
select t.assert_eq(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name = 'skills'
      and column_name in ('framework', 'framework_ref')), 0,
  '1a. skills no longer carries an external framework identity');

select t.assert_eq(
  (select count(*)::int from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'app' and t.typname = 'skill_framework'), 0,
  '1b. and the enum that made it expressible is gone too');

select t.assert_eq(
  (select count(*)::int from pg_indexes
    where schemaname = 'public' and tablename = 'skills' and indexdef ilike '%framework%'), 0,
  '1c. the unique index that enforced one-skill-per-standard-code is gone');

-- The invariant refuses the column coming back under its old name. Proven by
-- adding it, calling the invariant, and rolling back - a guard nobody has
-- watched fail is not a guard.
do $$
declare v_raised boolean := false;
begin
  alter table public.skills add column framework_ref text;
  begin
    perform app.assert_schema_invariants();
  exception when others then v_raised := true;
  end;
  alter table public.skills drop column framework_ref;
  perform t.assert(v_raised,
    '1d. the schema invariant refuses a standards field reappearing on skills');
end $$;

-- The invariant returns void, so there is nothing to assert ON: if it raises,
-- this file stops here. Reaching the next section IS the proof.
select app.assert_schema_invariants() as "1e. and the invariant passes again once the column is removed";

-- =============================================================================
-- 2. A skill is born with no standard, and is completely usable
-- =============================================================================
-- Requirement 7: zero mappings is a valid, permanent state, not a gap to fill.
do $$
declare
  v_subject uuid;
  v_skill   uuid;
  v_prereq  uuid;
  v_carla   uuid;
begin
  select user_id into v_carla from public.student_guardians
   where student_id = '44444444-4444-4444-8444-00000000000d'
     and access_level = 'full' and revoked_at is null limit 1;
  select subject_id into v_subject from public.skills where code = 'NST.FR.1';
  select id into v_prereq from public.skills where code = 'NST.FR.5';

  insert into public.skills (subject_id, code, name, description, grade_band,
                             sequence, is_system, active, depth, ancestor_ids)
  values (v_subject, 'TEST.XW.1', 'Reason about a fraction as a quantity',
          'Exists to prove a skill needs no standard.', '4-5', 900, false, true, 0, '{}')
  returning id into v_skill;

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill), 0,
    '2a. a new skill has no standards mapping at all');

  -- Requirement: the graph, evidence and future readiness relationships all work
  -- with zero mappings. This is the part that matters - if any of it needed a
  -- standard, "standards are optional" would be false.
  insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
  values (v_skill, v_prereq);

  perform t.assert_eq(
    (select count(*)::int from public.skill_prerequisite_closure(v_skill)), 5,
    '2b. the prerequisite graph walks INTO an unmapped skill normally');

  -- evidence_has_a_source: a piece of evidence must point at SOMETHING. A note
  -- is the smallest honest thing to point at, and the right one here.
  insert into public.learning_evidence (student_id, skill_id, family_id, relation,
                                        source_type, note, confirmed_by, confirmed_at)
  values ('44444444-4444-4444-8444-00000000000d', v_skill,
          '22222222-2222-4222-8222-00000000000a', 'demonstrates',
          'parent', 'worked through this at the kitchen table', v_carla, now());

  perform t.assert_eq(
    (select count(*)::int from public.learning_evidence where skill_id = v_skill), 1,
    '2c. and evidence attaches to an unmapped skill normally');

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill), 0,
    '2d. none of which created a standards mapping as a side effect');
end $$;

-- =============================================================================
-- 3. Many mappings, across frameworks, jurisdictions, versions and grades
-- =============================================================================
-- Requirements 8 and 9. The old model could not express this at all: a unique
-- index on (framework, framework_ref) meant one code per skill, so the same
-- learning had to exist twice to carry two frameworks.
do $$
declare
  v_skill    uuid;
  v_fw_a     uuid;   -- fixture frameworks, created and destroyed by this file
  v_fw_b     uuid;
  v_std_best uuid;
  v_std_other uuid;
  v_id_before uuid;
  v_name_before text;
begin
  select id, name into v_id_before, v_name_before
    from public.skills where code = 'TEST.XW.1';
  v_skill := v_id_before;

  -- Section 6 proves the cascade by DELETING these frameworks, so this file
  -- creates its own rather than borrowing the seeded FL_BEST / CCSS / NGSS
  -- rows. The transaction rolls back here, but a test that only cleans up
  -- because of a rollback is a test that destroys real data the first time
  -- someone runs it somewhere without one. (It did: on the managed project.)
  insert into public.standards_frameworks (code, name, jurisdiction, version_year, source_url)
  values ('TEST.FW.A', 'Test Framework A', 'FL', 2020, 'https://example.test/fixture')
  returning id into v_fw_a;
  insert into public.standards_frameworks (code, name, jurisdiction, version_year, source_url)
  values ('TEST.FW.B', 'Test Framework B', 'US', 2010, 'https://example.test/fixture')
  returning id into v_fw_b;
  perform t.assert(v_fw_a is not null and v_fw_b is not null,
    '3a. two fixture frameworks exist to map against');

  insert into public.standards (framework_id, code, statement, grade_band, source_url)
  values (v_fw_a, 'TEST-BEST-4.FR.1', 'Test fixture, not a real code.', '4',
          'https://example.test/fixture')
  returning id into v_std_best;

  -- Deliberately a DIFFERENT grade reference on the second framework:
  -- requirement 9, the same skill mapping to standards commonly associated with
  -- different grade contexts without the skill changing.
  insert into public.standards (framework_id, code, statement, grade_band, source_url)
  values (v_fw_b, 'TEST-OTHER-6.NS.2', 'Test fixture, not a real code.', '6',
          'https://example.test/fixture')
  returning id into v_std_other;

  insert into public.skill_standards (skill_id, standard_id, relation, source_type, source_url)
  values (v_skill, v_std_best,  'exact',    'manual', 'https://example.test/fixture'),
         (v_skill, v_std_other, 'narrower', 'manual', 'https://example.test/fixture');

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill and active), 2,
    '3b. one skill carries two frameworks at once');

  perform t.assert_eq(
    (select count(distinct s.grade_band)::int
       from public.skill_standards ss join public.standards s on s.id = ss.standard_id
      where ss.skill_id = v_skill), 2,
    '3c. mapped to standards from two different grade references');

  perform t.assert_eq((select id from public.skills where code = 'TEST.XW.1'), v_id_before,
    '3d. and the skill id did not change');
  perform t.assert_eq((select name from public.skills where code = 'TEST.XW.1'), v_name_before,
    '3e. nor did its canonical identity');
end $$;

-- =============================================================================
-- 4. Remove one mapping. The skill, its graph and its evidence are untouched.
-- =============================================================================
do $$
declare v_skill uuid; v_id_before uuid; v_name_before text;
begin
  select id, name into v_id_before, v_name_before from public.skills where code = 'TEST.XW.1';
  v_skill := v_id_before;

  delete from public.skill_standards ss
   using public.standards s
   where ss.standard_id = s.id and ss.skill_id = v_skill and s.code = 'TEST-OTHER-6.NS.2';

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill), 1,
    '4a. removing a mapping removes exactly that mapping');
  perform t.assert_eq((select id from public.skills where code = 'TEST.XW.1'), v_id_before,
    '4b. the skill id is unchanged by losing a standard');
  perform t.assert_eq((select name from public.skills where code = 'TEST.XW.1'), v_name_before,
    '4c. and so is its canonical identity');
  perform t.assert_eq(
    (select count(*)::int from public.skill_prerequisite_closure(v_skill)), 5,
    '4d. the prerequisite graph is unchanged');
  perform t.assert_eq(
    (select count(*)::int from public.learning_evidence where skill_id = v_skill), 1,
    '4e. and the child''s evidence is still there');
end $$;

-- =============================================================================
-- 5. Supersede a framework version
-- =============================================================================
-- Requirement 10, and the governing rule in its sharpest form. Florida revises
-- B.E.S.T.; the new edition is a new framework row with its own version_year,
-- the old mapping is deactivated rather than deleted so the history of what we
-- once claimed survives, and the SKILL is not rewritten.
do $$
declare
  v_skill uuid; v_id_before uuid; v_name_before text;
  v_new_fw uuid; v_new_std uuid; v_old_fw uuid;
begin
  select id, name into v_id_before, v_name_before from public.skills where code = 'TEST.XW.1';
  v_skill := v_id_before;
  select s.framework_id into v_old_fw
    from public.skill_standards ss join public.standards s on s.id = ss.standard_id
   where ss.skill_id = v_skill limit 1;

  insert into public.standards_frameworks (code, name, jurisdiction, version_year, source_url)
  values ('TEST.FW.V2', 'Test Framework, revised edition', 'FL', 2030,
          'https://example.test/fixture')
  returning id into v_new_fw;

  insert into public.standards (framework_id, code, statement, grade_band, source_url)
  values (v_new_fw, 'TEST-BEST-4.FR.1', 'Test fixture, revised edition.', '4',
          'https://example.test/fixture')
  returning id into v_new_std;

  update public.skill_standards ss set active = false
    from public.standards s
   where ss.standard_id = s.id and ss.skill_id = v_skill and s.framework_id = v_old_fw;

  insert into public.skill_standards (skill_id, standard_id, relation, source_type, source_url)
  values (v_skill, v_new_std, 'exact', 'manual', 'https://example.test/fixture');

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill and active), 1,
    '5a. exactly one mapping is live after the supersession');
  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill and not active), 1,
    '5b. and the superseded one is kept, deactivated, not erased');
  perform t.assert_eq(
    (select s.version_year::int from public.skill_standards ss
       join public.standards s2 on s2.id = ss.standard_id
       join public.standards_frameworks s on s.id = s2.framework_id
      where ss.skill_id = v_skill and ss.active), 2030,
    '5c. the live mapping points at the new edition');
  perform t.assert_eq((select id from public.skills where code = 'TEST.XW.1'), v_id_before,
    '5d. the skill id survived a framework revision');
  perform t.assert_eq((select name from public.skills where code = 'TEST.XW.1'), v_name_before,
    '5e. and so did its canonical identity');
end $$;

-- =============================================================================
-- 6. The standard disappears entirely. The learning history still makes sense.
-- =============================================================================
-- The governing rule, tested rather than asserted. Deleting a framework cascades
-- to its standards and to the crosswalk rows - and must reach no further.
do $$
declare v_skill uuid; v_id_before uuid; v_name_before text;
begin
  select id, name into v_id_before, v_name_before from public.skills where code = 'TEST.XW.1';
  v_skill := v_id_before;

  delete from public.standards_frameworks
   where id in (select s.framework_id from public.standards s
                 join public.skill_standards ss on ss.standard_id = s.id
                where ss.skill_id = v_skill);

  perform t.assert_eq(
    (select count(*)::int from public.skill_standards where skill_id = v_skill), 0,
    '6a. every mapping vanished with the frameworks');
  perform t.assert_eq((select id from public.skills where code = 'TEST.XW.1'), v_id_before,
    '6b. the skill is still here, with the same id');
  perform t.assert_eq((select name from public.skills where code = 'TEST.XW.1'), v_name_before,
    '6c. and the same canonical identity');
  perform t.assert_eq(
    (select count(*)::int from public.skill_prerequisite_closure(v_skill)), 5,
    '6d. the prerequisite graph is intact');
  perform t.assert_eq(
    (select count(*)::int from public.learning_evidence where skill_id = v_skill), 1,
    '6e. and the child''s learning history is intact and still means what it meant');
end $$;

rollback;

-- =============================================================================
-- 7. Nothing escaped
-- =============================================================================
select t.assert_eq((select count(*)::int from public.standards), 0,
  '7a. the standards catalogue still ships empty - no test code survived');
select t.assert_eq((select count(*)::int from public.skill_standards), 0,
  '7b. and so does the crosswalk');
select t.assert_eq((select count(*)::int from public.skills where code = 'TEST.XW.1'), 0,
  '7c. and the fixture skill is gone');
select t.assert_eq((select count(*)::int from public.standards_frameworks), 3,
  '7d. the three seeded frameworks are exactly as 0070 left them');
select t.assert_eq(
  (select count(*)::int from public.standards_frameworks where code like 'TEST.%'), 0,
  '7e. and no fixture framework survived');
