-- =============================================================================
-- 0045  STEP 2.5 - permanent partition security invariant
-- =============================================================================
-- The STEP 2 finding: RLS is not inherited by partitions, and a partition is a
-- table name an authenticated user can query directly, bypassing the parent's
-- policies. Securing partitions must not depend on anyone remembering.
--
-- Three layers:
--   1. app.ensure_month_partitions() secures each partition as it creates it
--      (already true since STEP 2; re-verified by the assertion below).
--   2. An event trigger secures ANY partition attached by any means.
--   3. app.assert_partition_security() is a permanent invariant, asserted at
--      deploy time and in the test suite.
-- =============================================================================

-- --- 3. the invariant --------------------------------------------------------
create or replace function app.assert_partition_security()
returns table (partition_name text, problem text)
language sql stable set search_path = '' as $$
  select c.oid::regclass::text,
         case
           when not c.relrowsecurity then 'row level security is not enabled'
           when has_table_privilege('authenticated', c.oid, 'SELECT') then 'authenticated can SELECT directly'
           when has_table_privilege('authenticated', c.oid, 'INSERT') then 'authenticated can INSERT directly'
           when has_table_privilege('authenticated', c.oid, 'UPDATE') then 'authenticated can UPDATE directly'
           when has_table_privilege('authenticated', c.oid, 'DELETE') then 'authenticated can DELETE directly'
           when has_table_privilege('anon', c.oid, 'SELECT') then 'anon can SELECT directly'
         end
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relispartition and c.relkind = 'r'
     and (not c.relrowsecurity
          or has_table_privilege('authenticated', c.oid, 'SELECT')
          or has_table_privilege('authenticated', c.oid, 'INSERT')
          or has_table_privilege('authenticated', c.oid, 'UPDATE')
          or has_table_privilege('authenticated', c.oid, 'DELETE')
          or has_table_privilege('anon', c.oid, 'SELECT'));
$$;

comment on function app.assert_partition_security() is
  'Returns one row per insecure partition. Must always return zero rows: '
  'asserted at deploy time and by tests/rls/06_partition_security.sql.';

revoke all on function app.assert_partition_security() from public, anon, authenticated;
grant execute on function app.assert_partition_security() to service_role;

-- --- 2. secure any partition the moment it is attached -----------------------
create or replace function app.event_secure_new_partitions()
returns event_trigger language plpgsql as $$
declare r record;
begin
  for r in select objid from pg_event_trigger_ddl_commands()
            where command_tag in ('CREATE TABLE', 'ALTER TABLE')
  loop
    if exists (select 1 from pg_class c
                where c.oid = r.objid and c.relispartition and c.relkind = 'r') then
      perform app.secure_partition(r.objid::regclass);
    end if;
  end loop;
end;
$$;

revoke all on function app.event_secure_new_partitions() from public, anon, authenticated;

do $$
begin
  create event trigger secure_new_partitions
    on ddl_command_end
    when tag in ('CREATE TABLE', 'ALTER TABLE')
    execute function app.event_secure_new_partitions();
  raise notice 'event trigger secure_new_partitions installed';
exception
  when insufficient_privilege then
    -- Some managed platforms do not allow non-superuser event triggers. Layers
    -- 1 and 3 still hold, and the deploy-time assertion below is the backstop.
    raise warning 'could not install the secure_new_partitions event trigger (%). '
                  'Partition security still relies on app.ensure_month_partitions() '
                  'and app.assert_partition_security(); keep the invariant test in CI.',
                  sqlerrm;
end $$;

-- --- 1 + 3. verify the current state now -------------------------------------
do $$
declare v_bad text;
begin
  select string_agg(partition_name || ': ' || problem, '; ')
    into v_bad from app.assert_partition_security();
  if v_bad is not null then
    raise exception 'insecure partitions: %', v_bad;
  end if;
end $$;
