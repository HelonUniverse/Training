-- =============================================================================
-- Schema invariants, re-asserted as a test so CI catches drift between deploys
-- =============================================================================
select app.assert_schema_invariants();

select t.assert_eq((select count(*) from app.assert_partition_security()), 0::bigint,
  'every partition is sealed');

-- the capability matrix must stay enumerable and small enough to review
select t.assert((select count(*) from app.capabilities) between 100 and 500,
  'the capability matrix is a reviewable size');

-- no relationship may hold a capability on a resource it should never reach
select t.assert_eq(
  (select count(*) from app.capabilities
    where relationship in ('class_staff','grant_evaluator','grant_provider','grant_review','grant_transfer')
      and resource in ('consent','guardian','access_grant','compliance_submission')), 0::bigint,
  'derived and granted relationships never reach the protected surface');

-- every grant-based academic read stays section scoped
select t.assert_eq(
  (select count(*) from app.capabilities
    where relationship::text like 'grant_%'
      and resource in ('portfolio','reading_log','activity_log','assessment','skill',
                       'learning_plan','attendance','academic_record','document')
      and not requires_section), 0::bigint,
  'grant capabilities on academic resources are all section scoped');

select 'schema invariants hold' as result;
