-- =============================================================================
-- Schema digest - the drift detector
-- =============================================================================
-- Run this against local PostgreSQL and against the managed project and compare
-- the output line by line. Every row is a COUNT and an MD5 over the catalog, so
-- a single renamed policy, a dropped trigger or a bucket that turned public
-- changes a digest and nothing else does.
--
-- This is how STEP 2.6 and STEP 4.1 proved that what was deployed is what the
-- migrations in this repository say should be deployed - without a network path
-- from the sandbox to the cloud database, and without trusting a migration
-- ledger that only records that a file ran.
--
--   psql -f scripts/schema-digest.sql            (local)
--   ... and the same text through the Supabase MCP execute_sql (managed)
-- =============================================================================
select 'tables_with_rls' as what,
       count(*)::text as n,
       md5(string_agg(c.relname, ',' order by c.relname)) as digest
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','p') and c.relrowsecurity
union all
select 'tables_without_rls', count(*)::text,
       coalesce(md5(string_agg(c.relname, ',' order by c.relname)), 'none')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity
union all
select 'policies_public', count(*)::text,
       md5(string_agg(p.tablename||'.'||p.policyname||'.'||p.cmd, ',' order by p.tablename, p.policyname))
  from pg_policies p where p.schemaname = 'public'
union all
select 'policies_storage', count(*)::text,
       md5(string_agg(p.tablename||'.'||p.policyname||'.'||p.cmd, ',' order by p.tablename, p.policyname))
  from pg_policies p where p.schemaname = 'storage'
union all
select 'functions_app_public', count(*)::text,
       md5(string_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
                      ||':'||p.prosecdef::text, ',' order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('app','public')
union all
select 'triggers_public', count(*)::text,
       md5(string_agg(c.relname||'.'||t.tgname, ',' order by c.relname, t.tgname))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not t.tgisinternal
union all
select 'enum_labels', count(*)::text,
       md5(string_agg(t.typname||'.'||e.enumlabel, ',' order by t.typname, e.enumsortorder))
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'app'
union all
-- STEP 5: hash the matrix ITSELF, not its size. md5(count(*)) agreed whenever
-- two databases held the same NUMBER of capability rows, which is the one thing
-- a swapped relationship or a flipped requires_section does not change.
select 'capabilities_rows', count(*)::text,
       md5(string_agg(relationship::text||'.'||resource::text||'.'||action::text
                      ||':'||requires_section::text, ','
                      order by relationship::text, resource::text, action::text))
  from app.capabilities
union all
select 'buckets_total', count(*)::text,
       md5(string_agg(id||':'||public::text, ',' order by id)) from storage.buckets
union all
select 'buckets_public', count(*)::text, coalesce(md5(string_agg(id, ',' order by id)), 'none')
  from storage.buckets where public
union all
select 'definer_without_search_path', count(*)::text,
       coalesce(md5(string_agg(n.nspname||'.'||p.proname, ',' order by p.proname)), 'none')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('app','public') and p.prosecdef
   and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%')
union all
-- STEP 4.1: a view without security_invoker executes as its OWNER for writes as
-- well as reads. An end user holding INSERT/UPDATE/DELETE on one is a path
-- straight past the base table's RLS, whatever the view's WHERE clause says.
select 'view_write_grants_to_users', count(*)::text,
       coalesce(md5(string_agg(c.relname, ',' order by c.relname)), 'none')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join lateral aclexplode(c.relacl) ac join pg_roles r on r.oid = ac.grantee
 where n.nspname = 'public' and c.relkind = 'v' and r.rolname in ('anon','authenticated')
   and ac.privilege_type <> 'SELECT'
 order by 1;
