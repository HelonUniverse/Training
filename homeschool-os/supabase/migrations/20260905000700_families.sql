-- =============================================================================
-- 0007  Families
-- =============================================================================
-- The family is the durable owner of the student educational record. An
-- organization relationship is a membership that can start and end without the
-- family losing anything (see 0008 student_organization_memberships and 0023
-- data_ownership_registry).
-- =============================================================================

create table public.families (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  primary_guardian_id   uuid references public.profiles(id),
  state_code            char(2),
  county                text,
  timezone              text not null default 'America/New_York',
  default_locale        text not null default 'en-US' references public.locales(code),
  homeschool_start_date date,
  is_independent        boolean not null default true,
  attendance_enabled    boolean not null default false,   -- attendance is opt-in for families
  settings              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id),
  updated_by            uuid references public.profiles(id),
  deleted_at            timestamptz,
  deleted_by            uuid references public.profiles(id)
);
create index families_primary_guardian_idx on public.families (primary_guardian_id);
create index families_state_idx on public.families (state_code, county);
select app.attach_updated_at('public.families');

comment on column public.families.attendance_enabled is
  'Attendance tracking is never forced on an independent homeschool family (product rule 16).';

create table public.family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        app.family_member_role not null default 'guardian',
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  unique (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);
select app.attach_updated_at('public.family_members');

-- Family <-> organization relationship (the business relationship: enrollment
-- paperwork, billing later). Student-level access is governed separately by
-- student_organization_memberships so a family can enrol one child and not another.
create table public.family_organization_memberships (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status          app.membership_status not null default 'pending',
  started_on      date,
  ended_on        date,
  end_reason      text,
  data_sharing    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  constraint family_org_membership_dates_ck check (ended_on is null or started_on is null or ended_on >= started_on)
);
create index family_org_memberships_family_idx on public.family_organization_memberships (family_id);
create index family_org_memberships_org_active_idx
  on public.family_organization_memberships (organization_id) where status = 'active';
select app.attach_updated_at('public.family_organization_memberships');

alter table public.invitations
  add constraint invitations_family_fk foreign key (family_id) references public.families(id) on delete cascade;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_organization_memberships enable row level security;
