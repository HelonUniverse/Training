-- =============================================================================
-- 0021  Individual learning plans and goals
-- =============================================================================
-- Plans are versioned rather than overwritten: revising a plan supersedes the
-- previous version so "what was the plan in March?" stays answerable.
-- =============================================================================

create table public.learning_plans (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.students(id) on delete cascade,
  organization_id         uuid references public.organizations(id) on delete set null,
  family_id               uuid references public.families(id) on delete cascade,
  academic_year_id        uuid references public.academic_years(id) on delete set null,
  version                 int not null default 1 check (version >= 1),
  supersedes_id           uuid references public.learning_plans(id) on delete set null,
  current_level           jsonb not null default '{}'::jsonb,
  strengths               text,
  areas_of_need           text,
  learning_preferences    jsonb not null default '{}'::jsonb,
  priority_skill_ids      uuid[] not null default '{}',
  subject_ids             uuid[] not null default '{}',
  teacher_recommendations text,
  parent_goals            text,
  ai_recommendations      jsonb not null default '[]'::jsonb,  -- proposals awaiting approval
  status                  app.plan_status not null default 'draft',
  review_on               date,
  approved_by             uuid references public.profiles(id),
  approved_at             timestamptz,
  -- provenance
  source_type             app.source_type not null default 'parent',
  source_id               uuid,
  entered_by              uuid references public.profiles(id),
  ai_generated            boolean not null default false,
  ai_suggestion_id        uuid references public.ai_suggestions(id) on delete set null,
  human_confirmed_by      uuid references public.profiles(id),
  human_confirmed_at      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  constraint learning_plans_active_requires_approval_ck check (
    status <> 'active' or (approved_by is not null and approved_at is not null)),
  constraint learning_plans_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create unique index learning_plans_active_idx on public.learning_plans (student_id, academic_year_id)
  where status = 'active';
create index learning_plans_student_idx on public.learning_plans (student_id, version desc);
select app.attach_updated_at('public.learning_plans');

comment on constraint learning_plans_active_requires_approval_ck on public.learning_plans is
  'An AI-drafted plan cannot become the active plan without a human approving it.';

create table public.learning_goals (
  id                  uuid primary key default gen_random_uuid(),
  learning_plan_id    uuid references public.learning_plans(id) on delete cascade,
  student_id          uuid not null references public.students(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  subject_id          uuid references public.subjects(id) on delete set null,
  skill_id            uuid references public.skills(id) on delete set null,
  title               text not null,
  description         text,
  horizon             app.goal_horizon not null default 'short_term',
  priority            smallint not null default 3 check (priority between 1 and 5),
  target_date         date,
  status              app.goal_status not null default 'proposed',
  progress            smallint not null default 0 check (progress between 0 and 100),
  achieved_at         timestamptz,
  -- provenance
  source_type         app.source_type not null default 'parent',
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid references public.ai_suggestions(id) on delete set null,
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  approved_by         uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  constraint learning_goals_active_requires_approval_ck check (
    status = 'proposed' or approved_by is not null),
  constraint learning_goals_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index learning_goals_student_idx on public.learning_goals (student_id, status);
create index learning_goals_plan_idx on public.learning_goals (learning_plan_id);
select app.attach_updated_at('public.learning_goals');

alter table public.learning_plans enable row level security;
alter table public.learning_goals enable row level security;
