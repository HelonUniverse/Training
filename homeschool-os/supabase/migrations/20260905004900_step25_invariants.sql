-- =============================================================================
-- 0047  STEP 2.5 - deploy-blocking invariants (re-asserted after the rebuild)
-- =============================================================================
-- 0036 asserted these for the STEP 2 schema. The policy surface and function
-- layer were rebuilt in 0041-0046, so every invariant is re-asserted here and
-- extended with the STEP 2.5 rules.
-- =============================================================================

create or replace function app.assert_schema_invariants()
returns void language plpgsql set search_path = '' as $$
declare v_bad text;
begin
  -- 1. RLS on every table
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_bad is not null then raise exception 'RLS not enabled on: %', v_bad; end if;

  -- 2. every table has at least one policy (service-role-only tables excepted)
  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relispartition
     and not exists (select 1 from pg_catalog.pg_policy p where p.polrelid = c.oid)
     and c.relname not in ('job_queue');
  if v_bad is not null then raise exception 'tables with no policy: %', v_bad; end if;

  -- 3. partitions are sealed
  select string_agg(partition_name || ': ' || problem, '; ') into v_bad
    from app.assert_partition_security();
  if v_bad is not null then raise exception 'insecure partitions: %', v_bad; end if;

  -- 4. no app function reachable by public/anon
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and (pg_catalog.has_function_privilege('public', p.oid, 'execute')
          or pg_catalog.has_function_privilege('anon', p.oid, 'execute'));
  if v_bad is not null then raise exception 'app functions public/anon executable: %', v_bad; end if;

  -- 5. every SECURITY DEFINER function pins search_path
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app','public') and p.prosecdef
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  if v_bad is not null then raise exception 'definer functions without search_path: %', v_bad; end if;

  -- 6. every capability references a relationship the resolver can actually
  --    produce, so no row in the matrix is silently dead
  select string_agg(distinct c.relationship::text, ', ') into v_bad
    from app.capabilities c
   where c.relationship::text not in (
     'student_self','guardian_full','guardian_standard','guardian_view_only',
     'staff_assigned_read','staff_assigned_write','class_staff','org_admin',
     'grant_evaluator','grant_provider','grant_review','grant_transfer','platform_support');
  if v_bad is not null then raise exception 'unreachable relationships in the matrix: %', v_bad; end if;

  -- 7. no student-scoped policy may still use the blanket write gate where a
  --    resource-scoped check belongs. ai_suggestions is the single documented
  --    exception: accepting a proposal is deliberately gated on general write.
  select string_agg(distinct pol.polrelid::regclass::text, ', ') into v_bad
    from pg_catalog.pg_policy pol
   where pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) like '%can_write_student%'
     and pol.polrelid::regclass::text not in ('ai_suggestions', 'public.ai_suggestions');
  if v_bad is not null then
    raise exception 'policies still gating on can_write_student: %', v_bad;
  end if;
end;
$$;

revoke all on function app.assert_schema_invariants() from public, anon, authenticated;
grant execute on function app.assert_schema_invariants() to service_role;

select app.assert_schema_invariants();

-- A compact, human-readable dump of the authorization model for review.
create or replace view app.authorization_model as
select c.relationship,
       c.resource,
       array_agg(c.action order by c.action) as actions,
       bool_or(c.requires_section) as section_scoped
  from app.capabilities c
 group by c.relationship, c.resource
 order by c.relationship, c.resource;

revoke all on app.authorization_model from public, anon, authenticated;
