-- =============================================================================
-- 0067  STEP 5 - the skill graph, and standards as a crosswalk
-- =============================================================================
-- `skills` already exists (0014) as a TREE: subject -> parent -> child, with
-- ancestor_ids and depth. That tree is a good way to ORGANISE skills for
-- browsing. It is not a way to express what has to be learned first.
--
-- "Understand a fraction as part of a whole" is a PREREQUISITE of "generate
-- equivalent fractions", but neither is the other's parent - they may well sit
-- in different branches, and a skill routinely has several prerequisites from
-- several places. A tree cannot say that. So STEP 5 adds a real directed graph
-- alongside the tree rather than bending the tree into one.
--
-- ON GRADE. `skills.grade_band` stays exactly what it is: metadata. There is
-- ONE canonical "Equivalent Fractions". "Fourth Grade Equivalent Fractions" is
-- not a second skill; it is the same skill, taught in fourth grade. Making
-- grade part of a skill's identity is how a graph acquires four near-identical
-- nodes that nothing can be mapped to consistently.
--
-- ON STANDARDS. `skills.framework` / `framework_ref` (0014) let a skill BE a
-- standard. That is backwards for a product that must speak Florida B.E.S.T.,
-- Common Core and NGSS at once: the moment a skill's identity is its B.E.S.T.
-- code, the same skill cannot also be a Common Core code. Standards become a
-- CROSSWALK here - many frameworks pointing AT one Nestra skill. The old
-- columns stay (STEP 1-4 is not being redesigned) but the crosswalk is the
-- mechanism from now on.
--
-- NO INVENTED STANDARDS. The crosswalk ships EMPTY. A fabricated standard code
-- in a compliance product is worse than no standard code at all, because a
-- parent may repeat it to a district.
-- =============================================================================

-- --- prerequisites: a real graph --------------------------------------------

create type app.prerequisite_strength as enum (
  'required',    -- you cannot do the successor without this
  'recommended'  -- it helps; it is not a gate
);

create table public.skill_prerequisites (
  id            uuid primary key default gen_random_uuid(),
  skill_id      uuid not null references public.skills(id) on delete cascade,
  prerequisite_skill_id uuid not null references public.skills(id) on delete cascade,
  strength      app.prerequisite_strength not null default 'required',
  note          text,
  -- Where this edge came from. An edge asserted by a curriculum designer and an
  -- edge guessed by a model are not the same claim.
  source_type   app.source_type not null default 'manual',
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,

  -- A skill is not its own prerequisite. Cheap, and it catches the copy-paste.
  constraint skill_prereq_no_self check (skill_id <> prerequisite_skill_id),
  -- The same edge twice is not a stronger claim.
  constraint skill_prereq_unique unique (skill_id, prerequisite_skill_id)
);

create index skill_prereq_skill_idx on public.skill_prerequisites (skill_id);
create index skill_prereq_prereq_idx on public.skill_prerequisites (prerequisite_skill_id);

comment on table public.skill_prerequisites is
  'The learning-order graph, separate from the browsing tree in skills.parent_skill_id. '
  'A skill may have several prerequisites in several branches; a tree cannot say that.';

/**
 * Cycle prevention, enforced at write time.
 *
 * A cycle here is not a cosmetic problem: every future adaptive feature will
 * walk this graph looking for "what must come first", and a cycle makes that
 * walk non-terminating. Detecting it later means detecting it in production.
 *
 * The check is a reachability search from the proposed prerequisite back to the
 * skill being given a prerequisite. If the prerequisite already depends on the
 * skill - at any depth - the new edge would close a loop.
 */
create or replace function app.prevent_prerequisite_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    with recursive upstream as (
      -- what the PROPOSED prerequisite itself depends on
      select p.prerequisite_skill_id as node
        from public.skill_prerequisites p
       where p.skill_id = new.prerequisite_skill_id
      union
      select p.prerequisite_skill_id
        from public.skill_prerequisites p
        join upstream u on p.skill_id = u.node
    )
    select 1 from upstream where node = new.skill_id
  ) then
    raise exception
      'that prerequisite would create a loop: % already depends on %',
      new.prerequisite_skill_id, new.skill_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function app.prevent_prerequisite_cycle() from public, anon, authenticated;

create trigger prevent_prerequisite_cycle
  before insert or update on public.skill_prerequisites
  for each row execute function app.prevent_prerequisite_cycle();

comment on function app.prevent_prerequisite_cycle() is
  'Refuses an edge that would close a loop. Cycles are rejected at write time '
  'rather than detected later, because every future path-finding walk over this '
  'graph would otherwise fail to terminate - in production.';

-- --- aliases: the same skill, other people's words ---------------------------
-- A curriculum calls it "Equal Fractions", a standard calls it "equivalence of
-- fractions", a parent types "equiv fractions". One skill, several names.

create table public.skill_aliases (
  id          uuid primary key default gen_random_uuid(),
  skill_id    uuid not null references public.skills(id) on delete cascade,
  alias       text not null,
  source      text,
  created_at  timestamptz not null default now(),
  constraint skill_alias_unique unique (skill_id, alias)
);
create index skill_alias_lookup_idx on public.skill_aliases (lower(alias));

-- --- standards, as a crosswalk ----------------------------------------------

create table public.standards_frameworks (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,        -- 'FL_BEST', 'CCSS', 'NGSS'
  name          text not null,
  jurisdiction  text,                        -- 'FL', 'US', null
  version_year  smallint,
  source_url    text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.standards (
  id            uuid primary key default gen_random_uuid(),
  framework_id  uuid not null references public.standards_frameworks(id) on delete cascade,
  code          text not null,               -- 'MA.4.FR.1.1'
  -- Standard TEXT is frequently copyrighted. It is nullable on purpose: a code
  -- and a source URL are always safe to store, the prose is not always.
  statement     text,
  grade_band    text,
  subject_hint  text,
  source_url    text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint standards_code_unique unique (framework_id, code)
);
create index standards_framework_idx on public.standards (framework_id, code);

create type app.crosswalk_relation as enum (
  'exact',      -- the skill and the standard say the same thing
  'narrower',   -- the skill is one part of the standard
  'broader',    -- the skill spans more than the standard
  'related'     -- adjacent, not equivalent
);

create table public.skill_standards (
  id            uuid primary key default gen_random_uuid(),
  skill_id      uuid not null references public.skills(id) on delete cascade,
  standard_id   uuid not null references public.standards(id) on delete cascade,
  relation      app.crosswalk_relation not null default 'related',
  -- PROVENANCE. Who says these two are the same thing, and did a human check?
  source_type   app.source_type not null default 'manual',
  verified_at   timestamptz,
  verified_by   uuid references auth.users(id) on delete set null,
  source_url    text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  constraint skill_standard_unique unique (skill_id, standard_id, relation)
);
create index skill_standards_skill_idx on public.skill_standards (skill_id);
create index skill_standards_standard_idx on public.skill_standards (standard_id);

comment on table public.skill_standards is
  'Many frameworks pointing AT one Nestra skill. No framework is the skill''s '
  'identity, so the same skill can carry a Florida B.E.S.T. code and a Common '
  'Core code at once. Ships EMPTY: an invented standard code is worse than none, '
  'because a parent may repeat it to a district.';

-- --- reading the graph -------------------------------------------------------

/**
 * Everything that must come before this skill, transitively.
 *
 * SECURITY INVOKER: the skill catalogue is readable by every signed-in user
 * (see the policies below), and this adds no authority of its own.
 */
create or replace function public.skill_prerequisite_closure(p_skill uuid)
returns table (skill_id uuid, depth integer)
language sql stable security invoker set search_path = '' as $$
  with recursive walk as (
    select p.prerequisite_skill_id as skill_id, 1 as depth
      from public.skill_prerequisites p
     where p.skill_id = p_skill
    union
    select p.prerequisite_skill_id, w.depth + 1
      from public.skill_prerequisites p
      join walk w on p.skill_id = w.skill_id
     where w.depth < 20          -- belt and braces; the trigger prevents cycles
  )
  select w.skill_id, min(w.depth)::int from walk w group by w.skill_id;
$$;

revoke all on function public.skill_prerequisite_closure(uuid) from public, anon;
grant execute on function public.skill_prerequisite_closure(uuid) to authenticated, service_role;

-- --- RLS ---------------------------------------------------------------------
-- The skill catalogue, its graph and the standards crosswalk are REFERENCE
-- DATA: shared vocabulary, carrying no student's information. Every signed-in
-- user may read them. Nobody writes them from a user session - curriculum
-- authorship arrives with the admin tooling in a later step, and until then a
-- seed migration under service_role is the only writer.

alter table public.skill_prerequisites   enable row level security;
alter table public.skill_aliases         enable row level security;
alter table public.standards_frameworks  enable row level security;
alter table public.standards             enable row level security;
alter table public.skill_standards       enable row level security;

create policy skill_prerequisites_select on public.skill_prerequisites
  for select to authenticated using (true);
create policy skill_aliases_select on public.skill_aliases
  for select to authenticated using (true);
create policy standards_frameworks_select on public.standards_frameworks
  for select to authenticated using (true);
create policy standards_select on public.standards
  for select to authenticated using (true);
create policy skill_standards_select on public.skill_standards
  for select to authenticated using (true);

comment on policy skill_prerequisites_select on public.skill_prerequisites is
  'Reference data: shared vocabulary with no student information in it. Readable '
  'by every signed-in user, writable from no user session at all.';

grant select on public.skill_prerequisites, public.skill_aliases,
                public.standards_frameworks, public.standards,
                public.skill_standards to authenticated;

select app.assert_schema_invariants();
