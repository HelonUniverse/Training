-- =============================================================================
-- 0051  STEP 2.6 - drop a duplicate index found by the platform linter
-- =============================================================================
-- 0048 added `cei_class_idx (class_id, starts_at)` to support the rewritten
-- calendar policies, but 0015 had already created `cei_class_start_idx` on
-- exactly the same columns in the same order. The `if not exists` guard did not
-- catch it because the two indexes have different NAMES.
--
-- Two identical indexes cost double the write amplification and double the
-- storage on a table that grows one row per recurring-event occurrence
-- (~40,000 rows in the STEP 2.5 scale seed). Keep the original.
-- =============================================================================

drop index if exists public.cei_class_idx;

do $$
declare v_bad text;
begin
  -- No two indexes in public may cover the same table and the same column list.
  select string_agg(dup, '; ') into v_bad
    from (
      select c.relname || ': ' || string_agg(i.indexrelid::regclass::text, ', ') as dup
        from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
       group by c.relname, i.indrelid, i.indkey::text, i.indclass::text,
                pg_get_expr(i.indpred, i.indrelid), i.indisunique
      having count(*) > 1
    ) s;
  if v_bad is not null then
    raise exception 'duplicate indexes remain: %', v_bad;
  end if;
end $$;
