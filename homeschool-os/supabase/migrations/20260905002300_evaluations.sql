-- =============================================================================
-- 0023  Evaluators, evaluations, signatures
-- =============================================================================
-- Marketplace-ready structures (profile, credentials, service area, price,
-- reviews) exist now so evaluator identity does not have to be retrofitted.
-- No payment processing is built in the MVP.
-- =============================================================================

create table public.signatures (
  id              uuid primary key default gen_random_uuid(),
  signer_user_id  uuid not null references public.profiles(id) on delete restrict,
  subject_type    text not null,                       -- 'evaluations', 'document_submissions'
  subject_id      uuid not null,
  method          app.signature_method not null default 'typed',
  typed_name      text,
  image_path      text,
  statement       text not null,
  payload_hash    text not null,                       -- sha256 of exactly what was signed
  signed_at       timestamptz not null default now(),
  ip              inet,
  user_agent      text,
  organization_id uuid references public.organizations(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index signatures_subject_idx on public.signatures (subject_type, subject_id);
create index signatures_signer_idx on public.signatures (signer_user_id, signed_at desc);

-- A signature is evidence: it is never edited or removed.
create trigger signatures_append_only
  before update or delete on public.signatures
  for each row execute function app.forbid_mutation();

alter table public.document_submissions
  add constraint document_submissions_signature_fk
  foreign key (signature_id) references public.signatures(id) on delete restrict;

create table public.evaluator_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references public.profiles(id) on delete cascade,
  organization_id         uuid references public.organizations(id) on delete set null,
  display_name            text not null,
  bio                     text,
  credential_type         text,
  credential_number       text,
  credential_document_id  uuid references public.documents(id) on delete set null,
  credential_expires_on   date,
  verification_status     app.verification_status not null default 'unverified',
  verified_by             uuid references public.profiles(id),
  verified_on             date,
  subject_ids             uuid[] not null default '{}',
  grade_levels            text[] not null default '{}',
  languages               text[] not null default '{en-US}',
  service_areas           jsonb not null default '[]'::jsonb,   -- [{state_code, counties[]}]
  modality                text not null default 'both' check (modality in ('virtual','in_person','both')),
  price_cents             int check (price_cents is null or price_cents >= 0),
  currency                char(3) not null default 'USD',
  availability            jsonb not null default '{}'::jsonb,
  accepting_new           boolean not null default true,
  listed_in_marketplace   boolean not null default false,
  approval_status         text not null default 'pending'
                            check (approval_status in ('pending','approved','rejected','suspended')),
  rating_avg              numeric(3,2) check (rating_avg is null or (rating_avg >= 0 and rating_avg <= 5)),
  rating_count            int not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  -- An evaluator may only be publicly listed once a human has verified credentials.
  constraint evaluator_listing_ck check (
    not listed_in_marketplace
    or (verification_status = 'verified' and approval_status = 'approved'))
);
create index evaluator_profiles_listed_idx on public.evaluator_profiles (listed_in_marketplace, accepting_new)
  where listed_in_marketplace;
create index evaluator_profiles_verification_idx on public.evaluator_profiles (verification_status);
select app.attach_updated_at('public.evaluator_profiles');

create table public.evaluations (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.students(id) on delete cascade,
  family_id               uuid references public.families(id) on delete cascade,
  organization_id         uuid references public.organizations(id) on delete set null,
  academic_year_id        uuid references public.academic_years(id) on delete set null,
  evaluator_user_id       uuid references public.profiles(id) on delete set null,
  evaluator_email         text,
  evaluator_profile_id    uuid references public.evaluator_profiles(id) on delete set null,
  access_grant_id         uuid references public.student_access_grants(id) on delete set null,
  status                  app.evaluation_status not null default 'requested',
  method                  app.evaluation_method,
  requested_at            timestamptz not null default now(),
  scheduled_for           timestamptz,
  completed_on            date,
  shared_sections         jsonb not null default '[]'::jsonb,
  notes                   text,
  outcome                 text check (outcome is null or outcome in ('satisfactory','needs_discussion','other')),
  outcome_narrative       text,
  evaluator_signature_id  uuid references public.signatures(id) on delete set null,
  credentials_document_id uuid references public.documents(id) on delete set null,
  report_document_id      uuid references public.documents(id) on delete set null,
  parent_reviewed_at      timestamptz,
  parent_reviewed_by      uuid references public.profiles(id),
  parent_decision_note    text,
  fee_cents               int check (fee_cents is null or fee_cents >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  constraint evaluations_evaluator_ck check (evaluator_user_id is not null or evaluator_email is not null),
  -- A submitted evaluation must carry the evaluator's signature and a report.
  constraint evaluations_submit_ck check (
    status not in ('submitted','parent_review','accepted_by_parent')
    or (evaluator_signature_id is not null and report_document_id is not null and completed_on is not null)),
  -- Only the parent moves an evaluation to accepted.
  constraint evaluations_parent_accept_ck check (
    status <> 'accepted_by_parent' or (parent_reviewed_at is not null and parent_reviewed_by is not null))
);
create index evaluations_student_idx on public.evaluations (student_id, requested_at desc);
create index evaluations_evaluator_idx on public.evaluations (evaluator_user_id, status);
create index evaluations_upcoming_idx on public.evaluations (scheduled_for)
  where status in ('accepted','scheduled','in_progress');
select app.attach_updated_at('public.evaluations');

create table public.evaluator_reviews (
  id                  uuid primary key default gen_random_uuid(),
  evaluator_profile_id uuid not null references public.evaluator_profiles(id) on delete cascade,
  family_id           uuid not null references public.families(id) on delete cascade,
  evaluation_id       uuid references public.evaluations(id) on delete set null,
  rating              smallint not null check (rating between 1 and 5),
  comment             text,
  status              text not null default 'pending'
                        check (status in ('pending','published','rejected','withdrawn')),
  moderated_by        uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  unique (evaluator_profile_id, family_id, evaluation_id)
);
create index evaluator_reviews_profile_idx on public.evaluator_reviews (evaluator_profile_id, status);
select app.attach_updated_at('public.evaluator_reviews');

alter table public.signatures enable row level security;
alter table public.evaluator_profiles enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluator_reviews enable row level security;
