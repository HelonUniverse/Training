-- =============================================================================
-- 0001  Extensions and schemas
-- =============================================================================
-- `app` holds helper functions, enums and access-control machinery. Application
-- data lives in `public`. Nothing in `app` is exposed through PostgREST.
--
-- gen_random_uuid() is core PostgreSQL 13+, so no extension is required for it.
-- We deliberately depend on exactly one extension (pg_trgm, for name search) to
-- keep the schema portable between Supabase and a plain Postgres test cluster.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app;

comment on schema app is
  'Internal helper functions, enums and access-control machinery. Not exposed via the API.';

grant usage on schema app to authenticated, service_role;
grant usage on schema extensions to authenticated, service_role;
revoke all on schema app from anon;
