-- =============================================================================
-- 0008  Students and the access graph
-- =============================================================================
-- The student <-> organization relationship is LONGITUDINAL: it is modelled as
-- a history of memberships, never as a single current foreign key. A student
-- may move between organizations across academic years and must retain one
-- continuous educational history.
-- =============================================================================

create table public.students (
  id                        uuid primary key default gen_random_uuid(),
  family_id                 uuid not null references public.families(id) on delete restrict,
  user_id                   uuid unique references public.profiles(id) on delete set null,
  primary_organization_id   uuid references public.organizations(id) on delete set null,
  legal_first_name          text not null,
  legal_middle_name         text,
  legal_last_name           text not null,
  preferred_name            text,
  date_of_birth             date not null check (date_of_birth > date '1900-01-01'),
  grade_level               text,                        -- 'pre_k','K','1'..'12','ungraded'
  grade_equivalent          jsonb not null default '{}'::jsonb,
  homeschool_start_date     date,
  current_academic_year_id  uuid,                         -- FK added in 0011
  state_code                char(2),
  county                    text,
  photo_path                text,
  locale                    text references public.locales(code),
  learning_preferences      jsonb not null default '{}'::jsonb,
  support_needs             jsonb not null default '{}'::jsonb,
  goals                     text,
  status                    app.student_status not null default 'active',
  archived_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references public.profiles(id),
  updated_by                uuid references public.profiles(id),
  deleted_at                timestamptz,
  deleted_by                uuid references public.profiles(id)
);
create index students_family_idx on public.students (family_id) where deleted_at is null;
create index students_primary_org_idx on public.students (primary_organization_id) where deleted_at is null;
create index students_status_idx on public.students (status) where deleted_at is null;
create index students_name_trgm_idx on public.students using gin (
  (coalesce(preferred_name, '') || ' ' || legal_first_name || ' ' || legal_last_name)
  extensions.gin_trgm_ops);
select app.attach_updated_at('public.students');

comment on column public.students.primary_organization_id is
  'DENORMALISED CONVENIENCE ONLY, maintained by trigger from the active membership. '
  'It is never used for access decisions - student_organization_memberships is authoritative.';

alter table public.invitations
  add constraint invitations_student_fk foreign key (student_id) references public.students(id) on delete cascade;

-- --- guardians ---------------------------------------------------------------
create table public.student_guardians (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  relationship        text,
  is_primary          boolean not null default false,
  access_level        app.guardian_access_level not null default 'full',
  is_emergency_contact boolean not null default false,
  household           text,                            -- supports two-household custody
  granted_by          uuid references public.profiles(id),
  granted_at          timestamptz not null default now(),
  revoked_at          timestamptz,
  revoked_by          uuid references public.profiles(id),
  revoke_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id)
);
create unique index student_guardians_active_idx
  on public.student_guardians (student_id, user_id) where revoked_at is null;
create index student_guardians_user_idx on public.student_guardians (user_id) where revoked_at is null;
create unique index student_guardians_primary_idx
  on public.student_guardians (student_id) where is_primary and revoked_at is null;
select app.attach_updated_at('public.student_guardians');

-- --- longitudinal organization membership -----------------------------------
create table public.student_organization_memberships (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete restrict,
  location_id       uuid references public.organization_locations(id) on delete set null,
  academic_year_id  uuid,                               -- FK added in 0011
  enrollment_type   app.enrollment_type not null default 'program',
  status            app.membership_status not null default 'pending',
  start_date        date,
  end_date          date,
  end_reason        text,
  data_sharing      jsonb not null default '{}'::jsonb, -- sections the family shares with this org
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id),
  constraint som_dates_ck check (end_date is null or start_date is null or end_date >= start_date),
  constraint som_ended_requires_date_ck check (status <> 'ended' or end_date is not null)
);
create index som_student_idx on public.student_organization_memberships (student_id, start_date desc);
create index som_org_active_idx on public.student_organization_memberships (organization_id) where status = 'active';
create index som_student_active_idx on public.student_organization_memberships (student_id) where status = 'active';
create index som_year_idx on public.student_organization_memberships (academic_year_id);
select app.attach_updated_at('public.student_organization_memberships');

comment on table public.student_organization_memberships is
  'Authoritative, append-oriented history of which organization a student was enrolled with, '
  'when, and under what enrollment type. Ending a membership revokes CURRENT organization '
  'access but never deletes student educational history.';

-- Keep students.primary_organization_id in step with the active membership.
create or replace function app.sync_student_primary_org()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_student uuid := coalesce(new.student_id, old.student_id);
begin
  update public.students s
     set primary_organization_id = (
           select m.organization_id
             from public.student_organization_memberships m
            where m.student_id = v_student and m.status = 'active'
            order by m.start_date desc nulls last, m.created_at desc
            limit 1)
   where s.id = v_student
     and s.primary_organization_id is distinct from (
           select m.organization_id
             from public.student_organization_memberships m
            where m.student_id = v_student and m.status = 'active'
            order by m.start_date desc nulls last, m.created_at desc
            limit 1);
  return null;
end;
$$;
create trigger sync_primary_org
  after insert or update of status, organization_id, start_date or delete
  on public.student_organization_memberships
  for each row execute function app.sync_student_primary_org();

-- --- explicit staff assignment ----------------------------------------------
create table public.student_staff_assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role            app.staff_assignment_role not null default 'teacher',
  access_level    app.access_level not null default 'write'
                    check (access_level in ('read', 'write')),
  subject_ids     uuid[] not null default '{}',
  starts_on       date,
  ends_on         date,
  active          boolean not null default true,
  granted_by      uuid references public.profiles(id),
  revoked_at      timestamptz,
  revoked_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  constraint ssa_dates_ck check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index ssa_unique_active_idx
  on public.student_staff_assignments (student_id, user_id, role) where active;
create index ssa_user_idx on public.student_staff_assignments (user_id) where active;
create index ssa_student_idx on public.student_staff_assignments (student_id) where active;
select app.attach_updated_at('public.student_staff_assignments');

comment on table public.student_staff_assignments is
  'A teacher or tutor reaches a student only through this table or through shared class '
  'membership. Organization membership alone never grants student access.';

-- --- time-boxed grants (evaluators, providers, transfers) --------------------
create table public.student_access_grants (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  grantee_user_id   uuid references public.profiles(id) on delete cascade,
  grantee_email     text,
  kind              app.access_grant_kind not null,
  sections          jsonb not null default '["portfolio","documents","progress"]'::jsonb,
  access_level      app.access_level not null default 'read'
                      check (access_level in ('read', 'write')),
  status            app.grant_status not null default 'pending',
  token_hash        text,
  granted_by        uuid not null references public.profiles(id),
  granted_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  revoked_by        uuid references public.profiles(id),
  consent_id        uuid,                                -- FK added in 0009
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint sag_grantee_ck check (grantee_user_id is not null or grantee_email is not null),
  constraint sag_expiry_ck check (expires_at > granted_at)
);
create index sag_grantee_active_idx
  on public.student_access_grants (grantee_user_id) where status = 'active';
create index sag_student_idx on public.student_access_grants (student_id);
create index sag_expiry_idx on public.student_access_grants (expires_at) where status = 'active';
select app.attach_updated_at('public.student_access_grants');

-- --- break-glass platform support -------------------------------------------
create table public.support_access_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  student_id      uuid references public.students(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  reason          text not null check (length(btrim(reason)) >= 10),
  ticket_ref      text,
  approved_by     uuid references public.profiles(id),
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint sas_expiry_ck check (expires_at > started_at),
  constraint sas_max_duration_ck check (expires_at <= started_at + interval '24 hours')
);
create index sas_active_idx on public.support_access_sessions (user_id, expires_at)
  where closed_at is null;
select app.attach_updated_at('public.support_access_sessions');

comment on table public.support_access_sessions is
  'Break-glass access for platform staff. profiles.is_super_admin alone grants nothing; '
  'an open, unexpired session with a written reason is required and every read is audited.';

alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_organization_memberships enable row level security;
alter table public.student_staff_assignments enable row level security;
alter table public.student_access_grants enable row level security;
alter table public.support_access_sessions enable row level security;
