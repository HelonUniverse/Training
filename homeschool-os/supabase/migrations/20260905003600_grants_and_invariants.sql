-- =============================================================================
-- 0036  Privileges and schema invariants
-- =============================================================================

-- `anon` reaches nothing. Every route in the product requires a session.
revoke all on schema public from anon;
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant usage on schema public to authenticated, service_role;
-- Privileges are granted broadly; RLS decides. A table with no policy for an
-- operation denies that operation, which is how service-role-only tables
-- (job_queue, computed compliance tables, ai pipeline writes) stay locked down.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;

-- The broad grant above also touches partitions, which are reachable by name.
-- Re-lock every partition: all access must go through the partitioned parent so
-- the parent's policies apply.
do $$
declare r record;
begin
  for r in select c.oid::regclass as rel
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relispartition and c.relkind = 'r'
  loop
    perform app.secure_partition(r.rel);
  end loop;
end $$;

-- current_consents must respect the caller's RLS; ai_usage_summary deliberately
-- does not, because it exists to expose a *filtered* projection of a table that
-- end users may not read at all.
alter view public.current_consents set (security_invoker = true);
grant select on public.current_consents, public.ai_usage_summary to authenticated;

-- --- invariant checks --------------------------------------------------------
-- These run at migration time and fail the deploy rather than shipping a table
-- that is silently world-readable.
do $$
declare v_missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_missing
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_missing is not null then
    raise exception 'RLS is not enabled on: %', v_missing;
  end if;
end $$;

do $$
declare
  v_expected_no_policy text[] := array['job_queue'];   -- service_role only, by design
  v_missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_missing
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relispartition = false
     and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
     and not (c.relname = any (v_expected_no_policy));
  if v_missing is not null then
    raise exception 'tables with RLS enabled but no policy at all: %', v_missing;
  end if;
end $$;

-- Every SECURITY DEFINER function in `app` must pin an empty search_path.
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.prosecdef
     and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false);
  if v_bad is not null then
    raise exception 'SECURITY DEFINER functions without a pinned search_path: %', v_bad;
  end if;
end $$;
