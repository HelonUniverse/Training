# Homeschool OS — STEP 2 Report

**Status:** STEP 2 complete — database schema. No application code yet.
**Branch:** `claude/homeschool-os-mvp-arch-l6d0r3`
**Verification:** all 37 migrations applied and tested against a real PostgreSQL 16 cluster. All three test files pass.

**Totals:** 37 migrations · 75 tables · 2 views · 63 enums · 285 indexes · 118 check constraints · 155 RLS policies · 41 helper functions

---

## 1. Migration file list, in execution order

| # | File | Contents |
|---|---|---|
| 0001 | `..000100_extensions_and_schemas` | `app` + `extensions` schemas, `pg_trgm` |
| 0002 | `..000200_enums` | 63 enum types |
| 0003 | `..000300_utility_functions` | `set_updated_at`, `forbid_mutation`, `secure_partition`, `ensure_month_partitions`, `dedupe_key` |
| 0004 | `..000400_locales_and_translations` | `locales`, `content_translations` |
| 0005 | `..000500_profiles` | `profiles` + auth-user provisioning trigger |
| 0006 | `..000600_organizations` | `organizations`, `organization_locations`, `organization_members`, `invitations` |
| 0007 | `..000700_families` | `families`, `family_members`, `family_organization_memberships` |
| 0008 | `..000800_students_and_access` | `students`, `student_guardians`, `student_organization_memberships`, `student_staff_assignments`, `student_access_grants`, `support_access_sessions` |
| 0009 | `..000900_consents` | `consent_policies`, `consents`, `current_consents`, `app.has_consent` |
| 0010 | `..001000_permission_helpers` | `user_permissions` + org/family scope helpers |
| 0011 | `..001100_academic_core` | `academic_years`, `subjects`, `skills` |
| 0012 | `..001200_skills_progress` | `student_skills`, `student_skill_events` |
| 0013 | `..001300_classes` | `classes`, `class_students`, `class_staff` |
| 0014 | `..001400_student_access_function` | **`app.student_access()`** + `my_student_ids`, `org_student_ids` |
| 0015 | `..001500_calendar` | `calendar_events`, `calendar_event_instances`, `event_participants` |
| 0016 | `..001600_lessons_assignments` | `lessons`, `lesson_students`, `lesson_groups`, `assignments`, `assignment_students`, `assignment_submissions` |
| 0017 | `..001700_assessments_attendance` | `assessments`, `assessment_results`, `attendance` |
| 0018 | `..001800_documents` | `documents`, `document_versions`, `document_ai_analysis` + file-immutability trigger |
| 0019 | `..001900_evidence_logs` | `portfolio_items`, `activity_logs`, `reading_logs`, `teacher_notes` |
| 0020 | `..002000_ai_layer` | `ai_suggestions`, `ai_usage_events`, `ai_usage_daily`, `ai_usage_summary`, `job_queue` + deferred FKs |
| 0021 | `..002100_learning_plans` | `learning_plans`, `learning_goals` |
| 0022 | `..002200_compliance` | `compliance_packs`, `compliance_rules`, `district_contacts`, `compliance_requirements`, `student_compliance_records`, `document_submissions` |
| 0023 | `..002300_evaluations` | `signatures`, `evaluator_profiles`, `evaluations`, `evaluator_reviews` |
| 0024 | `..002400_org_operational_records` | `incident_reports`, `staff_records`, `organization_documents`, **`data_ownership_registry`** |
| 0025 | `..002500_messaging` | `message_threads`, `message_thread_participants`, `messages`, `announcements` |
| 0026 | `..002600_notifications_reports` | `notifications`, `notification_preferences`, `reports` |
| 0027 | `..002700_audit_logs` | partitioned `audit_logs` + `app.audit()` |
| 0028 | `..002800_record_history` | partitioned `record_history` + capture triggers on 17 tables |
| 0029 | `..002900_rls_helpers` | `can_read_profile/family/class/document`, `is_thread_participant`, … |
| 0030 | `..003000_rls_identity` | policies: identity, tenancy, consent |
| 0031 | `..003100_rls_students` | policies: students and the access graph |
| 0032 | `..003200_rls_academics` | policies: academics, calendar, classes, plans |
| 0033 | `..003300_rls_evidence_ai` | policies: documents, evidence, AI |
| 0034 | `..003400_rls_compliance_comms` | policies: compliance, evaluations, operational, comms, audit |
| 0035 | `..003500_storage` | 6 private buckets + storage policies |
| 0036 | `..003600_grants_and_invariants` | privileges, partition re-lock, **3 deploy-blocking invariant checks** |
| 0037 | `..003700_seed_system_reference` | locales/subjects/skills/FL pack scaffold + district contact scaffold |

All files live in `homeschool-os/supabase/migrations/` with full `20260905NNNNNN_` timestamp prefixes.

---

## 2. Tables created — 75

**Identity & tenancy (11):** profiles · organizations · organization_locations · organization_members · invitations · families · family_members · family_organization_memberships · locales · content_translations · user_permissions

**Students & access (6):** students · student_guardians · student_organization_memberships · student_staff_assignments · student_access_grants · support_access_sessions

**Consent (2):** consent_policies · consents

**Academics (14):** academic_years · subjects · skills · student_skills · student_skill_events · classes · class_students · class_staff · lessons · lesson_students · lesson_groups · assignments · assignment_students · assignment_submissions

**Assessment & attendance (3):** assessments · assessment_results · attendance

**Calendar (3):** calendar_events · calendar_event_instances · event_participants

**Evidence & documents (7):** documents · document_versions · document_ai_analysis · portfolio_items · activity_logs · reading_logs · teacher_notes

**AI (4 + 1 view):** ai_suggestions · ai_usage_events · ai_usage_daily · job_queue · *(view: `ai_usage_summary`)*

**Plans (2):** learning_plans · learning_goals

**Compliance (6):** compliance_packs · compliance_rules · district_contacts · compliance_requirements · student_compliance_records · document_submissions

**Evaluations (4):** signatures · evaluator_profiles · evaluations · evaluator_reviews

**Organization operational (4):** incident_reports · staff_records · organization_documents · data_ownership_registry

**Communications (4):** message_threads · message_thread_participants · messages · announcements

**Operations (5):** notifications · notification_preferences · reports · audit_logs · record_history

Plus 2 views (`current_consents` security-invoker, `ai_usage_summary` filtered projection) and 74 monthly partitions.

---

## 3. Critical constraints

The ones that make product rules structural rather than aspirational:

- **`student_skills_mastery_requires_human_ck`** — `mastered` requires `teacher_observed`/`assessment_confirmed` **and** a named confirmer. AI cannot mark mastery even if the app has a bug.
- **`*_ai_provenance_ck`** (9 tables) — `ai_generated = true` requires both an `ai_suggestion_id` and a `human_confirmed_by`.
- **`ai_suggestions_requires_confirmation_ck`** — `requires_confirmation` cannot be false. There is no auto-apply path without a migration.
- **`submissions_send_requires_approval_ck`** — an official filing cannot be recorded `sent`/`delivered`/`acknowledged` without an approver, a signature, a snapshotted destination and a send timestamp.
- **`rules_verification_ck`** / **`packs_publish_ck`** — a compliance rule cannot be `active` without `last_verified_on` + `verified_by`; a pack cannot be published without a named publisher.
- **`documents_retention_ck`** + `protect_document_identity` trigger — no soft-delete under legal hold or inside a retention window; `storage_path`/`sha256`/`byte_size`/filename immutable after insert.
- **`learning_plans_active_requires_approval_ck`** — an AI-drafted plan cannot become active unapproved.
- **`evaluations_submit_ck`** / **`evaluations_parent_accept_ck`** — signature + report required to submit; only a parent accepts.
- **`sas_max_duration_ck`** + 10-character minimum reason — break-glass sessions are ≤24h and must state why.
- **Append-only triggers** on consents, signatures, student_skill_events, audit_logs, record_history.
- **`enforce_minor_thread_safety`** deferred constraint trigger — no private adult↔minor thread.
- **`activity_logs_dedupe_idx`** — auto-generation from lessons/portfolio is idempotent by construction.

---

## 4. RLS policy summary — 155 policies

Every table has RLS on (asserted at deploy time); zero tables are unprotected. `anon` has no privileges on anything. Shape by domain:

| Domain | Read | Write |
|---|---|---|
| Students & child tables | `app.can_read_student()` / `student_id in (select app.my_student_ids())` | `app.can_write_student()` |
| Guardianship, grants, filings | read via student access | `app.can_admin_student()` — full guardians only |
| Organizations | `app.can_view_organization()` (members **and** connected families) | `app.is_org_admin()` |
| Classes | org member **or** guardian of an enrolled student | `app.can_manage_class()` (org admin or lead/assistant staff) |
| Documents | `app.can_read_document()` — uploader, student access, family, or org for operational records; **infected files unreadable by anyone** | family/student writers, org admin for operational |
| Teacher notes | honors `visibility` (private/staff/family/all) — a staff note is not visible to the family | author only |
| AI suggestions | student/family/org scope | **update only** (accept/reject); no INSERT policy — proposals originate solely from the pipeline |
| AI telemetry | break-glass only on the base table; org admins use `ai_usage_summary` (no provider, model, prompt or error text) | none |
| Compliance reference | only `active` rules in `active` packs; drafts are platform-only | none — packs maintained via service-role tooling |
| Compliance status | student scope | **none** — computed by the engine; a user cannot set their own status |
| Messaging | `app.is_thread_participant()` | participants, sender = self |
| Audit | guardians see their own child's access log; org admins their org; actors their own actions | **none** |
| Storage | no SELECT policy on document buckets — all reads are server-minted signed URLs, so every view is audited; uploads restricted to your own family/org path prefix in quarantine | |

---

## 5. `app.student_access()` explained

One function, called by every student-scoped policy. It returns `none < read < write < admin` and takes the **highest** of seven independent sources:

1. **The student themself** (`students.user_id`) → `read`
2. **Active guardian** → `admin` (full) / `write` (standard) / `read` (view_only) — supports custody splits
3. **Explicit staff assignment**, date-bounded and revocable → `read` or `write`
4. **Derived from shared class membership** (active enrolment × active staffing) → `write`
5. **Org admin of an organization with an *active* `student_organization_memberships` row** → `admin`
6. **Time-boxed grant** (evaluator/provider), unexpired and unrevoked → `read` or `write`
7. **Open break-glass support session** → `read`

A `deny` in `user_permissions` for `student.access` short-circuits all seven.

Why it's built this way:

- **Org membership alone grants nothing.** A teacher reaches a student only via #3 or #4 — verified in the test suite: Tomas teaches Lucas and cannot see Lucas's sister Marla, who is in the same family.
- **Revocation is immediate** because access is resolved per query, never cached in the JWT.
- **Ending an org membership** flips #5 off on the next request while the history row survives — the family keeps everything.
- `app.my_student_ids()` is the fast path for high-volume child tables: access resolves once per statement instead of once per row.
- `SECURITY DEFINER` + `STABLE` + `search_path = ''`, so policies don't recurse and a hostile session can't shadow a table name.

---

## 6. Intentionally deferred

- **All application code and generated TypeScript types** — STEP 3.
- **Florida legal content.** The pack ships as a draft scaffold: placeholder requirement text, `obligation_level = 'unknown'`, `active = false`, no verification date. The constraints won't let it activate until a named person verifies each rule against its source. We shipped the mechanism; a human ships the law.
- **District contacts** — 3 unverified scaffold rows, not 67 counties. Data task.
- **Billing** — only `organizations.plan` and the AI usage rollup exist as hooks. No invoices/payments tables.
- **`ai_usage_daily` population, compliance recomputation, event materialization, partition rolling** — table shapes and `app.ensure_month_partitions()` exist; the jobs are STEP 9/10.
- **Rate-limit storage** — edge middleware concern, STEP 3.
- **Vector/embedding tables** — the assistant uses permission-scoped tool calling, not RAG over everything.
- **`user_permissions` wiring beyond `student.access`** — the table and resolver exist; other permission keys land with the features that need them.

---

## 7. Tests required before STEP 3

### Written and passing now (`./tests/local/test.sh`)

- **`01_access_matrix`** — read scope for all 8 roles, view-only guardian, teacher-vs-sibling isolation, unassigned staff, org admin scoped to active enrolments, expired evaluator grant, student self-scope, stranger sees nothing, immediate revocation, membership-end retaining family access and history.
- **`02_invariants`** — 15 checks covering every constraint in §3, plus partition inaccessibility and break-glass semantics.
- **`03_write_policies`** — cross-family insert denial, teacher writing outside assignment, view-only write denial, evaluator re-sharing denial, unauthorized update affecting zero rows, user-fabricated AI suggestion denial, self-set compliance status denial, AI telemetry invisibility, guardian audit visibility.

### Still needed before STEP 3 begins

1. **Port the suite to pgTAP** and wire it into CI so it gates merges (it currently runs via the local harness).
2. **Performance baselines** — `EXPLAIN` on the hot paths (`my_student_ids` in child-table policies, calendar range queries, document inbox) against ~10k students, to confirm the definer helpers don't become sequential scans at scale.
3. **Real-Supabase apply** — run the 37 migrations against a fresh Supabase project (the local shim covers `auth.uid()` and storage, but a real apply is the acceptance test) and generate `types/database.generated.ts`.
4. **A second dummy state pack** proving a state can be added with zero code changes — the acceptance test for the compliance engine.
5. **Storage policy tests** — cross-family upload-prefix denial, which needs the real storage stack.
6. **Migration idempotency / rollback rehearsal** on a restored backup.

---

## Notes from the build

Two real bugs were caught by the checks rather than shipped:

1. **Partitions inherit neither RLS nor privilege restrictions.** `audit_logs_2026_09` was directly readable by any authenticated user, bypassing the parent's policies entirely. Every partition is now individually locked, and `tests/rls/02_invariants.sql` §14 asserts it.
2. **Consent ordering was ambiguous.** Two consent events written in the same transaction share `now()`, so a revocation could lose to its own grant. Ordering is now by a monotonic identity sequence, not wall clock.

One deliberate deviation from the approved architecture:

- **`force row level security` is not used.** FORCE applies RLS to the table owner as well, which would make the `SECURITY DEFINER` access helpers recurse into the very policies that call them. Isolation instead comes from the application only ever connecting as `authenticated`, which is never a table owner. Migration 0036 asserts RLS is enabled on every table and every partition.

Full detail: `docs/architecture/11-step2-implementation-notes.md`.
