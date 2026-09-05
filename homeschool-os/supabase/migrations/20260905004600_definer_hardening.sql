-- =============================================================================
-- 0044  STEP 2.5 - SECURITY DEFINER hardening
-- =============================================================================
-- Because FORCE ROW LEVEL SECURITY is intentionally not used, every SECURITY
-- DEFINER function is a potential bypass. Findings and fixes:
--
--   F1  All 41 functions in `app` were EXECUTE-able by PUBLIC (the PostgreSQL
--       default). Fixed below: revoked from PUBLIC/anon, granted to an explicit
--       allowlist only.
--   F2  Authorization helpers accepted a `p_user` argument, letting any
--       authenticated caller ask about another user - `app.my_student_ids(v)`
--       returned a victim's student ids. Fixed in 0041 by removing the argument.
--   F3  app.audit() accepted an arbitrary actor, allowing forged audit entries.
--       Fixed below: a user session can only ever record itself as the actor.
--   F4  DDL helpers (attach_updated_at, attach_history, secure_partition,
--       ensure_month_partitions) execute dynamic DDL. They are not SECURITY
--       DEFINER, so they already ran with the caller's privileges, but EXECUTE
--       is now revoked from application roles anyway.
--
-- Dynamic SQL audit: only the four DDL helpers use EXECUTE, all with
-- format()/%I|%s over regclass or internally-generated identifiers - never over
-- user-supplied text. No SECURITY DEFINER function builds SQL from its
-- arguments.
-- =============================================================================

-- --- F3: a user session may only ever audit itself --------------------------
create or replace function app.audit(
  p_action          app.audit_action,
  p_subject_type    text default null,
  p_subject_id      uuid default null,
  p_student_id      uuid default null,
  p_organization_id uuid default null,
  p_family_id       uuid default null,
  p_metadata        jsonb default '{}'::jsonb,
  p_actor           uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_actor uuid;
begin
  -- An authenticated session cannot attribute an action to somebody else.
  -- p_actor is honoured only when there is no user session, i.e. a trusted
  -- background job running under service_role.
  v_actor := case when auth.uid() is not null then auth.uid() else p_actor end;

  insert into public.audit_logs (
    actor_user_id, action, subject_type, subject_id, student_id,
    organization_id, family_id, metadata, ip, user_agent, request_id)
  values (
    v_actor, p_action, p_subject_type, p_subject_id, p_student_id,
    p_organization_id, p_family_id, coalesce(p_metadata, '{}'::jsonb),
    nullif(current_setting('request.headers.x-forwarded-for', true), '')::inet,
    nullif(current_setting('request.headers.user-agent', true), ''),
    nullif(current_setting('request.id', true), ''))
  returning id into v_id;
  return v_id;
exception when others then
  raise warning 'audit write failed for action %: %', p_action, sqlerrm;
  return null;
end;
$$;

-- --- F1: default-deny on every function in `app` -----------------------------
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'app'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- NOTE: `alter default privileges ... revoke execute on functions from public`
-- does NOT suppress PostgreSQL's built-in PUBLIC EXECUTE default - it creates no
-- pg_default_acl entry and a newly created function is still public-executable
-- (verified on PostgreSQL 16). So there is no "set once and forget" mechanism
-- here: every new function in `app` must revoke explicitly, and the deploy-time
-- assertion at the end of this file and in 0047 is what actually enforces it.

-- --- the explicit allowlist for `authenticated` ------------------------------
-- These and only these are reachable from a user session, because RLS policies
-- and storage policies evaluate them as the calling user. Everything else in
-- `app` - trigger bodies, DDL helpers, internal resolvers - is now unreachable.
grant execute on function
  app.student_access(uuid),
  app.can_read_student(uuid),
  app.can_write_student(uuid),
  app.can_admin_student(uuid),
  app.can_student_action(uuid, app.resource_type, app.resource_action),
  app.my_student_ids(app.access_level),
  app.my_student_ids_for(app.resource_type, app.resource_action),
  app.my_student_relationships(),
  app.org_student_ids(uuid),
  app.my_org_ids(),
  app.my_family_ids(),
  app.is_org_member(uuid, app.org_role[]),
  app.is_org_admin(uuid),
  app.can_read_org(uuid),
  app.is_family_member(uuid),
  app.can_read_profile(uuid),
  app.can_view_organization(uuid),
  app.can_read_family(uuid),
  app.can_read_class(uuid),
  app.can_manage_class(uuid),
  app.is_thread_participant(uuid),
  app.can_read_document(uuid),
  app.can_upload_to_prefix(text),
  app.is_platform_support(uuid, uuid),
  app.has_consent(app.consent_type, uuid, uuid, uuid),
  app.audit(app.audit_action, text, uuid, uuid, uuid, uuid, jsonb, uuid),
  app.dedupe_key(text, uuid)
to authenticated;

-- app.permission_override stays internal: it is called only from inside other
-- definer functions, which run as the owner.

-- --- deploy-blocking checks --------------------------------------------------
do $$
declare v_bad text;
begin
  -- no function in `app` may be executable by PUBLIC or anon
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and (has_function_privilege('public', p.oid, 'execute')
          or has_function_privilege('anon', p.oid, 'execute'));
  if v_bad is not null then
    raise exception 'app functions executable by public/anon: %', v_bad;
  end if;

  -- every SECURITY DEFINER function must pin an empty search_path
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app', 'public') and p.prosecdef
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  if v_bad is not null then
    raise exception 'SECURITY DEFINER functions without a pinned search_path: %', v_bad;
  end if;

  -- no authorization helper may accept a user argument any more
  select string_agg(p.proname, ', ') into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app'
     and p.proname in ('student_access','can_read_student','can_write_student','can_admin_student',
                       'my_student_ids','my_student_ids_for','can_student_action',
                       'my_student_relationships','my_family_ids','my_org_ids','is_platform_support',
                       'can_read_document','can_read_family','can_read_class','can_manage_class',
                       'is_thread_participant','can_read_profile','can_view_organization',
                       'can_upload_to_prefix','is_org_member','is_org_admin','can_read_org',
                       'is_family_member','org_student_ids')
     and pg_get_function_identity_arguments(p.oid) like '%p_user%';
  if v_bad is not null then
    raise exception 'authorization helpers still accept a user argument: %', v_bad;
  end if;
end $$;
