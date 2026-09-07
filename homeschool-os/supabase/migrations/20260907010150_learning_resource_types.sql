-- =============================================================================
-- 0069a  STEP 5 - two new resources for the authorization matrix
-- =============================================================================
-- Its own migration on purpose. PostgreSQL will not let a freshly added enum
-- label be USED in the transaction that adds it, and the capability rows in
-- 0069 use both of these immediately.
--
--   curriculum         a course, its lessons, and a child's enrollment in it
--   learning_evidence  "this work shows this skill", once a human has said so
--
-- They are separate resources rather than one because the answers differ. An
-- evaluator reviewing a portfolio may have cause to see the evidence behind a
-- skill; that is no reason at all to show them how the family plans its year.
-- =============================================================================

alter type app.resource_type add value if not exists 'curriculum';
alter type app.resource_type add value if not exists 'learning_evidence';
