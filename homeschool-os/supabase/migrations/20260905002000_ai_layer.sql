-- =============================================================================
-- 0020  AI proposal layer, usage observability, job queue
-- =============================================================================
-- AI never writes to a domain table. It writes an ai_suggestions row (a
-- proposal with confidence and an exact action payload); a human accepts it and
-- the APPLICATION performs the write, stamping provenance and an audit entry.
-- =============================================================================

create table public.ai_suggestions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references public.organizations(id) on delete cascade,
  family_id             uuid references public.families(id) on delete cascade,
  student_id            uuid references public.students(id) on delete cascade,
  kind                  app.suggestion_kind not null,
  source_type           app.source_type not null default 'ai_suggestion',
  source_record_type    text,                                  -- 'documents', 'portfolio_items'...
  source_record_id      uuid,
  document_id           uuid references public.documents(id) on delete cascade,
  payload               jsonb not null,                        -- the exact write to perform
  edited_payload        jsonb,                                 -- what the human actually approved
  rationale             text,
  confidence            numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  confidence_band       app.confidence_band,
  requires_confirmation boolean not null default true,
  status                app.suggestion_status not null default 'pending',
  decided_by            uuid references public.profiles(id),
  decided_at            timestamptz,
  decision_note         text,
  applied_record_type   text,
  applied_record_id     uuid,
  ai_usage_event_id     uuid,                                  -- FK added below
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint ai_suggestions_requires_confirmation_ck check (requires_confirmation),
  constraint ai_suggestions_decision_ck check (
    (status = 'pending' and decided_by is null)
    or (status <> 'pending' and (decided_by is not null or status in ('expired','superseded')))),
  constraint ai_suggestions_applied_ck check (
    status <> 'accepted' or (applied_record_type is not null and applied_record_id is not null))
);
create index ai_suggestions_student_status_idx on public.ai_suggestions (student_id, status);
create index ai_suggestions_org_idx on public.ai_suggestions (organization_id, status, created_at desc);
create index ai_suggestions_family_idx on public.ai_suggestions (family_id, status, created_at desc);
create index ai_suggestions_document_idx on public.ai_suggestions (document_id);
select app.attach_updated_at('public.ai_suggestions');

comment on constraint ai_suggestions_requires_confirmation_ck on public.ai_suggestions is
  'Structural guarantee: there is no such thing as an auto-applied suggestion. '
  'Relaxing this would require a migration and a deliberate product decision.';

-- --- AI usage observability --------------------------------------------------
-- One row per model call, everywhere. Enables cost per student / family /
-- organization / feature. Provider internals are NOT exposed to normal users
-- (see the ai_usage_summary view and the RLS policies in 0032).
create table public.ai_usage_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  model             text not null,
  feature           app.ai_feature not null,
  prompt_version    text,
  organization_id   uuid references public.organizations(id) on delete set null,
  family_id         uuid references public.families(id) on delete set null,
  user_id           uuid references public.profiles(id) on delete set null,
  student_id        uuid references public.students(id) on delete set null,
  document_id       uuid references public.documents(id) on delete set null,
  suggestion_id     uuid references public.ai_suggestions(id) on delete set null,
  permission_scope  jsonb not null default '{}'::jsonb,        -- exact ids retrieval was allowed
  input_tokens      int check (input_tokens is null or input_tokens >= 0),
  output_tokens     int check (output_tokens is null or output_tokens >= 0),
  cached_tokens     int check (cached_tokens is null or cached_tokens >= 0),
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  latency_ms        int check (latency_ms is null or latency_ms >= 0),
  status            app.ai_call_status not null default 'success',
  error             text,
  input_summary     text,
  output_summary    text,
  feedback          text check (feedback is null or feedback in ('up','down')),
  created_at        timestamptz not null default now()
);
create index ai_usage_org_time_idx on public.ai_usage_events (organization_id, created_at desc);
create index ai_usage_family_time_idx on public.ai_usage_events (family_id, created_at desc);
create index ai_usage_student_idx on public.ai_usage_events (student_id, created_at desc);
create index ai_usage_feature_time_idx on public.ai_usage_events (feature, created_at desc);
create index ai_usage_user_idx on public.ai_usage_events (user_id, created_at desc);

comment on table public.ai_usage_events is
  'Per-call AI telemetry: cost, tokens, latency, prompt version and the exact '
  'permission scope the retrieval layer was allowed to use. Never shown to end users.';

-- Pre-aggregated rollup for budgets and dashboards.
create table public.ai_usage_daily (
  id                uuid primary key default gen_random_uuid(),
  day               date not null,
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  feature           app.ai_feature not null,
  calls             int not null default 0,
  input_tokens      bigint not null default 0,
  output_tokens     bigint not null default 0,
  cached_tokens     bigint not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  errors            int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index ai_usage_daily_org_idx on public.ai_usage_daily (day, organization_id, feature)
  where organization_id is not null;
create unique index ai_usage_daily_family_idx on public.ai_usage_daily (day, family_id, feature)
  where family_id is not null;
select app.attach_updated_at('public.ai_usage_daily');

-- Cost/usage without provider internals, for organization administrators.
create view public.ai_usage_summary as
select e.id, e.feature, e.organization_id, e.family_id, e.student_id,
       e.input_tokens, e.output_tokens, e.cached_tokens, e.estimated_cost_usd,
       e.latency_ms, e.status, e.created_at
  from public.ai_usage_events e
 where (e.organization_id is not null and app.is_org_admin(e.organization_id))
    or app.is_platform_support(e.organization_id, e.student_id);

comment on view public.ai_usage_summary is
  'Provider and model names, prompts and error text are deliberately omitted.';

-- --- background jobs ---------------------------------------------------------
create table public.job_queue (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null,
  payload           jsonb not null default '{}'::jsonb,
  idempotency_key   text unique,
  run_after         timestamptz not null default now(),
  status            app.job_status not null default 'queued',
  attempts          int not null default 0,
  max_attempts      int not null default 5,
  locked_by         text,
  locked_at         timestamptz,
  last_error        text,
  organization_id   uuid references public.organizations(id) on delete cascade,
  family_id         uuid references public.families(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index job_queue_ready_idx on public.job_queue (run_after) where status = 'queued';
create index job_queue_kind_idx on public.job_queue (kind, status);
select app.attach_updated_at('public.job_queue');

-- --- deferred foreign keys ---------------------------------------------------
alter table public.ai_suggestions
  add constraint ai_suggestions_usage_fk
  foreign key (ai_usage_event_id) references public.ai_usage_events(id) on delete set null;

alter table public.student_skills
  add constraint student_skills_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.student_skill_events
  add constraint sse_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.assessments
  add constraint assessments_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.assessment_results
  add constraint assessment_results_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.portfolio_items
  add constraint portfolio_items_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.activity_logs
  add constraint activity_logs_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.reading_logs
  add constraint reading_logs_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.lessons
  add constraint lessons_suggestion_fk
  foreign key (ai_suggestion_id) references public.ai_suggestions(id) on delete set null;
alter table public.lessons
  add constraint lessons_usage_fk
  foreign key (ai_usage_event_id) references public.ai_usage_events(id) on delete set null;
alter table public.document_ai_analysis
  add constraint daa_usage_fk
  foreign key (ai_usage_event_id) references public.ai_usage_events(id) on delete set null;

alter table public.ai_suggestions enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.job_queue enable row level security;
