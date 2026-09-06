-- =============================================================================
-- 0065  STEP 4.1 - a summary view is not a write path
-- =============================================================================
-- Found by the STEP 4.1 deployment verification, running as real users against
-- the managed project. Not a STEP 4 regression: the defect predates it. It is
-- fixed here because STEP 4.1 is the run that caught it.
--
-- THE DEFECT. public.ai_usage_summary is deliberately a SECURITY DEFINER view
-- (0050 explains why: it must bypass the platform-support-only RLS on
-- ai_usage_events in order to hand an organization admin cost aggregates,
-- while withholding provider, model and error text by column projection).
--
-- What 0050 did not consider is that `authenticated` held EVERY privilege on
-- that view, not just SELECT. A view without security_invoker executes as its
-- OWNER for writes as well as reads, and the view is simply auto-updatable. So
-- this, from an ordinary organization admin's session, worked:
--
--     delete from public.ai_usage_summary where id = <a row she can see>;
--     update public.ai_usage_summary set input_tokens = 0 where ...;
--
-- Both reached ai_usage_events THROUGH the view, as the view's owner, with the
-- base table's RLS bypassed entirely. An organization admin could silently
-- rewrite or erase her own AI cost and usage ledger - the billing record.
--
-- Proven on the managed project before this migration:
--     V10. UPDATE through the view  -> 1 row changed
--     V11. DELETE through the view  -> 1 row removed
-- and after it, both affect nothing, because the privilege is gone.
--
-- WHY IT WAS NOT CAUGHT EARLIER. A stranger really did read nothing through
-- the view, and that is the test everyone writes. The view's own WHERE clause
-- is a genuine read filter. But it was the ONLY gate, and it gates on who may
-- SEE a row - which is a different question from who may DESTROY one. Reading
-- and writing were being authorised by the same predicate, and only one of
-- them was ever tested.
--
-- The other public view, current_consents, carried the same over-broad grants
-- but is not exploitable: it is security_invoker (so RLS still applies) and is
-- not auto-updatable. Its grants are narrowed here anyway - a consents view
-- has no business being writable, and leaving one of the two correct is how
-- the next person concludes the pattern is fine.
--
-- THE RULE, made permanent below: a view in `public` may grant SELECT to end
-- users and nothing else. Writes go to the base tables, where RLS decides.
-- =============================================================================

revoke all privileges on public.ai_usage_summary from anon, authenticated;
grant select on public.ai_usage_summary to authenticated;

revoke all privileges on public.current_consents from anon, authenticated;
grant select on public.current_consents to authenticated;

-- --- the invariant, so this cannot come back ---------------------------------
-- Copied verbatim from 0050 with one rule appended. A security predicate is
-- not something to retype from memory.
create or replace function app.assert_schema_invariants()
returns void language plpgsql set search_path = '' as $fn$
declare v_bad text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_bad is not null then raise exception 'RLS not enabled on: %', v_bad; end if;

  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relispartition
     and not exists (select 1 from pg_catalog.pg_policy p where p.polrelid = c.oid)
     and c.relname not in ('job_queue');
  if v_bad is not null then raise exception 'tables with no policy: %', v_bad; end if;

  select string_agg(partition_name || ': ' || problem, '; ') into v_bad
    from app.assert_partition_security();
  if v_bad is not null then raise exception 'insecure partitions: %', v_bad; end if;

  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and (pg_catalog.has_function_privilege('public', p.oid, 'execute')
          or pg_catalog.has_function_privilege('anon', p.oid, 'execute'));
  if v_bad is not null then raise exception 'app functions public/anon executable: %', v_bad; end if;

  -- STEP 2.6: EVERY function in app/public pins search_path, not just the
  -- SECURITY DEFINER ones. Trigger bodies and DDL helpers run inside other
  -- people's transactions and must not inherit a caller-controlled path.
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app','public') and p.prokind = 'f'
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  if v_bad is not null then raise exception 'functions without a pinned search_path: %', v_bad; end if;

  -- STEP 2.6: any view in public that is NOT security_invoker executes as its
  -- owner and bypasses RLS, so it MUST carry security_barrier.
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=true%'
     and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_barrier=true%';
  if v_bad is not null then
    raise exception 'definer views without security_barrier: %', v_bad;
  end if;

  -- STEP 4.1: and no view is a WRITE path for an end user. security_barrier
  -- narrows what a definer view will SHOW; it says nothing about what a write
  -- through that view will REACH. An auto-updatable definer view with INSERT,
  -- UPDATE or DELETE granted to `authenticated` is a hole straight past the
  -- base table's RLS, whatever the view's own WHERE clause says.
  select string_agg(c.relname || ' (' || ac.privilege_type || ' to ' || r.rolname || ')',
                    ', ' order by c.relname, ac.privilege_type, r.rolname) into v_bad
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) ac
    join pg_catalog.pg_roles r on r.oid = ac.grantee
   where n.nspname = 'public' and c.relkind = 'v'
     and r.rolname in ('anon', 'authenticated')
     and ac.privilege_type <> 'SELECT';
  if v_bad is not null then
    raise exception 'views writable by end users: %', v_bad;
  end if;

  select string_agg(distinct c.relationship::text, ', ') into v_bad
    from app.capabilities c
   where c.relationship::text not in (
     'student_self','guardian_full','guardian_standard','guardian_view_only',
     'staff_assigned_read','staff_assigned_write','class_staff','org_admin',
     'grant_evaluator','grant_provider','grant_review','grant_transfer','platform_support');
  if v_bad is not null then raise exception 'unreachable relationships in the matrix: %', v_bad; end if;

  select string_agg(distinct pol.polrelid::regclass::text, ', ') into v_bad
    from pg_catalog.pg_policy pol
   where pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) like '%can_write_student%'
     and pol.polrelid::regclass::text not in ('ai_suggestions', 'public.ai_suggestions');
  if v_bad is not null then
    raise exception 'policies still gating on can_write_student: %', v_bad;
  end if;
end;
$fn$;

revoke all on function app.assert_schema_invariants() from public, anon, authenticated;
grant execute on function app.assert_schema_invariants() to service_role;

comment on view public.ai_usage_summary is
  'Organization-admin view of AI cost and usage. Deliberately SECURITY DEFINER '
  'so an org admin can read aggregates without reading provider internals, '
  'which are withheld by column projection rather than by policy. READ ONLY: '
  'end users hold SELECT and nothing else (0065). A write through a definer '
  'view runs as the view owner and would bypass the base table RLS entirely.';

select app.assert_schema_invariants();
