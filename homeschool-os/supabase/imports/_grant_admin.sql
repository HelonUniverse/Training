-- =============================================================================
-- The standards operator, and the one capability they hold
-- =============================================================================
-- A DEDICATED IDENTITY, not a borrowed one. The first version of this file gave
-- the platform capability to Adele, an organization administrator from the test
-- fixtures, because she was there. That broke a test which uses her to prove
-- exactly the opposite point - that administering an organization does NOT make
-- you a global standards editor - and the test was right: an ingestion that
-- quietly promotes an existing account is how a capability spreads.
--
-- So the ingestion runs as an account that exists for no other reason, holding
-- one permission and nothing else. It is not a guardian, not a teacher, not an
-- organization administrator, and belongs to no family.
-- =============================================================================

insert into auth.users (id, email)
values ('11111111-1111-4111-8111-0000000000f0', 'standards-operator@nestra.test')
on conflict (id) do nothing;

insert into public.user_permissions (user_id, scope_type, scope_id, permission, effect, reason)
values ('11111111-1111-4111-8111-0000000000f0', 'platform', app.platform_scope_id(),
        'standards.administer', 'allow',
        'STEP 6 Phase B: ingestion of the Florida B.E.S.T. Mathematics K-5 standards')
on conflict do nothing;
