-- =============================================================================
-- 0050  STEP 2.6 - hardening found by the real-platform acceptance run
-- =============================================================================
-- Two findings from running the STEP 2.5 schema against managed Supabase
-- (PostgreSQL 17.6) and its `get_advisors` linter:
--
--   F1 (ERROR)  public.ai_usage_summary is a SECURITY DEFINER view (it has no
--       security_invoker option, so it executes as its owner and bypasses RLS
--       on ai_usage_events) and it lacked `security_barrier`. Without the
--       barrier the planner may push a cheap user-supplied predicate BELOW the
--       view's own authorization filter, letting a caller observe rows - cost,
--       student_id, organization_id - for organizations they do not administer.
--
--       The view itself stays SECURITY DEFINER on purpose: it is the only
--       mechanism that gives an organization admin cost/usage aggregates while
--       withholding provider internals. RLS is row-level, so granting an admin
--       row access to ai_usage_events would also hand them `provider`, `model`
--       and `error_message`. The view projects a safe column subset instead:
--         id, feature, organization_id, family_id, student_id, input_tokens,
--         output_tokens, cached_tokens, estimated_cost_usd, latency_ms,
--         status, created_at
--       No provider, no model, no prompt, no error text. This is the
--       "do not expose provider internals to normal users" rule, enforced by
--       column projection rather than by policy.
--
--   F2 (WARN x12) Twelve functions in `app` had a role-mutable search_path.
--       None of them is SECURITY DEFINER, so the 0044/0047 invariant did not
--       catch them - that rule only covered definer functions. They are still
--       worth pinning: they are trigger bodies and DDL helpers that run inside
--       other people's transactions, where a caller-controlled search_path can
--       change which operator or function a bare name resolves to.
--
-- Both invariants are asserted at the end so neither can regress.
-- =============================================================================

-- --- F1: barrier + explicit precedence ---------------------------------------
-- The original predicate read `A and B or C`, which parses as `(A and B) or C`.
-- That was the intent, but it is not obvious to a reader, and a future edit
-- could change the meaning silently. The parentheses below are explicit.
create or replace view public.ai_usage_summary
with (security_barrier = true) as
  select e.id,
         e.feature,
         e.organization_id,
         e.family_id,
         e.student_id,
         e.input_tokens,
         e.output_tokens,
         e.cached_tokens,
         e.estimated_cost_usd,
         e.latency_ms,
         e.status,
         e.created_at
    from public.ai_usage_events e
   where (e.organization_id is not null and app.is_org_admin(e.organization_id))
      or app.is_platform_support(e.organization_id, e.student_id);

comment on view public.ai_usage_summary is
  'Organization-admin view of AI cost and usage. Deliberately SECURITY DEFINER: '
  'it bypasses the platform-support-only RLS on ai_usage_events in order to '
  'project a column subset that excludes provider, model and error internals. '
  'security_barrier is REQUIRED - without it the planner can push a caller '
  'supplied predicate below the authorization filter above.';

revoke all on public.ai_usage_summary from public, anon;
grant select on public.ai_usage_summary to authenticated, service_role;

-- --- F2: pin search_path on the remaining app functions ----------------------
alter function app.set_updated_at()                     set search_path = '';
alter function app.set_updated_by()                     set search_path = '';
alter function app.forbid_mutation()                    set search_path = '';
alter function app.attach_updated_at(regclass)          set search_path = '';
alter function app.secure_partition(regclass)           set search_path = '';
alter function app.dedupe_key(text, uuid)               set search_path = '';
alter function app.default_attendance_record_class()    set search_path = '';
alter function app.jsonb_to_resource_types(jsonb)       set search_path = '';
alter function app.protect_document_identity()          set search_path = '';
alter function app.attach_history(regclass)             set search_path = '';
alter function app.event_secure_new_partitions()        set search_path = '';

-- ensure_month_partitions reads pg_class by a bare name, which no longer
-- resolves once search_path is empty. Fully qualify it, then pin.
create or replace function app.ensure_month_partitions(
  p_parent regclass, p_from date, p_months int)
returns void language plpgsql set search_path = '' as $fn$
declare
  v_start  date;
  v_end    date;
  v_name   text;
  v_parent text := (select c.relname from pg_catalog.pg_class c where c.oid = p_parent);
  i int;
begin
  for i in 0 .. p_months - 1 loop
    v_start := date_trunc('month', p_from)::date + make_interval(months => i);
    v_end   := v_start + interval '1 month';
    v_name  := format('%s_%s', v_parent, to_char(v_start, 'YYYY_MM'));
    if to_regclass(format('public.%I', v_name)) is null then
      execute format(
        'create table public.%I partition of %s for values from (%L) to (%L)',
        v_name, p_parent, v_start, v_end);
      perform app.secure_partition(format('public.%I', v_name)::regclass);
    end if;
  end loop;
end;
$fn$;

revoke all on function app.ensure_month_partitions(regclass, date, int)
  from public, anon, authenticated;
grant execute on function app.ensure_month_partitions(regclass, date, int) to service_role;

-- --- the invariants, extended ------------------------------------------------
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

select app.assert_schema_invariants();
