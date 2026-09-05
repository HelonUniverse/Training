-- =============================================================================
-- 0003  Utility functions and triggers
-- =============================================================================

-- Keeps updated_at honest. Attached to every mutable table.
create or replace function app.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps updated_by from the JWT when the caller did not set it explicitly.
create or replace function app.set_updated_by()
returns trigger language plpgsql as $$
begin
  if new.updated_by is null or new.updated_by is not distinct from old.updated_by then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Blocks UPDATE/DELETE outright. Used for append-only tables (consents, audit).
create or replace function app.forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only; % is not permitted', tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

-- Attaches the standard updated_at trigger to a table.
create or replace function app.attach_updated_at(p_table regclass)
returns void language plpgsql as $$
begin
  execute format(
    'create trigger set_updated_at before update on %s
       for each row execute function app.set_updated_at()', p_table);
end;
$$;

-- Locks down a partition: RLS is not inherited from the parent, and a partition
-- is itself a table that `authenticated` could otherwise query directly, which
-- would bypass the parent's policies entirely.
create or replace function app.secure_partition(p_partition regclass)
returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security', p_partition);
  execute format('revoke all on %s from authenticated, anon', p_partition);
end;
$$;

-- Creates monthly partitions for a range-partitioned table (audit_logs,
-- record_history). Idempotent; called by migrations and by the nightly job.
create or replace function app.ensure_month_partitions(
  p_parent regclass, p_from date, p_months int)
returns void language plpgsql as $$
declare
  v_start  date;
  v_end    date;
  v_name   text;
  v_parent text := (select c.relname from pg_class c where c.oid = p_parent);
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
$$;

-- Deterministic dedupe key for auto-generated activity log rows.
create or replace function app.dedupe_key(p_source_type text, p_source_id uuid)
returns text language sql immutable as $$
  select case when p_source_id is null then null else p_source_type || ':' || p_source_id::text end;
$$;
