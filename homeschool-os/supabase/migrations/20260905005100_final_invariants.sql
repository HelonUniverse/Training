-- =============================================================================
-- 0049  STEP 2.5 - re-assert every invariant after the performance rewrite
-- =============================================================================
-- 0048 dropped and recreated policies and added five helper functions, so the
-- invariants are re-checked here. This is the last migration: if it passes, the
-- deployed schema satisfies every structural rule the project relies on.
-- =============================================================================

select app.assert_schema_invariants();

do $$
declare v_bad text;
begin
  -- no scalar authorization function may appear in a policy on a table that grows
  select string_agg(distinct pol.polrelid::regclass::text, ', ') into v_bad
    from pg_policy pol
   where pol.polcmd in ('r', '*')
     and (pg_get_expr(pol.polqual, pol.polrelid) like '%can_read_document(%'
          or pg_get_expr(pol.polqual, pol.polrelid) like '%can_read_class(%')
     and replace(pol.polrelid::regclass::text, 'public.', '') in
         ('documents', 'calendar_event_instances', 'calendar_events', 'class_students',
          'lessons', 'assignments', 'event_participants', 'lesson_groups', 'classes');
  if v_bad is not null then
    raise exception 'per-row authorization function in a SELECT policy on a large table: %', v_bad;
  end if;
end $$;
