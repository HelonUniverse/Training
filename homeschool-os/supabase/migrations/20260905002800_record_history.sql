-- =============================================================================
-- 0028  Temporal history
-- =============================================================================
-- "What did we believe about this student three months ago? What changed? Who
-- changed it? What evidence caused the change?"
--
-- record_history captures the before/after of every change to the tables where
-- that question matters. It complements, rather than replaces, the domain-level
-- history that some tables keep natively (student_skill_events, consents,
-- learning_plans versions).
-- =============================================================================

create table public.record_history (
  id              uuid not null default gen_random_uuid(),
  changed_at      timestamptz not null default now(),
  table_name      text not null,
  record_id       uuid not null,
  operation       app.history_operation not null,
  changed_by      uuid,
  changed_fields  text[] not null default '{}',
  old_data        jsonb,
  new_data        jsonb,
  student_id      uuid,
  organization_id uuid,
  family_id       uuid,
  source_type     text,
  ai_suggestion_id uuid,
  primary key (id, changed_at)
) partition by range (changed_at);

create index record_history_record_idx on public.record_history (table_name, record_id, changed_at desc);
create index record_history_student_idx on public.record_history (student_id, changed_at desc);
create index record_history_org_idx on public.record_history (organization_id, changed_at desc);
create index record_history_actor_idx on public.record_history (changed_by, changed_at desc);

create table public.record_history_default partition of public.record_history default;
select app.secure_partition('public.record_history_default'::regclass);
select app.ensure_month_partitions('public.record_history'::regclass, date '2026-01-01', 36);

create trigger record_history_append_only
  before update or delete on public.record_history
  for each row execute function app.forbid_mutation();

create or replace function app.capture_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_fields text[] := '{}';
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if v_new -> k is distinct from v_old -> k and k not in ('updated_at', 'updated_by') then
        v_fields := v_fields || k;
      end if;
    end loop;
    if array_length(v_fields, 1) is null then
      return null;                      -- nothing meaningful changed
    end if;
  end if;

  insert into public.record_history (
    table_name, record_id, operation, changed_by, changed_fields, old_data, new_data,
    student_id, organization_id, family_id, source_type, ai_suggestion_id)
  values (
    tg_table_name,
    (v_row ->> 'id')::uuid,
    lower(tg_op)::app.history_operation,
    coalesce(auth.uid(), (v_row ->> 'updated_by')::uuid, (v_row ->> 'created_by')::uuid),
    v_fields,
    v_old,
    v_new,
    -- scope columns, falling back to the row's own id on the scope tables
    -- themselves so history stays reachable through the same RLS predicates
    coalesce(nullif(v_row ->> 'student_id', ''),
             case when tg_table_name = 'students' then v_row ->> 'id' end)::uuid,
    coalesce(nullif(v_row ->> 'organization_id', ''),
             case when tg_table_name = 'organizations' then v_row ->> 'id' end)::uuid,
    coalesce(nullif(v_row ->> 'family_id', ''),
             case when tg_table_name = 'families' then v_row ->> 'id' end)::uuid,
    v_row ->> 'source_type',
    nullif(v_row ->> 'ai_suggestion_id', '')::uuid);
  return null;
end;
$$;

-- Attach to the tables whose belief-over-time matters.
create or replace function app.attach_history(p_table regclass)
returns void language plpgsql as $$
begin
  execute format(
    'create trigger capture_history after insert or update or delete on %s
       for each row execute function app.capture_history()', p_table);
end;
$$;

select app.attach_history('public.students');
select app.attach_history('public.student_skills');
select app.attach_history('public.learning_plans');
select app.attach_history('public.learning_goals');
select app.attach_history('public.student_organization_memberships');
select app.attach_history('public.student_staff_assignments');
select app.attach_history('public.student_guardians');
select app.attach_history('public.student_access_grants');
select app.attach_history('public.compliance_requirements');
select app.attach_history('public.student_compliance_records');
select app.attach_history('public.evaluations');
select app.attach_history('public.ai_suggestions');
select app.attach_history('public.organization_members');
select app.attach_history('public.consents');
select app.attach_history('public.documents');
select app.attach_history('public.document_submissions');
select app.attach_history('public.user_permissions');

comment on table public.record_history is
  'Generic before/after capture for belief-bearing tables. Append-only and partitioned monthly.';

alter table public.audit_logs enable row level security;
alter table public.record_history enable row level security;
