-- =============================================================================
-- 0040  STEP 2.5 - typed grant sections, explicit document visibility, sharing
-- =============================================================================

-- --- grant sections become typed --------------------------------------------
-- Sections were free-form jsonb, which cannot be checked against the capability
-- matrix. They are now a typed array of resources, so an evaluator grant reads
-- as exactly the list of resources it opens.
create or replace function app.jsonb_to_resource_types(p_value jsonb)
returns app.resource_type[] language sql immutable as $$
  select coalesce(
    (select array_agg(x::app.resource_type)
       from jsonb_array_elements_text(coalesce(p_value, '[]'::jsonb)) as x
      where x in (select unnest(enum_range(null::app.resource_type))::text)),
    '{}'::app.resource_type[]);
$$;

alter table public.student_access_grants alter column sections drop default;
alter table public.student_access_grants
  alter column sections type app.resource_type[] using app.jsonb_to_resource_types(sections);
alter table public.student_access_grants
  alter column sections set default array['portfolio','document','assessment','reading_log']::app.resource_type[];
alter table public.student_access_grants
  add constraint sag_sections_not_empty_ck check (array_length(sections, 1) is not null);

comment on column public.student_access_grants.sections is
  'Exactly which resources this grant opens. A section-scoped capability in '
  'app.capabilities additionally requires the resource to appear here, so an '
  'evaluator grant never becomes generic student read authority.';

create index sag_sections_idx on public.student_access_grants using gin (sections);

-- --- document visibility becomes explicit ------------------------------------
alter table public.documents drop constraint documents_visibility_check;
alter table public.documents alter column visibility drop default;
alter table public.documents alter column visibility type app.document_visibility
  using (case visibility
           when 'private'      then 'family_private'
           when 'family'       then 'family_shared'
           when 'staff'        then 'academic_shared'
           when 'organization' then 'organization_operational'
           else 'family_private'
         end)::app.document_visibility;
-- Default is PRIVATE: a parent-uploaded record is not visible to staff unless
-- the upload flow or an explicit share says so.
alter table public.documents alter column visibility set default 'family_private'::app.document_visibility;

create index documents_visibility_idx on public.documents (student_id, visibility)
  where deleted_at is null;

comment on column public.documents.visibility is
  'family_private   - uploader and full guardians only
   family_shared    - the whole family
   academic_shared  - family plus staff with academic access to the student
   assigned_staff   - family plus explicitly assigned staff (never class staff)
   evaluator_shared - family plus evaluators holding an active document-scoped grant
   organization_operational - the organization only; the family sees it only if shared
   system_compliance - compliance artefacts: family and platform';

-- --- explicit, auditable sharing ---------------------------------------------
create table public.document_shares (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  student_id        uuid references public.students(id) on delete cascade,
  shared_with_user_id uuid references public.profiles(id) on delete cascade,
  shared_with_grant_id uuid references public.student_access_grants(id) on delete cascade,
  shared_with_organization_id uuid references public.organizations(id) on delete cascade,
  can_download      boolean not null default true,
  reason            text,
  shared_by         uuid not null references public.profiles(id),
  shared_at         timestamptz not null default now(),
  expires_at        timestamptz,
  revoked_at        timestamptz,
  revoked_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint document_shares_target_ck check (
    num_nonnulls(shared_with_user_id, shared_with_grant_id, shared_with_organization_id) = 1)
);
create index document_shares_document_idx on public.document_shares (document_id) where revoked_at is null;
create index document_shares_user_idx on public.document_shares (shared_with_user_id) where revoked_at is null;
create index document_shares_grant_idx on public.document_shares (shared_with_grant_id) where revoked_at is null;
select app.attach_updated_at('public.document_shares');
alter table public.document_shares enable row level security;

comment on table public.document_shares is
  'An explicit share of one document with one party. Sharing and revoking are '
  'audited by trigger, so "who did this document reach, and who let them" is answerable.';

-- Sharing a document is an auditable event, always.
create or replace function app.audit_document_share()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_doc public.documents;
begin
  select * into v_doc from public.documents d where d.id = coalesce(new.document_id, old.document_id);
  if tg_op = 'INSERT' then
    perform app.audit('document_shared', 'documents', new.document_id, coalesce(new.student_id, v_doc.student_id),
      v_doc.organization_id, v_doc.family_id,
      jsonb_build_object('share_id', new.id,
                         'shared_with_user_id', new.shared_with_user_id,
                         'shared_with_grant_id', new.shared_with_grant_id,
                         'shared_with_organization_id', new.shared_with_organization_id,
                         'expires_at', new.expires_at, 'reason', new.reason));
  elsif tg_op = 'UPDATE' and new.revoked_at is not null and old.revoked_at is null then
    perform app.audit('document_unshared', 'documents', new.document_id, coalesce(new.student_id, v_doc.student_id),
      v_doc.organization_id, v_doc.family_id,
      jsonb_build_object('share_id', new.id, 'revoked_by', new.revoked_by));
  end if;
  return null;
end;
$$;
create trigger audit_document_share
  after insert or update on public.document_shares
  for each row execute function app.audit_document_share();

-- Changing a document's visibility is also an auditable event.
create or replace function app.audit_document_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility is distinct from old.visibility then
    perform app.audit('document_visibility_changed', 'documents', new.id, new.student_id,
      new.organization_id, new.family_id,
      jsonb_build_object('from', old.visibility, 'to', new.visibility));
  end if;
  return null;
end;
$$;
create trigger audit_document_visibility
  after update of visibility on public.documents
  for each row execute function app.audit_document_visibility();
