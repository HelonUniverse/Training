-- =============================================================================
-- 0027  Audit log (append-only, partitioned)
-- =============================================================================
-- Sensitive events are recorded here and never modified. There is no UPDATE or
-- DELETE policy for any role, and a trigger blocks both even for the owner.
-- =============================================================================

create table public.audit_logs (
  id              uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  actor_user_id   uuid references public.profiles(id) on delete set null,
  actor_role      text,
  action          app.audit_action not null,
  subject_type    text,
  subject_id      uuid,
  student_id      uuid,
  organization_id uuid,
  family_id       uuid,
  ip              inet,
  user_agent      text,
  request_id      text,
  metadata        jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);

create index audit_logs_student_idx on public.audit_logs (student_id, created_at desc);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);
create index audit_logs_subject_idx on public.audit_logs (subject_type, subject_id);

create table public.audit_logs_default partition of public.audit_logs default;
select app.secure_partition('public.audit_logs_default'::regclass);
select app.ensure_month_partitions('public.audit_logs'::regclass, date '2026-01-01', 36);

create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function app.forbid_mutation();

comment on table public.audit_logs is
  'Append-only. Guardians can read the access log for their own children - '
  'visible provenance of who looked at a child''s records is a trust feature.';

-- Single entry point used by server actions and edge functions.
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
declare v_id uuid;
begin
  insert into public.audit_logs (
    actor_user_id, action, subject_type, subject_id, student_id,
    organization_id, family_id, metadata, ip, user_agent, request_id)
  values (
    coalesce(p_actor, auth.uid()), p_action, p_subject_type, p_subject_id, p_student_id,
    p_organization_id, p_family_id, coalesce(p_metadata, '{}'::jsonb),
    nullif(current_setting('request.headers.x-forwarded-for', true), '')::inet,
    nullif(current_setting('request.headers.user-agent', true), ''),
    nullif(current_setting('request.id', true), ''))
  returning id into v_id;
  return v_id;
exception when others then
  -- Auditing must never take down the operation it is recording; failures are
  -- surfaced as a warning and picked up by log-based alerting.
  raise warning 'audit write failed for action %: %', p_action, sqlerrm;
  return null;
end;
$$;

grant execute on function app.audit(app.audit_action, text, uuid, uuid, uuid, uuid, jsonb, uuid)
  to authenticated, service_role;
