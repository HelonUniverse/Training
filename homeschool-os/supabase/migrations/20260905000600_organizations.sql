-- =============================================================================
-- 0006  Organizations, locations, members, invitations
-- =============================================================================

create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique
                        check (slug ~ '^[a-z0-9]([a-z0-9-]{1,60})[a-z0-9]$'),
  type                app.organization_type not null default 'other',
  state_code          char(2) not null,
  county              text,
  timezone            text not null default 'America/New_York',
  default_locale      text not null default 'en-US' references public.locales(code),
  supported_locales   text[] not null default array['en-US', 'es-US'],
  branding            jsonb not null default '{}'::jsonb,   -- logo_url, accent, email_from_name
  settings            jsonb not null default '{}'::jsonb,
  compliance_pack_id  uuid,                                  -- FK added in 0021
  plan                text not null default 'free',          -- billing placeholder, unused in MVP
  status              text not null default 'active'
                        check (status in ('active', 'suspended', 'closed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles(id)
);
create index organizations_state_idx on public.organizations (state_code, county);
create index organizations_name_trgm_idx on public.organizations using gin (name extensions.gin_trgm_ops);
select app.attach_updated_at('public.organizations');

comment on column public.organizations.default_locale is
  'Organization-wide default UI language. A member profile locale overrides it.';

create table public.organization_locations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  address_line1   text,
  address_line2   text,
  city            text,
  state_code      char(2),
  postal_code     text,
  county          text,
  timezone        text,
  capacity        int check (capacity is null or capacity > 0),
  is_primary      boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz
);
create index organization_locations_org_idx on public.organization_locations (organization_id) where deleted_at is null;
create unique index organization_locations_primary_idx
  on public.organization_locations (organization_id) where is_primary and deleted_at is null;
select app.attach_updated_at('public.organization_locations');

create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            app.org_role not null,
  status          app.member_status not null default 'invited',
  location_ids    uuid[] not null default '{}',
  title           text,
  employment_type text,
  started_on      date,
  ended_on        date,
  invited_by      uuid references public.profiles(id),
  joined_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  constraint organization_members_unique unique (organization_id, user_id, role),
  constraint organization_members_dates_ck check (ended_on is null or started_on is null or ended_on >= started_on)
);
create index organization_members_user_active_idx
  on public.organization_members (user_id) where status = 'active';
create index organization_members_org_role_idx
  on public.organization_members (organization_id, role) where status = 'active';
select app.attach_updated_at('public.organization_members');

comment on table public.organization_members is
  'Organization membership grants ORG CONTEXT only (see the calendar, the class list). '
  'Access to a student additionally requires student_staff_assignments or class co-membership. '
  'Only org_admin receives org-wide student access, via app.student_access().';

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id       uuid,                                    -- FK added in 0007
  student_id      uuid,                                    -- FK added in 0008
  email           text not null,
  role            app.org_role,
  invite_kind     text not null default 'org_member'
                    check (invite_kind in ('org_member', 'guardian', 'family', 'evaluator', 'student')),
  token_hash      text not null unique,                    -- sha256 of the emailed token
  payload         jsonb not null default '{}'::jsonb,
  locale          text not null default 'en-US' references public.locales(code),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references public.profiles(id),
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  constraint invitations_scope_ck check (organization_id is not null or family_id is not null)
);
create index invitations_email_idx on public.invitations (lower(email)) where accepted_at is null and revoked_at is null;
create index invitations_org_idx on public.invitations (organization_id);
select app.attach_updated_at('public.invitations');

comment on column public.invitations.token_hash is
  'Only the hash is stored. The raw token exists solely in the delivered email.';

alter table public.organizations enable row level security;
alter table public.organization_locations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
