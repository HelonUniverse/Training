-- =============================================================================
-- 0091  The advisory stays advisory
-- =============================================================================
-- Phase 4 rests on one claim above all others: a refresh suggestion changes
-- nothing about a child's characterization. `secure` stays `secure` while a
-- revisit is suggested, and the suggestion is a separate signal sitting beside
-- the state rather than a fifth value inside it.
--
-- Three things make that structural rather than careful:
--
--   1. The refresh path may not WRITE to the profile. Checked at the source -
--      any INSERT or UPDATE against student_skills, student_skill_events or
--      student_skill_overrides inside a refresh function fails this.
--
--   2. The refresh path may not read the reference catalogue, for the same
--      reason and by the same mechanism as the Phase 3 state path. "Relevant"
--      is the word under which grade level walks back in.
--
--   3. The retired numeric semantics may not appear on the Phase 4 table
--      either. The sweep now covers all four profile tables.
--
-- `refresh_suggested` itself needs no guard against becoming a state: 0083 pins
-- app.skill_state to exactly four labels, so adding it to the enum fails there.
-- =============================================================================

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
     and c.relname in ('student_skills', 'student_skill_events',
                       'student_skill_overrides', 'student_skill_refresh_decisions')
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
  -- STEP 7 PHASE 3, (1): the state path may not reach the reference catalogue.
  -- Standards annotate a profile; they never produce one. Checked against the
  -- function source rather than a dependency, because a join written inside
  -- plpgsql leaves no dependency to find.
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app', 'public')
     and p.proname in ('compute_skill_state', 'classified_skill_evidence',
                       'recompute_student_skill', 'explain_student_skill',
                       'set_skill_state_override', 'release_skill_state_override',
                       'exclude_skill_evidence', 'restore_skill_evidence')
     and p.prosrc ~ '\m(standards|skill_standards|standards_texts|standards_domains|standards_crosswalks|standards_framework_versions)\M';
  if v_bad is not null then
    raise exception
      'the skill-state path reads the standards catalogue: %. Standards annotate a profile; they never produce one', v_bad;
  end if;

  -- STEP 7 PHASE 3, (2): nothing here ranks one child against another.
  select string_agg(x.what, ', ' order by x.what) into v_bad from (
    select n.nspname || '.' || p.proname as what
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('app', 'public')
       and p.proname ~ '(percentile|cohort|grade_equivalent|class_rank|peer_compar|on_track|behind_ahead)'
    union all
    select n.nspname || '.' || c.relname
      from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('app', 'public') and c.relkind in ('r', 'v', 'm')
       and c.relname ~ '(percentile|cohort|grade_equivalent|class_rank|peer_compar|on_track|behind_ahead)'
    union all
    select n.nspname || '.' || p.proname
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('app', 'public')
       and p.proname in ('compute_skill_state', 'classified_skill_evidence',
                         'recompute_student_skill', 'explain_student_skill')
       and p.prosrc ~ '\m(percentile_cont|percentile_disc|cume_dist|ntile|dense_rank)\M'
  ) x;
  if v_bad is not null then
    raise exception 'a child is not ranked against other children; % must not exist', v_bad;
  end if;

  -- STEP 7 PHASE 3, (3): a machine may not compute `secure`, and a human
  -- decision is the state in force. Both are check constraints; this notices if
  -- either is dropped.
  select string_agg(x.want, ', ' order by x.want) into v_bad
    from (values ('public.student_skills'::regclass,
                  'student_skills_computed_state_never_secure_ck'),
                 ('public.student_skills'::regclass,
                  'student_skills_override_is_effective_ck')) as x(rel, want)
   where not exists (
     select 1 from pg_catalog.pg_constraint k
      where k.conrelid = x.rel and k.contype = 'c' and k.conname = x.want);
  if v_bad is not null then
    raise exception
      'a human decision no longer outranks a computed state, or a machine may now decide secure: % is missing', v_bad;
  end if;

  -- STEP 7 PHASE 4, (1): the refresh path may not write to the profile. A
  -- suggestion that can move a state is not a suggestion.
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app', 'public')
     and p.proname in ('refresh_advisory', 'skill_relevance_reasons',
                       'explain_skill_refresh', 'record_refresh_decision',
                       'dismiss_skill_refresh', 'request_skill_revisit',
                       'complete_skill_revisit')
     and p.prosrc ~* '(insert\s+into|update)\s+(public\.)?(student_skills|student_skill_events|student_skill_overrides)\M';
  if v_bad is not null then
    raise exception
      'a refresh suggestion may not change what Nestra says about a child, and % writes to the profile', v_bad;
  end if;

  -- STEP 7 PHASE 4, (2): nor may it reach the reference catalogue. Relevance is
  -- what this family is doing, never what a child of this age is expected to do.
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('app', 'public')
     and p.proname in ('refresh_advisory', 'skill_relevance_reasons',
                       'explain_skill_refresh', 'record_refresh_decision',
                       'dismiss_skill_refresh', 'request_skill_revisit',
                       'complete_skill_revisit', 'set_family_refresh_advisory')
     and p.prosrc ~ '\m(standards|skill_standards|standards_texts|standards_domains|standards_crosswalks|standards_framework_versions)\M';
  if v_bad is not null then
    raise exception
      'the refresh advisory reads the standards catalogue: %. Relevance is what this family is doing, not what a grade expects', v_bad;
  end if;

end;
$fn$;

revoke all on function app.assert_schema_invariants() from public, anon, authenticated;
grant execute on function app.assert_schema_invariants() to service_role;

select app.assert_schema_invariants();
