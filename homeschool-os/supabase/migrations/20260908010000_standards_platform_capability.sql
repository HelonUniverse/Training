-- =============================================================================
-- 0073  A deliberate platform capability for standards administration
-- =============================================================================
-- Canonical standards are GLOBAL reference data. Publishing one is not a
-- family action, an organization action, or a teaching action: a benchmark
-- published here is read by every family in the product, so the authority to
-- publish it cannot come from administering an organization or teaching a
-- child.
--
-- There is already an audited mechanism for exactly this - public.user_permissions,
-- which records who granted what, why, by whom and until when, and in which
-- DENY beats ALLOW. It only lacked a scope above an organization. It gets one
-- here rather than getting a new unaudited superuser flag.
--
-- Deliberately NOT wired to profiles.is_super_admin or to
-- support_access_sessions. Break-glass support access exists to help a family
-- in trouble; it is not a licence to edit what every family reads.
-- =============================================================================

alter table public.user_permissions
  drop constraint if exists user_permissions_scope_type_check;

alter table public.user_permissions
  add constraint user_permissions_scope_type_check
  check (scope_type in ('organization', 'family', 'student', 'class', 'platform'));

comment on column public.user_permissions.scope_type is
  'organization | family | student | class | platform. A platform-scoped row '
  'uses app.platform_scope_id() as its scope_id: the scope has no natural row '
  'to point at, and a constant keeps the (user, scope, permission) uniqueness '
  'that a null would break.';

create or replace function app.platform_scope_id()
returns uuid language sql immutable set search_path = '' as $$
  select '00000000-0000-4000-8000-000000000001'::uuid;
$$;

/**
 * May the CURRENT user administer the standards reference layer?
 *
 * One explicit, expiring, audited grant. No role implies it: not org_admin, not
 * teacher, not evaluator, not guardian. DENY wins, as everywhere else.
 *
 * Answers for auth.uid() only, like every other scope helper since 0055. That
 * is not a limitation to work around: "is SOMEBODY ELSE an admin" is a question
 * an authorization check should never need, and every place downstream that
 * looked like it needed one turned out to be better written as "the person
 * doing this must be an admin, and must name themselves as the approver".
 */
create or replace function app.is_standards_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    app.permission_override('platform'::text, app.platform_scope_id(),
                            'standards.administer'::text) = 'allow',
    false);
$$;

-- Granted to `authenticated` for the same reason every other helper in this
-- file is: RLS policies below call it, and a policy predicate the querying role
-- cannot execute evaluates to an error, not to false.
revoke all on function app.platform_scope_id() from public, anon;
revoke all on function app.is_standards_admin() from public, anon;
grant execute on function app.platform_scope_id(), app.is_standards_admin()
  to authenticated, service_role;

select app.assert_schema_invariants();
