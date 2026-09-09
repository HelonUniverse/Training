-- =============================================================================
-- 0081  One enum was answering three questions. Split it.
-- =============================================================================
-- `app.confidence_level` has five values:
--
--   parent_reported · teacher_observed · self_reported   → WHO observed it
--   assessment_confirmed                                 → WHO observed it
--   ai_suggested                                         → HOW the row was made
--
-- Those are three independent questions flattened onto one scale, so the schema
-- cannot express "a parent watched carefully for a week" without also implying
-- something about strength, and cannot express "strong evidence" without also
-- naming a source. It is the same mistake STEP 6 corrected by separating
-- authority, artifact kind and representation, and it has the same consequence:
-- one column quietly loses one of the meanings it is carrying.
--
--   observation authority  WHO or WHAT observed this.
--   evidence confidence    HOW STRONG the evidence is, and nothing else.
--   record provenance      HOW this row came to exist.
--
-- TWO DEFAULTS THAT ASSERT THINGS NOBODY SAID, removed here:
--
--   student_skills.confidence     default 'ai_suggested'
--       A row a PARENT inserts claims, by default, that AI suggested it.
--   assessment_results.confidence default 'assessment_confirmed'
--       Any assessment result asserts, by default, that it is confirmed.
--
-- The replacement defaults make no claim at all: `unknown` for the two axes that
-- are NOT NULL, and NULL for evidence confidence, whose vocabulary is exactly
-- three strengths and deliberately has no "unknown" member to accidentally use.
-- =============================================================================

-- --- 1. WHO observed it ------------------------------------------------------

create type app.evidence_source as enum (
  'parent',
  'teacher',
  'tutor',
  'evaluator',
  'student_self',
  'assessment_instrument',
  'provider_system',
  'portfolio_artifact',
  'diagnostic_session',
  'unknown');            -- nobody recorded it. An honest answer, not a default claim.

comment on type app.evidence_source is
  'WHO or WHAT observed this. Says nothing about how strong the evidence is '
  '(app.evidence_confidence) or how the row came to exist (app.record_provenance).';

-- --- 2. HOW STRONG the evidence is -------------------------------------------
-- Exactly three values, and no more. There is deliberately no `unknown` member:
-- a strength nobody established is NULL, so it cannot be mistaken for a weak
-- strength somebody did establish. `preliminary` is a claim; NULL is not.

create type app.evidence_confidence as enum (
  'preliminary',    -- one occasion, or a first look
  'supported',      -- more than a single instance, or a deliberate observation
  'corroborated');  -- independent occasions, or independent observers, agreeing

comment on type app.evidence_confidence is
  'HOW STRONG the evidence is, and nothing else. It must never encode who '
  'observed it, source authority, AI provenance, or the child''s skill state. A '
  'parent watching carefully across a week can reach corroborated; a single '
  'test item is preliminary. NULL means no strength was established.';

-- --- 3. HOW the row came to exist --------------------------------------------

create type app.record_provenance as enum (
  'human_entered',
  'human_confirmed_ai_proposal',
  'ai_proposed_unreviewed',   -- may never contribute to a skill state (0083)
  'document_extraction',
  'provider_import',
  'system_computed',
  'unknown');

comment on type app.record_provenance is
  'HOW this row came to exist. Anchored on the existing ai_generated / '
  'ai_suggestion_id / human_confirmed_by lineage from 0012 and 0019 rather than '
  'duplicating it: this column NAMES what those columns already imply.';

-- =============================================================================
-- Apply the three axes
-- =============================================================================
-- Nullability is a claim too. `evidence_source` and `record_provenance` are NOT
-- NULL with an explicit `unknown`, because "nobody recorded who observed this"
-- is a fact worth stating rather than an absence to be guessed at later.
-- `evidence_confidence` is NULL when no strength was established, because its
-- vocabulary is three strengths and none of them means "we don't know".

alter table public.student_skills
  add column evidence_source     app.evidence_source not null default 'unknown',
  add column evidence_confidence app.evidence_confidence,
  add column record_provenance   app.record_provenance not null default 'unknown';

alter table public.student_skill_events
  add column evidence_source     app.evidence_source not null default 'unknown',
  add column evidence_confidence app.evidence_confidence,
  add column record_provenance   app.record_provenance not null default 'unknown';

alter table public.assessment_results
  add column evidence_source     app.evidence_source not null default 'unknown',
  add column evidence_confidence app.evidence_confidence,
  add column record_provenance   app.record_provenance not null default 'unknown';

-- =============================================================================
-- Migrate what the legacy column COULD establish, and only that
-- =============================================================================
-- The old value tells us at most one of the three answers. Filling the other
-- two with something plausible would be inventing knowledge about a child, so
-- they migrate to `unknown` / NULL.
--
-- In particular NOTHING migrates into evidence_confidence. `assessment_confirmed`
-- looks like a strength and is not one: it names a source. Reading it as
-- `corroborated` would encode source authority into the strength axis, which is
-- exactly what this migration exists to stop.

update public.student_skills set evidence_source = case confidence
    when 'parent_reported'      then 'parent'
    when 'teacher_observed'     then 'teacher'
    when 'self_reported'        then 'student_self'
    when 'assessment_confirmed' then 'assessment_instrument'
    else 'unknown' end::app.evidence_source;

-- ---------------------------------------------------------------------------
-- student_skill_events is append-only, enforced by a BEFORE UPDATE trigger.
-- A backfill is an UPDATE, so the trigger blocks this migration.
--
-- THIS IS NOT A REASON TO WEAKEN THE TRIGGER. Re-expressing a fact in new
-- columns is not the same act as rewriting history: the historical claim is
-- unchanged, only the columns carrying it are. So the trigger is suspended for
-- exactly the backfill, restored immediately, and the restoration is verified
-- before the migration is allowed to finish.
--
-- Found by running the migration over synthetic rows. Against the empty tables
-- every environment actually has, the UPDATE touches nothing, the trigger never
-- fires, and this migration looks perfect right up until the first deployment
-- that has events in it.
-- ---------------------------------------------------------------------------
alter table public.student_skill_events disable trigger student_skill_events_append_only;

update public.student_skill_events set evidence_source = case confidence
    when 'parent_reported'      then 'parent'
    when 'teacher_observed'     then 'teacher'
    when 'self_reported'        then 'student_self'
    when 'assessment_confirmed' then 'assessment_instrument'
    else 'unknown' end::app.evidence_source;

update public.assessment_results set evidence_source = case confidence
    when 'parent_reported'      then 'parent'
    when 'teacher_observed'     then 'teacher'
    when 'self_reported'        then 'student_self'
    when 'assessment_confirmed' then 'assessment_instrument'
    else 'unknown' end::app.evidence_source;

-- Provenance comes from the AI lineage that already exists, not from the
-- confidence enum. `ai_suggested` says a model was involved; ai_generated,
-- ai_suggestion_id and human_confirmed_by say whether a person accepted it.
-- Where none of them says anything, the answer is `unknown`.

update public.student_skills set record_provenance = case
    when ai_generated and human_confirmed_by is not null then 'human_confirmed_ai_proposal'
    when ai_generated                                    then 'ai_proposed_unreviewed'
    when confidence = 'ai_suggested'                     then 'ai_proposed_unreviewed'
    else 'unknown' end::app.record_provenance;

update public.student_skill_events set record_provenance = case
    when ai_generated and human_confirmed_by is not null then 'human_confirmed_ai_proposal'
    when ai_generated                                    then 'ai_proposed_unreviewed'
    when confidence = 'ai_suggested'                     then 'ai_proposed_unreviewed'
    else 'unknown' end::app.record_provenance;

update public.assessment_results set record_provenance = case
    when ai_generated and human_confirmed_by is not null then 'human_confirmed_ai_proposal'
    when ai_generated                                    then 'ai_proposed_unreviewed'
    when confidence = 'ai_suggested'                     then 'ai_proposed_unreviewed'
    else 'unknown' end::app.record_provenance;

alter table public.student_skill_events enable trigger student_skill_events_append_only;

-- The restoration is a post-condition, not an assumption.
do $guard$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
     where tgrelid = 'public.student_skill_events'::regclass
       and tgname = 'student_skill_events_append_only'
       and tgenabled <> 'D')
  then
    raise exception 'the append-only trigger on student_skill_events was left disabled';
  end if;
end $guard$;


-- =============================================================================
-- Retire the conflated column
-- =============================================================================
-- The old constraint said a skill could only be `mastered` when confidence was
-- teacher_observed or assessment_confirmed. It is dropped here with its column
-- and rebuilt in 0082 against the new state model - see the note there about
-- what it got wrong for homeschools.

alter table public.student_skills
  drop constraint if exists student_skills_mastery_requires_human_ck;

alter table public.student_skills      drop column confidence;
alter table public.student_skill_events drop column confidence;
alter table public.assessment_results   drop column confidence;

drop type app.confidence_level;

create index student_skills_provenance_idx
  on public.student_skills (record_provenance)
  where record_provenance <> 'unknown';

select app.assert_schema_invariants();
