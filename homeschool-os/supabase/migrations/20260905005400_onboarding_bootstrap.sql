-- =============================================================================
-- 0052  STEP 3 - onboarding bootstrap
-- =============================================================================
-- Found by simulating parent and organization onboarding as an ordinary
-- authenticated user. Three memberships were impossible to create without
-- service_role, which STEP 3 forbids for onboarding:
--
--   1. family_members       - is_family_member() reads family_members, so the
--                             first member of a new family can never insert.
--   2. student_guardians    - guardian.create requires an existing relationship
--                             TO THAT STUDENT, so the first guardian of a newly
--                             created child can never insert. This affects every
--                             child, not just the first: being a full guardian of
--                             a sibling grants nothing on a brand-new student.
--   3. organization_members - is_org_admin() reads organization_members, so the
--                             creator of a new organization can never become its
--                             administrator.
--
-- All three are the same chicken-and-egg: the policy that authorises the write
-- reads the very table being written.
--
-- A SECOND, subtler instance of the same problem sits underneath. A naive fix
-- writes the guard inline, e.g.
--     exists (select 1 from public.families f where f.id = family_id
--                                               and f.created_by = auth.uid())
-- but that subquery is ITSELF subject to the caller's RLS, and families_select
-- requires can_read_family() - which is false for a family that has no members
-- and no students yet. The creator cannot see the row they just created, so the
-- guard silently evaluates false. The guards below therefore live in SECURITY
-- DEFINER helpers, the same pattern every other authorization predicate uses.
--
-- The grant is deliberately NOT a general "creators can do anything" rule. Each
-- helper encodes exactly one narrow act:
--
--     "You may create the FIRST membership of a thing you just created,
--      naming only yourself."
--
-- Three conditions make that safe, and all three are required:
--   (a) user_id = auth.uid()  - you can only ever add YOURSELF (in the policy).
--   (b) a provable claim on the parent row - you created the organization, or
--       you are already a member of the child's family.
--   (c) NOT EXISTS any current membership - so this can never be used to walk
--       into an established family or organization, which always has >= 1 member.
--
-- Condition (c) is what closes the escalation path. An organization admin who
-- creates a student for an enrolled family still cannot attach themselves as
-- that child's guardian, because (b) requires family membership, which an org
-- admin does not have.
-- =============================================================================

-- --- guards ------------------------------------------------------------------

create or replace function app.is_new_family_founder(p_family uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select p_family is not null
     and auth.uid() is not null
     and exists (
       select 1 from public.families f
        where f.id = p_family
          and f.deleted_at is null
          and f.created_by = auth.uid()
          and f.primary_guardian_id = auth.uid())
     and not exists (
       select 1 from public.family_members m where m.family_id = p_family);
$fn$;

comment on function app.is_new_family_founder(uuid) is
  'True only while a family the caller created, and is named primary guardian of, '
  'still has zero members. Gates the family_members bootstrap policy.';

create or replace function app.is_founding_guardian_candidate(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select p_student is not null
     and auth.uid() is not null
     and exists (
       select 1 from public.students s
        where s.id = p_student
          and s.deleted_at is null
          and app.is_family_member(s.family_id))
     and not exists (
       select 1 from public.student_guardians g
        where g.student_id = p_student and g.revoked_at is null);
$fn$;

comment on function app.is_founding_guardian_candidate(uuid) is
  'True only while a student in the caller''s OWN family still has no guardian on '
  'record. Gates the student_guardians bootstrap policy. An organization admin '
  'cannot satisfy it - they are not a family member.';

create or replace function app.is_new_org_founder(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select p_org is not null
     and auth.uid() is not null
     and exists (
       select 1 from public.organizations o
        where o.id = p_org
          and o.deleted_at is null
          and o.created_by = auth.uid())
     and not exists (
       select 1 from public.organization_members m where m.organization_id = p_org);
$fn$;

comment on function app.is_new_org_founder(uuid) is
  'True only while an organization the caller created still has zero members. '
  'Gates the organization_members bootstrap policy.';

revoke all on function
  app.is_new_family_founder(uuid),
  app.is_founding_guardian_candidate(uuid),
  app.is_new_org_founder(uuid)
from public, anon;
grant execute on function
  app.is_new_family_founder(uuid),
  app.is_founding_guardian_candidate(uuid),
  app.is_new_org_founder(uuid)
to authenticated, service_role;

-- --- policies ----------------------------------------------------------------

create policy family_members_bootstrap on public.family_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'guardian'
    and app.is_new_family_founder(family_id)
  );

create policy student_guardians_bootstrap on public.student_guardians
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and access_level = 'full'
    and revoked_at is null
    and app.is_founding_guardian_candidate(student_id)
  );

create policy org_members_bootstrap on public.organization_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'org_admin'
    and status = 'active'
    and app.is_new_org_founder(organization_id)
  );

-- The founder must also be able to SEE the family and organization they just
-- created, before any membership row exists, or the app cannot read back what
-- it wrote inside the same onboarding transaction.
create policy families_select_founder on public.families
  for select to authenticated
  using (deleted_at is null and created_by = auth.uid());

create policy organizations_select_founder on public.organizations
  for select to authenticated
  using (deleted_at is null and created_by = auth.uid());

-- =============================================================================
-- Deploy-blocking checks. These exercise the guards against real rows rather
-- than restating their logic, so they fail if the guard is ever loosened.
-- =============================================================================
do $$
declare
  v_founder  uuid := '00000000-dead-4000-8000-00000000beef';
  v_outsider uuid := '00000000-dead-4000-8000-00000000cafe';
  v_family   uuid := '00000000-dead-4000-8000-00000000f001';
  v_org      uuid := '00000000-dead-4000-8000-00000000f002';
  v_student  uuid := '00000000-dead-4000-8000-00000000f003';
begin
  insert into auth.users (id, email) values
    (v_founder,  'founder@invariant.local'),
    (v_outsider, 'outsider@invariant.local')
  on conflict (id) do nothing;

  insert into public.families (id, name, created_by, primary_guardian_id, is_independent)
  values (v_family, 'Invariant Family', v_founder, v_founder, true);
  insert into public.organizations (id, name, slug, type, state_code, created_by)
  values (v_org, 'Invariant Org', 'invariant-org-'||substr(v_org::text,1,8), 'other', 'FL', v_founder);

  -- 1. while empty, the founder qualifies ...
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_founder, 'role', 'authenticated')::text, true);
  if not app.is_new_family_founder(v_family) then
    raise exception 'founder should qualify on an empty family';
  end if;
  if not app.is_new_org_founder(v_org) then
    raise exception 'founder should qualify on an empty organization';
  end if;

  -- 2. ... but an outsider never does, even while empty.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  if app.is_new_family_founder(v_family) then
    raise exception 'an outsider qualified as family founder';
  end if;
  if app.is_new_org_founder(v_org) then
    raise exception 'an outsider qualified as organization founder';
  end if;

  -- 3. once populated, NOBODY qualifies - this is the anti-escalation guard.
  insert into public.family_members (family_id, user_id, role, is_primary)
  values (v_family, v_founder, 'guardian', true);
  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org, v_founder, 'org_admin', 'active');

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_founder, 'role', 'authenticated')::text, true);
  if app.is_new_family_founder(v_family) then
    raise exception 'family bootstrap still open after the family has a member';
  end if;
  if app.is_new_org_founder(v_org) then
    raise exception 'organization bootstrap still open after it has a member';
  end if;

  -- 4. the guardian guard: open while the child has none, closed once set.
  insert into public.students (id, family_id, legal_first_name, legal_last_name, date_of_birth)
  values (v_student, v_family, 'Invariant', 'Child', date '2015-01-01');

  if not app.is_founding_guardian_candidate(v_student) then
    raise exception 'family member should qualify as founding guardian';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  if app.is_founding_guardian_candidate(v_student) then
    raise exception 'a non-family-member qualified as founding guardian';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_founder, 'role', 'authenticated')::text, true);
  insert into public.student_guardians (student_id, user_id, relationship, is_primary, access_level, granted_by)
  values (v_student, v_founder, 'parent', true, 'full', v_founder);
  if app.is_founding_guardian_candidate(v_student) then
    raise exception 'guardian bootstrap still open after a guardian exists';
  end if;

  perform set_config('request.jwt.claims', '', true);

  delete from public.student_guardians where student_id = v_student;
  delete from public.students where id = v_student;
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org;
  delete from public.family_members where family_id = v_family;
  delete from public.families where id = v_family;
  delete from auth.users where id in (v_founder, v_outsider);

  raise notice 'onboarding bootstrap guards verified';
end $$;

select app.assert_schema_invariants();
