-- =============================================================================
-- 0070  STEP 5 - a small, coherent seed
-- =============================================================================
-- DELIBERATELY TINY. Five fraction skills and one prerequisite chain, plus the
-- Nestra provider row and a handful of known-provider NAMES.
--
-- Thousands of generated skills would make the Skills page look impressive and
-- would be worth nothing: nothing could be mapped to them consistently, no
-- prerequisite edge between them would have been thought about, and the first
-- real curriculum import would have to reconcile against invented vocabulary.
-- A small graph that is actually correct is the useful thing to have now.
--
-- THE STANDARDS CROSSWALK SHIPS EMPTY. Not because it is unimportant - because
-- an invented standard code in a compliance product is worse than no code at
-- all. A parent may repeat it to a district. The framework rows below carry
-- only names and official URLs, which are facts; not one standard code is
-- asserted here.
-- =============================================================================

-- --- the fraction chain ------------------------------------------------------
-- Chosen because it is the example in the STEP 5 brief and because it is a real
-- dependency chain that any elementary teacher would recognise.

do $$
declare
  v_math   uuid;
  v_part   uuid;  -- fraction as part of a whole
  v_repr   uuid;  -- recognize equivalent representations
  v_ident  uuid;  -- identify equivalent fractions
  v_gen    uuid;  -- generate equivalent fractions
  v_cmp    uuid;  -- compare fractions
begin
  select id into v_math from public.subjects
   where slug = 'math' and is_system order by created_at limit 1;
  if v_math is null then
    select id into v_math from public.subjects where is_system order by created_at limit 1;
  end if;
  if v_math is null then
    raise notice 'no system subject to hang the seed skills from; skipping';
    return;
  end if;

  insert into public.skills (subject_id, code, name, description, grade_band,
                             framework, sequence, is_system, active, depth, ancestor_ids)
  values
    (v_math, 'NST.FR.1', 'Understand a fraction as part of a whole',
     'Reads and writes a fraction for a shaded region or a set.', '3-4', 'internal', 10, true, true, 0, '{}'),
    (v_math, 'NST.FR.2', 'Recognize equivalent representations of a fraction',
     'Sees that the same quantity can be drawn or written more than one way.', '3-4', 'internal', 20, true, true, 0, '{}'),
    (v_math, 'NST.FR.3', 'Identify equivalent fractions',
     'Decides whether two given fractions name the same number.', '4', 'internal', 30, true, true, 0, '{}'),
    (v_math, 'NST.FR.4', 'Generate equivalent fractions',
     'Produces an equivalent fraction for a given fraction.', '4', 'internal', 40, true, true, 0, '{}'),
    (v_math, 'NST.FR.5', 'Compare fractions',
     'Orders fractions with unlike numerators and denominators.', '4-5', 'internal', 50, true, true, 0, '{}')
  on conflict do nothing;

  select id into v_part  from public.skills where code = 'NST.FR.1';
  select id into v_repr  from public.skills where code = 'NST.FR.2';
  select id into v_ident from public.skills where code = 'NST.FR.3';
  select id into v_gen   from public.skills where code = 'NST.FR.4';
  select id into v_cmp   from public.skills where code = 'NST.FR.5';

  -- part of a whole -> equivalent representations -> identify -> generate -> compare
  insert into public.skill_prerequisites (skill_id, prerequisite_skill_id, strength, source_type)
  values (v_repr,  v_part,  'required', 'manual'),
         (v_ident, v_repr,  'required', 'manual'),
         (v_gen,   v_ident, 'required', 'manual'),
         (v_cmp,   v_ident, 'required', 'manual'),
         (v_cmp,   v_gen,   'recommended', 'manual')
  on conflict do nothing;

  -- The words other people use for the same thing. This is what lets a
  -- curriculum that says "Equal Fractions" map onto NST.FR.3 without a second
  -- canonical skill being invented for it.
  insert into public.skill_aliases (skill_id, alias, source) values
    (v_ident, 'equivalent fractions', 'nestra'),
    (v_ident, 'equal fractions', 'common usage'),
    (v_gen,   'making equivalent fractions', 'common usage'),
    (v_cmp,   'comparing fractions', 'common usage')
  on conflict do nothing;
end $$;

-- --- standards frameworks: names and URLs, no codes -------------------------

insert into public.standards_frameworks (code, name, jurisdiction, version_year, source_url)
values
  ('FL_BEST', 'Florida B.E.S.T. Standards', 'FL', 2020,
   'https://www.fldoe.org/academics/standards/'),
  ('CCSS', 'Common Core State Standards', 'US', 2010,
   'https://www.thecorestandards.org/'),
  ('NGSS', 'Next Generation Science Standards', 'US', 2013,
   'https://www.nextgenscience.org/')
on conflict (code) do nothing;

comment on table public.standards is
  'Ships EMPTY on purpose. Codes are added only when they can be sourced from '
  'the framework''s own publication. A fabricated code is worse than a missing '
  'one because a family may repeat it to a district.';

-- --- providers ---------------------------------------------------------------
-- Nestra is a row here, using the same schema as everyone else. That is the
-- architecture rule, made literal.
--
-- The rest are NAMES ONLY, so a parent can pick "Teaching Textbooks" from a
-- list instead of typing it. Every one of them carries exactly the capabilities
-- that are actually true today - external_link and manual_completion - and
-- nothing here should be read as a partnership, an integration, or a
-- commercial relationship of any kind.

insert into public.curriculum_providers (slug, name, website_url, is_first_party, scope, capabilities)
values
  ('nestra', 'Nestra Curriculum', null, true, 'catalog',
   '{external_link,deep_link,manual_completion,progress_sync}'),
  ('other', 'Another curriculum', null, false, 'catalog',
   '{external_link,manual_completion}'),
  ('khan-academy', 'Khan Academy', 'https://www.khanacademy.org/', false, 'catalog',
   '{external_link,manual_completion}'),
  ('teaching-textbooks', 'Teaching Textbooks', 'https://www.teachingtextbooks.com/', false, 'catalog',
   '{external_link,manual_completion}'),
  ('abeka', 'Abeka', 'https://www.abeka.com/', false, 'catalog',
   '{external_link,manual_completion}'),
  ('logic-of-english', 'Logic of English', 'https://www.logicofenglish.com/', false, 'catalog',
   '{external_link,manual_completion}'),
  ('beast-academy', 'Beast Academy', 'https://beastacademy.com/', false, 'catalog',
   '{external_link,manual_completion}'),
  ('the-good-and-the-beautiful', 'The Good and the Beautiful',
   'https://www.goodandbeautiful.com/', false, 'catalog',
   '{external_link,manual_completion}')
on conflict (slug) do nothing;

comment on table public.curriculum_providers is
  'A row is a NAME a family may pick from a list, so they need not type it. It '
  'is not a partnership, an integration or an agreement. What is technically '
  'possible lives in capabilities; what is actually happening for a given family '
  'lives in the enrollment''s integration_mode, and only `integrated` may claim '
  'a live integration. Nothing in STEP 5 is integrated.';

select app.assert_schema_invariants();
