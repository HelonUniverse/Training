-- =============================================================================
-- 0030  RLS policies: identity, tenancy, consent
-- =============================================================================
-- Convention: policies are named "<table>_<operation>_<who>". Every policy is
-- `to authenticated`; service_role holds BYPASSRLS and is used only by trusted
-- server-side jobs. `anon` has no privileges on any table (see 0035).
-- =============================================================================

-- --- locales / translations --------------------------------------------------
create policy locales_select_all on public.locales
  for select to authenticated using (true);

create policy content_translations_select on public.content_translations
  for select to authenticated
  using (organization_id is null or app.can_view_organization(organization_id));
create policy content_translations_write on public.content_translations
  for all to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id))
  with check (organization_id is not null and app.is_org_admin(organization_id));

-- --- profiles ----------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated using (app.can_read_profile(id));
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- No INSERT policy: profiles are created by the auth trigger only.
-- No DELETE policy: accounts are deactivated, never deleted in place.

-- --- organizations -----------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated using (deleted_at is null and app.can_view_organization(id));
create policy organizations_insert on public.organizations
  for insert to authenticated with check (created_by = auth.uid());
create policy organizations_update_admin on public.organizations
  for update to authenticated using (app.is_org_admin(id)) with check (app.is_org_admin(id));

create policy org_locations_select on public.organization_locations
  for select to authenticated using (deleted_at is null and app.can_view_organization(organization_id));
create policy org_locations_write on public.organization_locations
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy org_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid()
         or app.is_org_member(organization_id)
         or app.is_platform_support(organization_id));
create policy org_members_write_admin on public.organization_members
  for all to authenticated
  using (app.is_org_admin(organization_id)) with check (app.is_org_admin(organization_id));

create policy invitations_select on public.invitations
  for select to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id))
         or lower(email) = lower((select p.email from public.profiles p where p.id = auth.uid())));
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check ((organization_id is not null and app.is_org_admin(organization_id))
              or (family_id is not null and app.is_family_member(family_id)));
create policy invitations_update on public.invitations
  for update to authenticated
  using ((organization_id is not null and app.is_org_admin(organization_id))
         or (family_id is not null and app.is_family_member(family_id))
         or lower(email) = lower((select p.email from public.profiles p where p.id = auth.uid())))
  with check (true);

-- --- families ----------------------------------------------------------------
create policy families_select on public.families
  for select to authenticated using (deleted_at is null and app.can_read_family(id));
create policy families_insert on public.families
  for insert to authenticated with check (created_by = auth.uid());
create policy families_update on public.families
  for update to authenticated using (app.is_family_member(id)) with check (app.is_family_member(id));

create policy family_members_select on public.family_members
  for select to authenticated using (app.can_read_family(family_id));
create policy family_members_write on public.family_members
  for all to authenticated
  using (app.is_family_member(family_id)) with check (app.is_family_member(family_id));

create policy family_org_memberships_select on public.family_organization_memberships
  for select to authenticated
  using (app.can_read_family(family_id) or app.can_read_org(organization_id));
create policy family_org_memberships_write on public.family_organization_memberships
  for all to authenticated
  using (app.is_family_member(family_id) or app.is_org_admin(organization_id))
  with check (app.is_family_member(family_id) or app.is_org_admin(organization_id));

-- --- consent -----------------------------------------------------------------
create policy consent_policies_select on public.consent_policies
  for select to authenticated
  using (organization_id is null or app.can_view_organization(organization_id));
create policy consent_policies_write on public.consent_policies
  for all to authenticated
  using (organization_id is not null and app.is_org_admin(organization_id))
  with check (organization_id is not null and app.is_org_admin(organization_id));

create policy consents_select on public.consents
  for select to authenticated
  using (subject_user_id = auth.uid()
         or guardian_id = auth.uid()
         or (subject_student_id is not null and app.can_read_student(subject_student_id))
         or (organization_id is not null and app.is_org_admin(organization_id)));
create policy consents_insert on public.consents
  for insert to authenticated
  with check (subject_user_id = auth.uid()
              or (subject_student_id is not null and app.can_write_student(subject_student_id)));
-- No UPDATE / DELETE policies: consents are append-only (also enforced by trigger).

-- --- permission overrides ----------------------------------------------------
create policy user_permissions_select on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid()
         or (scope_type = 'organization' and app.is_org_admin(scope_id))
         or (scope_type = 'student' and app.can_admin_student(scope_id))
         or (scope_type = 'family' and app.is_family_member(scope_id)));
create policy user_permissions_write on public.user_permissions
  for all to authenticated
  using ((scope_type = 'organization' and app.is_org_admin(scope_id))
         or (scope_type = 'student' and app.can_admin_student(scope_id))
         or (scope_type = 'family' and app.is_family_member(scope_id)))
  with check ((scope_type = 'organization' and app.is_org_admin(scope_id))
              or (scope_type = 'student' and app.can_admin_student(scope_id))
              or (scope_type = 'family' and app.is_family_member(scope_id)));
