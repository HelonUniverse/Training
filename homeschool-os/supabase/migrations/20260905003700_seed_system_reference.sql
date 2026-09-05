-- =============================================================================
-- 0037  System reference data (production-safe, idempotent)
-- =============================================================================
-- This is REFERENCE data, not sample data: the global subject catalogue, a
-- starter skill taxonomy, and the Florida compliance pack scaffold.
--
-- The Florida pack ships as status='draft' with every rule active=false and
-- obligation_level='unknown'. A named human must verify each rule against its
-- authoritative source and set last_verified_on/verified_by before it can be
-- activated - the rules_verification_ck constraint enforces that. We ship the
-- mechanism; a person ships the legal content.
--
-- Development fixtures live in supabase/seed/dev/ and never run in production.
-- =============================================================================

-- --- global subject catalogue ------------------------------------------------
insert into public.subjects (id, name, slug, category, color, sequence, is_system) values
  ('00000000-0000-4000-8000-000000000101', 'Mathematics',        'math',            'core',       '#3B6FE0', 10, true),
  ('00000000-0000-4000-8000-000000000102', 'Reading',            'reading',         'core',       '#2F9E7E', 20, true),
  ('00000000-0000-4000-8000-000000000103', 'Writing',            'writing',         'core',       '#7A5AF8', 30, true),
  ('00000000-0000-4000-8000-000000000104', 'Language Arts',      'language-arts',   'core',       '#5B8DEF', 40, true),
  ('00000000-0000-4000-8000-000000000105', 'Science',            'science',         'core',       '#12A5A5', 50, true),
  ('00000000-0000-4000-8000-000000000106', 'Social Studies',     'social-studies',  'core',       '#C97A2B', 60, true),
  ('00000000-0000-4000-8000-000000000107', 'Art',                'art',             'enrichment', '#E0619B', 70, true),
  ('00000000-0000-4000-8000-000000000108', 'Music',              'music',           'enrichment', '#8E63C6', 80, true),
  ('00000000-0000-4000-8000-000000000109', 'Physical Education', 'physical-education','enrichment','#4FA83D', 90, true),
  ('00000000-0000-4000-8000-00000000010a', 'Health',             'health',          'enrichment', '#D2564B', 100, true),
  ('00000000-0000-4000-8000-00000000010b', 'World Languages',    'world-languages', 'enrichment', '#2C8ABF', 110, true),
  ('00000000-0000-4000-8000-00000000010c', 'Technology',         'technology',      'enrichment', '#546B8C', 120, true),
  ('00000000-0000-4000-8000-00000000010d', 'Life Skills',        'life-skills',     'enrichment', '#8A8F5B', 130, true)
on conflict (id) do nothing;

-- Spanish labels for the global catalogue (es-US is a launch locale).
insert into public.content_translations (record_type, record_id, field, locale, value) values
  ('subjects', '00000000-0000-4000-8000-000000000101', 'name', 'es-US', 'Matemáticas'),
  ('subjects', '00000000-0000-4000-8000-000000000102', 'name', 'es-US', 'Lectura'),
  ('subjects', '00000000-0000-4000-8000-000000000103', 'name', 'es-US', 'Escritura'),
  ('subjects', '00000000-0000-4000-8000-000000000104', 'name', 'es-US', 'Artes del Lenguaje'),
  ('subjects', '00000000-0000-4000-8000-000000000105', 'name', 'es-US', 'Ciencias'),
  ('subjects', '00000000-0000-4000-8000-000000000106', 'name', 'es-US', 'Estudios Sociales'),
  ('subjects', '00000000-0000-4000-8000-000000000107', 'name', 'es-US', 'Arte'),
  ('subjects', '00000000-0000-4000-8000-000000000108', 'name', 'es-US', 'Música'),
  ('subjects', '00000000-0000-4000-8000-000000000109', 'name', 'es-US', 'Educación Física'),
  ('subjects', '00000000-0000-4000-8000-00000000010a', 'name', 'es-US', 'Salud'),
  ('subjects', '00000000-0000-4000-8000-00000000010b', 'name', 'es-US', 'Idiomas del Mundo'),
  ('subjects', '00000000-0000-4000-8000-00000000010c', 'name', 'es-US', 'Tecnología'),
  ('subjects', '00000000-0000-4000-8000-00000000010d', 'name', 'es-US', 'Habilidades para la Vida')
on conflict (record_type, record_id, field, locale) do nothing;

-- --- starter skill taxonomy --------------------------------------------------
-- Deliberately small: enough to make the skill map real on day one, structured
-- so a full standards framework can be mapped in later via skills.framework_ref.
insert into public.skills (id, subject_id, parent_skill_id, code, name, grade_band, sequence, is_system) values
  -- Mathematics
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', null, 'MATH.NUM',  'Number Sense',              'K-5', 10, true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'MATH.NUM.ADD',  'Addition',        'K-3', 10, true),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'MATH.NUM.SUB',  'Subtraction',     'K-3', 20, true),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'MATH.NUM.MUL',  'Multiplication',  '2-5', 30, true),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'MATH.NUM.DIV',  'Division',        '3-6', 40, true),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'MATH.NUM.FRAC', 'Fractions',       '3-6', 50, true),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000101', null, 'MATH.GEO',  'Geometry',                  '1-8', 20, true),
  ('00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000101', null, 'MATH.MEA',  'Measurement and Data',      'K-6', 30, true),
  ('00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000101', null, 'MATH.WPB',  'Word Problems',             '1-8', 40, true),
  -- Reading
  ('00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000102', null, 'READ.PHO',  'Phonics and Decoding',      'K-3', 10, true),
  ('00000000-0000-4000-8000-000000000222', '00000000-0000-4000-8000-000000000102', null, 'READ.FLU',  'Fluency',                   'K-5', 20, true),
  ('00000000-0000-4000-8000-000000000223', '00000000-0000-4000-8000-000000000102', null, 'READ.COM',  'Comprehension',             'K-8', 30, true),
  ('00000000-0000-4000-8000-000000000224', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000223', 'READ.COM.INF', 'Inference',  '2-8', 10, true),
  ('00000000-0000-4000-8000-000000000225', '00000000-0000-4000-8000-000000000102', null, 'READ.VOC',  'Vocabulary',                'K-8', 40, true),
  -- Writing
  ('00000000-0000-4000-8000-000000000241', '00000000-0000-4000-8000-000000000103', null, 'WRIT.GRA',  'Grammar and Conventions',   'K-8', 10, true),
  ('00000000-0000-4000-8000-000000000242', '00000000-0000-4000-8000-000000000103', null, 'WRIT.ORG',  'Organization',              '1-8', 20, true),
  ('00000000-0000-4000-8000-000000000243', '00000000-0000-4000-8000-000000000103', null, 'WRIT.EXP',  'Expression and Voice',      '2-8', 30, true),
  -- Science
  ('00000000-0000-4000-8000-000000000261', '00000000-0000-4000-8000-000000000105', null, 'SCI.OBS',   'Scientific Observation',    'K-8', 10, true),
  ('00000000-0000-4000-8000-000000000262', '00000000-0000-4000-8000-000000000105', null, 'SCI.EAR',   'Earth Science',             'K-8', 20, true),
  ('00000000-0000-4000-8000-000000000263', '00000000-0000-4000-8000-000000000105', null, 'SCI.LIF',   'Life Science',              'K-8', 30, true),
  ('00000000-0000-4000-8000-000000000264', '00000000-0000-4000-8000-000000000105', null, 'SCI.PHY',   'Physical Science',          'K-8', 40, true)
on conflict (id) do nothing;

-- --- Florida compliance pack scaffold (DRAFT - requires human verification) ---
insert into public.compliance_packs (id, state_code, name, version, status, locale, notes) values
  ('00000000-0000-4000-8000-000000000301', 'FL', 'Florida Home Education Pack', '2026.1', 'draft', 'en-US',
   'Scaffold only. Every rule must be verified against its authoritative source by a named person '
   'and activated individually before this pack is published. Nothing here is legal advice.')
on conflict (id) do nothing;

insert into public.compliance_rules (
  id, pack_id, state_code, code, category, title, requirement_text, obligation_level,
  applies_to, trigger, due_date_logic, required_fields, satisfied_by, reminder_schedule, retention,
  submission_method, submission_destination, authoritative_source_url, authority_citation,
  active, sequence, admin_notes) values

  ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000301', 'FL',
   'FL.NOI', 'registration', 'Notice of Intent to establish a home education program',
   'PLACEHOLDER - to be transcribed from the authoritative source during verification.',
   'unknown',
   '{"programTypes":["independent"]}'::jsonb,
   '{"type":"homeschool_start","offset":{"days":0}}'::jsonb,
   '{"base":"trigger_date","offset":{"days":30},"recurrence":"once"}'::jsonb,
   '[{"key":"student_legal_name","type":"text","required":true},
     {"key":"student_date_of_birth","type":"date","required":true},
     {"key":"home_address","type":"address","required":true},
     {"key":"guardian_signature","type":"signature","required":true}]'::jsonb,
   '[{"kind":"document_submission","ruleCode":"FL.NOI","status":"sent"}]'::jsonb,
   '[{"days":30},{"days":7},{"days":0}]'::jsonb,
   '{}'::jsonb,
   'email', '{"type":"district_contact"}'::jsonb,
   'https://www.fldoe.org/schools/school-choice/other-school-choice-options/home-edu/',
   'Verification pending - record the controlling citation here during review.',
   false, 10,
   'Do not activate until requirement text, timing and destination are verified against the source.'),

  ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000301', 'FL',
   'FL.ANNUAL_EVAL', 'evaluation', 'Annual educational evaluation',
   'PLACEHOLDER - to be transcribed from the authoritative source during verification.',
   'unknown',
   '{"programTypes":["independent"]}'::jsonb,
   '{"type":"prior_rule_satisfied","ruleCode":"FL.NOI"}'::jsonb,
   '{"base":"anniversary_of","anniversaryOf":"noi_submitted","offset":{"years":1},
     "windowOpensOffset":{"days":-90},"recurrence":"annual"}'::jsonb,
   '[{"key":"evaluation_date","type":"date","required":true},
     {"key":"evaluator_name","type":"text","required":true},
     {"key":"evaluator_credentials","type":"text","required":true},
     {"key":"evaluation_method","type":"select","required":true},
     {"key":"evaluator_signature","type":"signature","required":true}]'::jsonb,
   '[{"kind":"evaluation","status":"accepted_by_parent","withinYears":1}]'::jsonb,
   '[{"days":90},{"days":30},{"days":7},{"days":0}]'::jsonb,
   '{}'::jsonb,
   'email', '{"type":"district_contact"}'::jsonb,
   'https://www.fldoe.org/schools/school-choice/other-school-choice-options/home-edu/',
   'Verification pending - record the controlling citation here during review.',
   false, 20,
   'Timing, acceptable evaluator credentials and submission destination all require verification.'),

  ('00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000301', 'FL',
   'FL.PORTFOLIO', 'portfolio', 'Home education portfolio of records and materials',
   'PLACEHOLDER - to be transcribed from the authoritative source during verification.',
   'unknown',
   '{"programTypes":["independent"]}'::jsonb,
   '{"type":"homeschool_start"}'::jsonb,
   '{"base":"academic_year_end","recurrence":"annual"}'::jsonb,
   '[]'::jsonb,
   '[{"kind":"portfolio_activity","minItems":1,"withinDays":30}]'::jsonb,
   '[{"days":30},{"days":14}]'::jsonb,
   '{"years":2,"note":"Retention period requires verification."}'::jsonb,
   'none', '{}'::jsonb,
   'https://www.fldoe.org/schools/school-choice/other-school-choice-options/home-edu/',
   'Verification pending - record the controlling citation here during review.',
   false, 30,
   'Drives portfolio inactivity nudges and the retention hold on documents.'),

  ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000301', 'FL',
   'FL.TERMINATION', 'termination', 'Notice of termination of a home education program',
   'PLACEHOLDER - to be transcribed from the authoritative source during verification.',
   'unknown',
   '{"programTypes":["independent"]}'::jsonb,
   '{"type":"termination"}'::jsonb,
   '{"base":"trigger_date","offset":{"days":30},"recurrence":"once"}'::jsonb,
   '[{"key":"termination_date","type":"date","required":true},
     {"key":"guardian_signature","type":"signature","required":true}]'::jsonb,
   '[{"kind":"document_submission","ruleCode":"FL.TERMINATION","status":"sent"}]'::jsonb,
   '[{"days":14},{"days":0}]'::jsonb,
   '{}'::jsonb,
   'email', '{"type":"district_contact"}'::jsonb,
   'https://www.fldoe.org/schools/school-choice/other-school-choice-options/home-edu/',
   'Verification pending - record the controlling citation here during review.',
   false, 40,
   'Only reachable from the explicit "end home education program" workflow.')
on conflict (id) do nothing;

-- District contact scaffold. Rows are created unverified (last_verified_on null)
-- so the submission workflow shows "needs verification" until a person confirms
-- the address. Populating all 67 counties is a data task, not a code task.
insert into public.district_contacts (state_code, county, district_name, office_name, active, notes) values
  ('FL', 'Osceola', 'School District of Osceola County', 'Home Education Office', true,
   'Scaffold row - contact details require verification before any filing is sent.'),
  ('FL', 'Orange',  'Orange County Public Schools',      'Home Education Office', true,
   'Scaffold row - contact details require verification before any filing is sent.'),
  ('FL', 'Polk',    'Polk County Public Schools',        'Home Education Office', true,
   'Scaffold row - contact details require verification before any filing is sent.')
on conflict (state_code, county, office_name) do nothing;
