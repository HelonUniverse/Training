-- =============================================================================
-- 0012  Skill map and skill history (provenance-first)
-- =============================================================================
-- student_skills holds the CURRENT belief; student_skill_events is the immutable
-- record of every input that produced it. Progress analysis reads the events, so
-- "what did we believe three months ago, and what changed it?" is answerable.
--
-- Standard provenance block used across the schema:
--   source_type, source_id, entered_by, ai_generated, ai_suggestion_id,
--   human_confirmed_by, human_confirmed_at
-- Invariant: ai_generated = true requires BOTH an ai_suggestion_id and a human
-- confirmation, because AI never writes to a domain table directly - a person
-- accepts a suggestion and the application performs the write.
-- =============================================================================

create table public.student_skills (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(id) on delete cascade,
  skill_id            uuid not null references public.skills(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  mastery_level       app.mastery_level not null default 'not_started',
  score               numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  confidence          app.confidence_level not null default 'ai_suggested',
  evidence_count      int not null default 0 check (evidence_count >= 0),
  last_evidence_at    timestamptz,
  notes               text,
  -- provenance
  source_type         app.source_type not null default 'manual',
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid,                                  -- FK added in 0019
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  unique (student_id, skill_id),
  -- AI alone may never mark a skill mastered (product rule 17 / 39).
  constraint student_skills_mastery_requires_human_ck check (
    mastery_level <> 'mastered'
    or (confidence in ('teacher_observed', 'assessment_confirmed')
        and human_confirmed_by is not null
        and human_confirmed_at is not null)),
  constraint student_skills_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index student_skills_student_idx on public.student_skills (student_id);
create index student_skills_skill_idx on public.student_skills (skill_id);
create index student_skills_review_idx on public.student_skills (student_id, mastery_level);
select app.attach_updated_at('public.student_skills');

create table public.student_skill_events (
  id                  uuid primary key default gen_random_uuid(),
  student_skill_id    uuid not null references public.student_skills(id) on delete cascade,
  student_id          uuid not null references public.students(id) on delete cascade,
  skill_id            uuid not null references public.skills(id) on delete cascade,
  organization_id     uuid references public.organizations(id) on delete set null,
  occurred_on         date not null default current_date,
  score               numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  delta               numeric(6,2),
  mastery_level       app.mastery_level,
  confidence          app.confidence_level not null,
  evidence_note       text,
  -- provenance
  source_type         app.source_type not null,
  source_id           uuid,
  entered_by          uuid references public.profiles(id),
  ai_generated        boolean not null default false,
  ai_suggestion_id    uuid,                                  -- FK added in 0019
  human_confirmed_by  uuid references public.profiles(id),
  human_confirmed_at  timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  constraint sse_ai_provenance_ck check (
    not ai_generated or (ai_suggestion_id is not null and human_confirmed_by is not null))
);
create index sse_student_skill_idx on public.student_skill_events (student_skill_id, occurred_on desc);
create index sse_student_date_idx on public.student_skill_events (student_id, occurred_on desc);
create index sse_source_idx on public.student_skill_events (source_type, source_id);

-- Immutable history: events are facts about the past.
create trigger student_skill_events_append_only
  before update or delete on public.student_skill_events
  for each row execute function app.forbid_mutation();

comment on table public.student_skill_events is
  'Append-only evidence trail behind every skill score. Never updated or deleted; '
  'a mistaken event is corrected by recording a compensating event.';

alter table public.student_skills enable row level security;
alter table public.student_skill_events enable row level security;
