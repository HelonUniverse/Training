-- =============================================================================
-- 0009  Consent architecture (append-only)
-- =============================================================================
-- Consent is an EVENT LOG. Rows are immutable: granting writes a row, revoking
-- writes another row that supersedes it. Nothing is ever updated or deleted, so
-- "what did this family agree to, under which policy version, on which date?"
-- is always answerable.
-- =============================================================================

create table public.consent_policies (
  id              uuid primary key default gen_random_uuid(),
  consent_type    app.consent_type not null,
  version         text not null,                  -- semantic version of the policy text
  locale          text not null default 'en-US' references public.locales(code),
  title           text not null,
  body            text not null,
  document_version text,                          -- version of the linked legal document
  organization_id uuid references public.organizations(id) on delete cascade,
  effective_from  date not null default current_date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  unique (consent_type, version, locale, organization_id)
);
create index consent_policies_type_idx on public.consent_policies (consent_type, effective_from desc);
select app.attach_updated_at('public.consent_policies');

create table public.consents (
  id                   uuid primary key default gen_random_uuid(),
  seq                  bigint generated always as identity,   -- monotonic; breaks now() ties
  consent_type         app.consent_type not null,
  subject_student_id   uuid references public.students(id) on delete restrict,
  subject_user_id      uuid references public.profiles(id) on delete restrict,
  guardian_id          uuid references public.profiles(id) on delete restrict,
  organization_id      uuid references public.organizations(id) on delete restrict,
  family_id            uuid references public.families(id) on delete restrict,
  granted              boolean not null,
  granted_at           timestamptz,
  revoked_at           timestamptz,
  consent_policy_id    uuid references public.consent_policies(id),
  policy_version       text,
  document_version     text,
  locale               text references public.locales(code),
  method               app.consent_method not null default 'web_checkbox',
  scope                jsonb not null default '{}'::jsonb,   -- e.g. {"sections":["portfolio"]}
  metadata             jsonb not null default '{}'::jsonb,   -- ip, user_agent, statement text
  supersedes_id        uuid references public.consents(id),
  recorded_by          uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  constraint consents_subject_ck check (subject_student_id is not null or subject_user_id is not null),
  constraint consents_state_ck check (
    (granted and granted_at is not null and revoked_at is null) or
    (not granted and revoked_at is not null)),
  constraint consents_no_self_supersede_ck check (supersedes_id is distinct from id)
);
create unique index consents_seq_idx on public.consents (seq);
create index consents_student_type_idx on public.consents (subject_student_id, consent_type, seq desc);
create index consents_guardian_idx on public.consents (guardian_id, created_at desc);
create index consents_org_idx on public.consents (organization_id, consent_type) where organization_id is not null;
create index consents_supersedes_idx on public.consents (supersedes_id) where supersedes_id is not null;

-- Immutability: no UPDATE, no DELETE, ever, for anybody including service_role.
create trigger consents_append_only
  before update or delete on public.consents
  for each row execute function app.forbid_mutation();

comment on table public.consents is
  'Append-only consent event log. Revocation inserts a superseding row; history is never rewritten.';

-- Current state per (subject, type, scope owner) derived from the event log.
create view public.current_consents as
select distinct on (consent_type, subject_student_id, subject_user_id, organization_id)
       id as consent_id, consent_type, subject_student_id, subject_user_id, guardian_id,
       organization_id, family_id, granted, granted_at, revoked_at, consent_policy_id,
       policy_version, document_version, method, scope, created_at
  from public.consents
 order by consent_type, subject_student_id, subject_user_id, organization_id, seq desc;

comment on view public.current_consents is
  'Latest consent event per (type, subject, organization). Read this for "is consent in force?".';

-- Helper: is a given consent currently in force?
create or replace function app.has_consent(
  p_consent_type app.consent_type,
  p_student uuid default null,
  p_user uuid default null,
  p_organization uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select c.granted
      from public.consents c
     where c.consent_type = p_consent_type
       and c.subject_student_id is not distinct from p_student
       and c.subject_user_id is not distinct from p_user
       and c.organization_id is not distinct from p_organization
     order by c.seq desc
     limit 1), false);
$$;

alter table public.student_access_grants
  add constraint student_access_grants_consent_fk
  foreign key (consent_id) references public.consents(id);

alter table public.consent_policies enable row level security;
alter table public.consents enable row level security;
