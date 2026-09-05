-- =============================================================================
-- 0055  STEP 3 - expose the capability check to the application layer
-- =============================================================================
-- Server Actions go through lib/auth/guard.ts, which asks the DATABASE whether
-- the caller may perform a student-scoped action rather than re-implementing
-- the capability matrix in TypeScript. PostgREST only exposes `public`, and
-- app.can_student_action lives in `app`, so this thin wrapper is the bridge.
--
-- SECURITY INVOKER: it is evaluated as the calling user and returns exactly
-- what the RLS policies would conclude. It grants nothing - it only lets the
-- UI ask the same question the policies answer, so the two cannot drift.
-- =============================================================================

create or replace function public.can_student_action(
  p_student  uuid,
  p_resource text,
  p_action   text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $fn$
  select app.can_student_action(
    p_student,
    p_resource::app.resource_type,
    p_action::app.resource_action);
$fn$;

comment on function public.can_student_action(uuid, text, text) is
  'Read-only bridge so the application can ask the same capability question the '
  'RLS policies ask. Text arguments keep it callable from PostgREST; invalid '
  'values raise rather than silently returning false.';

revoke all on function public.can_student_action(uuid, text, text) from public, anon;
grant execute on function public.can_student_action(uuid, text, text)
  to authenticated, service_role;

select app.assert_schema_invariants();
