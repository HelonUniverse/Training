-- =============================================================================
-- 0046  STEP 2.5 - the data export authorization boundary
-- =============================================================================
-- STEP 12 builds the export. STEP 2.5 fixes the boundary now, so the export
-- cannot be written against a vaguer rule later.
--
-- A family export answers: "everything about MY child that the family owns."
-- It must never contain another party's private material.
-- =============================================================================

alter table public.data_ownership_registry
  add column export_filter text,
  add column export_excludes text;

comment on column public.data_ownership_registry.export_filter is
  'Row-level predicate the export job must apply to this table, in addition to '
  'included_in_family_export. Null means "all rows for the student".';
comment on column public.data_ownership_registry.export_excludes is
  'Human-readable statement of what is deliberately withheld and why.';

update public.data_ownership_registry set
  export_filter = 'visibility in (''family'',''all'')',
  export_excludes = 'Notes marked private_to_author or staff belong to their author and the organization.'
 where table_name = 'teacher_notes';

update public.data_ownership_registry set
  export_filter = 'record_class <> ''organization_operational'' and visibility <> ''organization_operational''',
  export_excludes = 'Organization operational documents (contracts, HR, internal admin) are not family records.'
 where table_name = 'documents';

update public.data_ownership_registry set
  export_filter = 'shared_with_family',
  export_excludes = 'Incident documentation stays with the organization unless it was shared with the family.'
 where table_name = 'incident_reports';

update public.data_ownership_registry set
  export_excludes = 'Staff HR records are never part of a family export.'
 where table_name = 'staff_records';

update public.data_ownership_registry set
  export_excludes = 'AI provider, model, prompt and error telemetry is platform-internal.'
 where table_name = 'ai_usage_events';

update public.data_ownership_registry set
  export_filter = 'guardian_id = :requesting_user_id or subject_student_id = :student_id',
  export_excludes = 'Another guardian''s consent metadata (IP, user agent) is theirs, not the requester''s.'
 where table_name = 'consents';

update public.data_ownership_registry set
  export_excludes = 'Organization contracts, policies and financial documents belong to the organization.'
 where table_name = 'organization_documents';

-- The documents table needs its own row now that it carries record_class.
insert into public.data_ownership_registry
  (table_name, record_class, owner, family_retains_on_exit, org_retains_on_exit,
   included_in_family_export, export_filter, export_excludes, notes)
values
  ('documents', 'student_educational', 'family', true, false, true,
   'record_class <> ''organization_operational''',
   'Organization operational documents are excluded.',
   'Family uploads and student work travel with the student.'),
  ('document_shares', 'student_educational', 'family', true, true, true, null,
   null, 'The sharing trail is part of the record on both sides.'),
  ('record_history', 'platform', 'platform', false, false, false, null,
   'Raw before/after snapshots may contain another party''s data.',
   'History is surfaced through the product, not as a raw export.'),
  ('reports', 'student_educational', 'family', true, false, true, null, null, null),
  ('notifications', 'platform', 'platform', false, false, false, null, null, null)
on conflict (table_name) do nothing;

-- Authorization gate for the export itself: a full guardian only.
create or replace function app.can_export_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.can_student_action(p_student, 'student_profile', 'export');
$$;

-- The manifest the STEP 12 export job must follow. It is data, not code, so the
-- boundary is reviewable without reading the exporter.
create or replace function app.export_manifest(p_student uuid)
returns table (
  table_name text,
  record_class app.record_class,
  owner text,
  included boolean,
  export_filter text,
  excluded_because text)
language sql stable security definer set search_path = '' as $$
  select r.table_name, r.record_class, r.owner,
         r.included_in_family_export and app.can_export_student(p_student) as included,
         r.export_filter,
         case
           when not app.can_export_student(p_student)
             then 'caller lacks student_profile.export authority'
           when not r.included_in_family_export
             then coalesce(r.export_excludes, 'not a family-owned record')
           else null
         end
    from public.data_ownership_registry r
   order by r.record_class, r.table_name;
$$;

comment on function app.export_manifest(uuid) is
  'What a family data export may contain for this student, and why anything is '
  'withheld. The STEP 12 exporter reads this rather than hard-coding a list.';

revoke all on function app.can_export_student(uuid), app.export_manifest(uuid)
  from public, anon, authenticated;
grant execute on function app.can_export_student(uuid), app.export_manifest(uuid)
  to authenticated, service_role;

-- Deploy-time check: nothing another party owns may be marked exportable.
do $$
declare v_bad text;
begin
  select string_agg(table_name, ', ') into v_bad
    from public.data_ownership_registry
   where included_in_family_export
     and table_name in ('staff_records','organization_documents','ai_usage_events',
                        'audit_logs','job_queue','record_history','incident_reports');
  if v_bad is not null then
    raise exception 'tables owned by another party marked exportable: %', v_bad;
  end if;
end $$;
