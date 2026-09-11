-- =============================================================================
-- 0094  One connected slice, with enough items to prove the engine
-- =============================================================================
-- Not a K-5 diagnostic. Five connected fraction skills from the STEP 5 graph -
--
--   NST.FR.1  understand a fraction as part of a whole
--     -> NST.FR.2  recognize equivalent representations
--       -> NST.FR.3  identify equivalent fractions
--         -> NST.FR.4  generate equivalent fractions
--           -> NST.FR.5  compare fractions   (needs FR.3 AND FR.4)
--
-- - plus two reading skills that exist only so a test can prove a hard
-- afternoon with fractions leaves reading completely untouched.
--
-- Three items per skill, because the success ceiling is two demonstrations and a
-- third item is what proves the engine stops asking rather than running out.
--
-- The modalities vary deliberately. If every seed item were a question, the
-- first real content would be written as questions too, and the multimodal
-- shape in 0092 would be theoretical. A child demonstrating equivalent fractions
-- with paper strips is the same kind of evidence as one answering on a screen.
--
-- `prompt_key` is an i18n key, never prose. Family-facing wording lives in the
-- catalogs the language guard checks, so "5th grade question" cannot be typed
-- into a database row where nothing would lint it.
-- =============================================================================

insert into public.diagnostic_items (skill_id, modality, prompt_key, sequence, is_seed)
select k.id, m.modality, 'diagnostic.seed.' || lower(replace(k.code, '.', '_')) || '.' || m.seq,
       m.seq, true
  from public.skills k
  cross join (values (1, 'question'::app.diagnostic_modality),
                     (2, 'short_response'::app.diagnostic_modality),
                     (3, 'demonstration'::app.diagnostic_modality)) as m(seq, modality)
 where k.code in ('NST.FR.1','NST.FR.2','NST.FR.3','NST.FR.4','NST.FR.5');

insert into public.diagnostic_items (skill_id, modality, prompt_key, sequence, is_seed)
select k.id, m.modality, 'diagnostic.seed.' || lower(replace(k.code, '.', '_')) || '.' || m.seq,
       m.seq, true
  from public.skills k
  cross join (values (1, 'question'::app.diagnostic_modality),
                     (2, 'parent_observation'::app.diagnostic_modality)) as m(seq, modality)
 where k.code in ('READ.PHO','READ.FLU');

do $check$
declare v_n int;
begin
  select count(*) into v_n from public.diagnostic_items where is_seed;
  if v_n <> 19 then
    raise exception 'expected 19 seed items across the slice, got %', v_n;
  end if;
end $check$;

select app.assert_schema_invariants();
