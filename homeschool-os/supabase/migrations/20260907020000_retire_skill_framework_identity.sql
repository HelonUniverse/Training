-- =============================================================================
-- 0072  A standard is never a skill's identity
-- =============================================================================
-- PRE-STEP 6 CORRECTION, before the first real standards ingestion.
--
-- 0014 gave public.skills two columns - `framework` and `framework_ref` - that
-- let a Nestra skill BE an external standard, with a unique index enforcing one
-- skill per (framework, code). That is the reversed relationship the child-paced
-- architecture forbids (docs/architecture/17-child-paced-learning.md):
--
--     Student -> Skills -> Evidence -> Readiness -> Learning Path
--       and, hanging off Skills and feeding nothing back:
--     Skill -> Standards Crosswalk -> External Framework References
--
-- Two concrete failures follow from the old shape. A skill whose identity is its
-- B.E.S.T. code cannot also be a Common Core code, so the same piece of learning
-- has to exist twice. And when a framework is revised or withdrawn, the SKILL
-- has to be rewritten - which means a child's learning history moves because a
-- state changed a document. 0067 added public.skill_standards as the crosswalk;
-- STEP 5 left these columns alone only because STEP 1-4 was not being
-- redesigned. Loading a real framework on top of two competing representations
-- is how the wrong one wins, so they go now, while nothing populates them.
--
-- THE GOVERNING RULE: a standard can disappear tomorrow and the child's learning
-- history must still make sense.
--
-- Audited before writing this (managed homeschool-os-dev and the local build):
-- 26 skills, every one framework = 'internal' and framework_ref = null. No
-- policy, function or view reads either column; no application code references
-- them. So this is the clean retirement of requirement 4, not a data migration.
--
-- It still REFUSES rather than destroys if it meets a database where that is
-- untrue. A migration is run in environments its author never saw, and dropping
-- a column is how provenance is lost silently.
-- =============================================================================

do $$
declare v_n integer; v_sample text;
begin
  select count(*), string_agg(coalesce(code, id::text) || ' -> ' ||
                              framework::text || '/' || coalesce(framework_ref, '(null)'),
                              ', ' order by code)
    into v_n, v_sample
    from public.skills
   where framework_ref is not null or framework <> 'internal';

  if v_n > 0 then
    raise exception
      'STOP: % skill(s) still carry external-framework identity: %', v_n, left(v_sample, 400)
      using errcode = 'check_violation',
            hint = 'Move each into public.standards + public.skill_standards first, '
                   'preserving provenance (source_url, verified_by, verified_at), '
                   'verify the crosswalk rows, and only then re-run this migration.';
  end if;
end $$;

-- --- the legacy representation goes ------------------------------------------
-- The index first: it is the part that actively enforced "one skill per standard
-- code", which is the rule being reversed.
drop index if exists public.skills_framework_ref_idx;

alter table public.skills
  drop column if exists framework_ref,
  drop column if exists framework;

-- Nothing else used it. Leaving the type behind leaves the invitation behind.
drop type if exists app.skill_framework;

comment on table public.skills is
  'The canonical Nestra learning model. A skill is identified by what it IS, '
  'never by an external framework code: standards attach through '
  'public.skill_standards, many frameworks pointing at one skill. A skill is '
  'valid with zero standards mappings and unchanged by gaining, losing or '
  'superseding any number of them.';

-- --- and cannot come back -----------------------------------------------------
-- Copied verbatim from 0065 with one rule appended. A security predicate is not
-- something to retype from memory.
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

  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app','public') and p.prokind = 'f'
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  if v_bad is not null then raise exception 'functions without a pinned search_path: %', v_bad; end if;

  select string_agg(c.relname, ', ' order by c.relname) into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=true%'
     and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_barrier=true%';
  if v_bad is not null then
    raise exception 'definer views without security_barrier: %', v_bad;
  end if;

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

  -- STEP 6: no standards field may reappear ON public.skills. The crosswalk is
  -- the only place a framework code lives. This is deliberately a list of exact
  -- names rather than a pattern - it must catch the column coming back under its
  -- old name or an obvious synonym, without arguing about some future legitimate
  -- column that happens to contain the word.
  select string_agg(a.attname, ', ' order by a.attname) into v_bad
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'skills'
     and a.attnum > 0 and not a.attisdropped
     and a.attname in ('framework', 'framework_ref', 'standard', 'standard_id',
                       'standard_ref', 'standard_code', 'standards_code');
  if v_bad is not null then
    raise exception 'a standard is not a skill''s identity; skills.% must live in skill_standards', v_bad;
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
