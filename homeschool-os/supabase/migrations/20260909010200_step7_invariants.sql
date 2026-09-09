-- =============================================================================
-- 0083  Making the retired semantics unable to come back
-- =============================================================================
-- 0081 and 0082 removed a percentage on a child, a state that called an absence
-- of evidence "not started", and an enum that answered three questions at once.
-- A decision that lives only in a migration is a decision that comes back under
-- a slightly different column name in eighteen months.
--
-- So it goes in the invariant function, following the precedent 0072 set when it
-- forbade `framework`, `framework_ref` and their synonyms from reappearing on
-- `public.skills`. Same mechanism, same reasoning: an exact list of names rather
-- than a pattern, so it catches the column coming back under its old name or an
-- obvious synonym without arguing about a future legitimate column that happens
-- to contain the word.
--
-- Three new invariants:
--
--   1. No retired numeric or grade semantics on the canonical profile tables.
--   2. `app.skill_state` has EXACTLY four labels. This is what makes
--      `refresh_suggested` structurally impossible to store as a state: it is
--      not in the enum, and a later `ALTER TYPE ... ADD VALUE` to put it there
--      fails this check. Refresh is an advisory signal (STEP 7 phase 4), and a
--      signal that can be written into the state column is a signal that will
--      eventually downgrade a child.
--   3. An unreviewed AI proposal may not carry a state. Enforced as a table
--      constraint below AND asserted here, because the constraint can be dropped
--      and the invariant notices.
-- =============================================================================

-- An unreviewed AI proposal contributes nothing to what we believe about a
-- child. It may exist as a row - that is the review queue - but its state stays
-- `unknown` until a person decides. "AI proposes, humans decide", made
-- structural rather than procedural.
alter table public.student_skills
  add constraint student_skills_unreviewed_ai_has_no_state_ck check (
    record_provenance <> 'ai_proposed_unreviewed' or skill_state = 'unknown');

alter table public.student_skill_events
  add constraint sse_unreviewed_ai_has_no_state_ck check (
    record_provenance <> 'ai_proposed_unreviewed'
    or skill_state is null or skill_state = 'unknown');

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
  -- STEP 7: the retired mastery semantics may not reappear on the canonical
  -- profile tables. `score` was a 0-100 percentage on a child; `mastery_level`
  -- defaulted to a verdict; the rest are the synonyms it would come back as.
  select string_agg(c.relname || '.' || a.attname, ', ' order by c.relname, a.attname)
    into v_bad
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('student_skills', 'student_skill_events')
     and a.attnum > 0 and not a.attisdropped
     and a.attname in ('score', 'mastery_level', 'percent', 'percentage', 'grade_level');
  if v_bad is not null then
    raise exception
      'a child is not a percentage and an absence of evidence is not a verdict; % must not exist',
      v_bad;
  end if;

  -- STEP 7: the state model is exactly four labels. This is what keeps
  -- refresh_suggested out of the state column: adding it to the enum fails here.
  select string_agg(e.enumlabel, ', ' order by e.enumsortorder) into v_bad
    from pg_catalog.pg_enum e
    join pg_catalog.pg_type t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'app' and t.typname = 'skill_state';
  if v_bad is distinct from 'unknown, emerging, developing, secure' then
    raise exception
      'app.skill_state must be exactly unknown, emerging, developing, secure - found: %',
      coalesce(v_bad, '(missing)');
  end if;

  -- STEP 7: evidence confidence is a strength scale and nothing else. If a
  -- source or a provenance word ever appears among its labels, the axes have
  -- been re-merged.
  select string_agg(e.enumlabel, ', ' order by e.enumsortorder) into v_bad
    from pg_catalog.pg_enum e
    join pg_catalog.pg_type t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'app' and t.typname = 'evidence_confidence';
  if v_bad is distinct from 'preliminary, supported, corroborated' then
    raise exception
      'app.evidence_confidence must be exactly preliminary, supported, corroborated - found: %',
      coalesce(v_bad, '(missing)');
  end if;

  -- STEP 7: the structural guarantee that an unreviewed AI proposal carries no
  -- state. The table constraints do the enforcing; this notices if one is
  -- dropped.
  -- Checked BY NAME. Matching any constraint whose text mentions
  -- ai_proposed_unreviewed was too loose: student_skills also carries
  -- student_skills_secure_requires_human_ck, which mentions it for a different
  -- reason, so dropping the real guarantee left the check satisfied by its
  -- neighbour. Found by the negative test that exists to drop it.
  select string_agg(x.want, ', ' order by x.want) into v_bad
    from (values ('public.student_skills'::regclass,
                  'student_skills_unreviewed_ai_has_no_state_ck'),
                 ('public.student_skill_events'::regclass,
                  'sse_unreviewed_ai_has_no_state_ck')) as x(rel, want)
   where not exists (
     select 1 from pg_catalog.pg_constraint k
      where k.conrelid = x.rel and k.contype = 'c' and k.conname = x.want);
  if v_bad is not null then
    raise exception 'unreviewed AI proposals are no longer barred from carrying a state: % is missing', v_bad;
  end if;
end;
$fn$;


revoke all on function app.assert_schema_invariants() from public, anon, authenticated;
grant execute on function app.assert_schema_invariants() to service_role;

select app.assert_schema_invariants();
