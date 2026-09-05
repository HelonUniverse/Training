-- STEP 2.6 / A: managed-platform checks. Run via execute_sql after migrations.
do $$
declare v_bad text; v_n int;
begin
  -- 1. extensions the schema depends on
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    raise exception 'pg_trgm is not installed';
  end if;

  -- 2. the Supabase roles exist and authenticated is not over-privileged
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception 'the authenticated role is missing';
  end if;
  select string_agg(rolname, ', ') into v_bad from pg_roles
   where rolname in ('authenticated','anon')
     and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb);
  if v_bad is not null then
    raise exception 'application roles hold elevated attributes: %', v_bad;
  end if;

  -- 3. authenticated must not own any table in public (owners bypass non-forced RLS)
  select string_agg(c.relname, ', ') into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and pg_get_userbyid(c.relowner) in ('authenticated','anon');
  if v_bad is not null then
    raise exception 'authenticated/anon owns tables: %', v_bad;
  end if;

  -- 4. anon has no privileges on public
  select string_agg(table_name, ', ') into v_bad
    from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public';
  if v_bad is not null then
    raise exception 'anon holds grants on: %', v_bad;
  end if;

  -- 5. the full invariant suite (RLS on, policies present, partitions sealed,
  --    definer search_path pinned, no PUBLIC execute)
  perform app.assert_schema_invariants();

  -- 6. partition security
  select count(*) into v_n from app.assert_partition_security();
  if v_n > 0 then raise exception '% insecure partitions', v_n; end if;

  -- 7. auth.uid() resolves from the Supabase JWT claim mechanism
  perform set_config('request.jwt.claims',
    json_build_object('sub','11111111-1111-4111-8111-000000000001','role','authenticated')::text, true);
  if auth.uid() is distinct from '11111111-1111-4111-8111-000000000001'::uuid then
    raise exception 'auth.uid() did not resolve from request.jwt.claims (got %)', auth.uid();
  end if;
  perform set_config('request.jwt.claims', '', true);
  if auth.uid() is not null then
    raise exception 'auth.uid() is not null without a JWT (got %)', auth.uid();
  end if;

  raise notice 'platform checks passed';
end $$;

-- report surface for the acceptance record
select
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition) as tables,
  (select count(*) from pg_policy) as policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='app') as app_functions,
  (select count(*) from app.capabilities) as capabilities,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='app' and pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')) as authenticated_callable,
  (select count(*) from pg_event_trigger where evtname = 'secure_new_partitions') as event_trigger_installed,
  (select count(*) from storage.buckets) as buckets,
  version() as server_version;
