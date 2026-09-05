-- =============================================================================
-- 0011  Academic years, subjects, skills
-- =============================================================================

create table public.academic_years (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id       uuid references public.families(id) on delete cascade,
  name            text not null,                     -- '2026-2027'
  starts_on       date not null,
  ends_on         date not null,
  is_current      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  constraint academic_years_range_ck check (ends_on > starts_on),
  constraint academic_years_scope_ck check (num_nonnulls(organization_id, family_id) = 1)
);
create index academic_years_org_idx on public.academic_years (organization_id, starts_on desc);
create index academic_years_family_idx on public.academic_years (family_id, starts_on desc);
create unique index academic_years_current_org_idx
  on public.academic_years (organization_id) where is_current and organization_id is not null;
create unique index academic_years_current_family_idx
  on public.academic_years (family_id) where is_current and family_id is not null;
select app.attach_updated_at('public.academic_years');

alter table public.students
  add constraint students_academic_year_fk
  foreign key (current_academic_year_id) references public.academic_years(id) on delete set null;
alter table public.student_organization_memberships
  add constraint som_academic_year_fk
  foreign key (academic_year_id) references public.academic_years(id) on delete set null;

-- --- subjects ----------------------------------------------------------------
-- organization_id null => global seeded subject, readable by everyone.
create table public.subjects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  family_id       uuid references public.families(id) on delete cascade,
  name            text not null,
  slug            text not null,
  category        text,
  color           text,
  icon            text,
  sequence        smallint not null default 100,
  is_system       boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id)
);
create unique index subjects_global_slug_idx on public.subjects (slug)
  where organization_id is null and family_id is null;
create unique index subjects_org_slug_idx on public.subjects (organization_id, slug)
  where organization_id is not null;
create unique index subjects_family_slug_idx on public.subjects (family_id, slug)
  where family_id is not null;
create index subjects_org_idx on public.subjects (organization_id);
select app.attach_updated_at('public.subjects');

-- --- skills (tree) -----------------------------------------------------------
create table public.skills (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references public.subjects(id) on delete cascade,
  parent_skill_id uuid references public.skills(id) on delete cascade,
  ancestor_ids    uuid[] not null default '{}',       -- maintained by trigger
  depth           smallint not null default 0,
  organization_id uuid references public.organizations(id) on delete cascade,
  code            text,
  name            text not null,
  description     text,
  grade_band      text,                                -- 'K-2', '3-5', ...
  framework       app.skill_framework not null default 'internal',
  framework_ref   text,                                -- e.g. a state standard code
  sequence        smallint not null default 100,
  is_system       boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  constraint skills_no_self_parent_ck check (parent_skill_id is distinct from id)
);
create index skills_subject_idx on public.skills (subject_id, sequence);
create index skills_parent_idx on public.skills (parent_skill_id);
create index skills_ancestors_idx on public.skills using gin (ancestor_ids);
create index skills_org_idx on public.skills (organization_id);
create unique index skills_framework_ref_idx on public.skills (framework, framework_ref)
  where framework_ref is not null and organization_id is null;
select app.attach_updated_at('public.skills');

-- Materialised ancestry: subtree queries are `where ancestor_ids @> array[:id]`,
-- which is a single GIN index hit and needs no recursive CTE at read time.
create or replace function app.maintain_skill_ancestry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_parent_ancestors uuid[];
begin
  if new.parent_skill_id is null then
    new.ancestor_ids := '{}';
    new.depth := 0;
  else
    select p.ancestor_ids || p.id into v_parent_ancestors
      from public.skills p where p.id = new.parent_skill_id;
    if new.id = any (v_parent_ancestors) then
      raise exception 'skill ancestry cycle detected for %', new.id using errcode = 'check_violation';
    end if;
    new.ancestor_ids := v_parent_ancestors;
    new.depth := coalesce(array_length(v_parent_ancestors, 1), 0);
  end if;
  return new;
end;
$$;
create trigger maintain_ancestry
  before insert or update of parent_skill_id on public.skills
  for each row execute function app.maintain_skill_ancestry();

alter table public.academic_years enable row level security;
alter table public.subjects enable row level security;
alter table public.skills enable row level security;
