-- =============================================================================
-- The review gate: approving, and then publishing, the K-5 batch
-- =============================================================================
-- SEPARATE FROM THE IMPORT ON PURPOSE. The import file stages rows and stops.
-- This file is the decision, taken by a person holding the platform standards
-- capability, and it is deliberately not generated: a script that emits its own
-- approval is not a review gate, it is a longer import.
--
-- WHAT THE APPROVAL RESTS ON. Five independent pieces of evidence, each of
-- which could have failed on its own:
--
--   1. ARTIFACT     sha256 474b9a43...dd1914 and 841,856 bytes, both matching
--                   the values authorised before anything was read.
--   2. COUNT        K 22, 1 26, 2 27, 3 34, 4 39, 5 36 - 184 in total, every
--                   grade matching a count stated before the parser was
--                   written. No parser behaviour was changed to reach them.
--   3. SECOND READ  the artifact read again by an unrelated implementation
--                   (Python's stdlib html.parser, an event-driven tokenizer
--                   with its own element stack) produced identical values for
--                   all 184 code / grade / strand / statement tuples.
--                   scripts/crosscheck-florida-best.py
--   4. VALIDATION   zero findings; zero empty statements; zero duplicates;
--                   zero unresolved, ambiguous or conflicting rows; and for all
--                   184 rows the grade the document STATES equals the grade its
--                   code carries - two facts the document records in two
--                   different places, agreeing 184 times.
--   5. SPOT CHECK   68 samples - the first and last benchmark of every
--                   (grade, domain) pair - opened at their recorded character
--                   offset in the raw bytes. All 68 carry the recorded code and
--                   wording under the recorded grade and strand headings.
--                   scripts/spotcheck-florida-best.py
--
-- WHAT IS NOT APPROVED HERE. Grades 6-12 and K-12 practices: 458 rows the
-- artifact contains and this run did not request. They were counted, never
-- staged, and remain unread.
-- =============================================================================

begin;

select t.login('11111111-1111-4111-8111-0000000000f0');

do $guard$ begin
  if not app.is_standards_admin() then
    raise exception 'this session does not hold standards.administer; nothing was approved'
      using errcode = 'insufficient_privilege';
  end if;
end $guard$;

create temporary table _batch as
select b.id
  from public.standards_import_batches b
  join public.standards_sources s on s.id = b.source_id
 where s.sha256 = '474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914'
   and b.adapter = 'florida-best-structured';

-- --- 1. the batch enters review ---------------------------------------------
update public.standards_import_batches
   set status = 'review_pending' where id = (select id from _batch);

-- --- 2. refuse to review a batch that is not what was validated -------------
-- The evidence above is about 184 rows, all cleanly staged. If the batch in
-- front of us is not that batch, the evidence does not apply to it.
do $check$
declare v_total integer; v_clean integer; v_locators integer;
begin
  select count(*), count(*) filter (where status = 'staged'),
         count(*) filter (where source_locator is not null)
    into v_total, v_clean, v_locators
    from public.standards_staged_records where batch_id = (select id from _batch);
  if v_total <> 184 or v_clean <> 184 or v_locators <> 184 then
    raise exception
      'this batch holds % rows, % cleanly staged, % with locators; the review evidence '
      'covers 184 of each. Refusing to approve rows nobody checked.',
      v_total, v_clean, v_locators
      using errcode = 'check_violation';
  end if;
end $check$;

-- --- 3. the decision ---------------------------------------------------------
-- Recorded per row, with who and when, by the RPC. The note says what the
-- approval rested on, so a reader years from now is not left with a bare
-- 'approved' and a timestamp.
select count(*) as approved from (
  select public.review_staged_record(
    p_record => r.id,
    p_decision => 'approved',
    p_note => 'STEP 6 Phase B. Approved on: artifact sha256 and size matched; count gate '
              'matched per grade and in total (184); an independent second implementation '
              'read all 184 rows identically; validation reported nothing; 68 spot checks '
              'against the raw bytes at recorded offsets all passed.')
    from public.standards_staged_records r
   where r.batch_id = (select id from _batch) and r.status = 'staged'
) t;

update public.standards_import_batches
   set status = 'approved' where id = (select id from _batch);

-- --- 4. publication ----------------------------------------------------------
select public.publish_standards_batch((select id from _batch)) as result;

commit;
