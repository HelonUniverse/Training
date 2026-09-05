# 11 — STEP 2 Implementation Notes

What was actually built, what changed from the STEP 1 architecture, and why.

## 1. Additions requested before STEP 2

| Requirement | Implementation |
|---|---|
| **i18n** | `locales` reference table (data, not an enum) seeded with `en-US` and `es-US`; `profiles.locale`, `organizations.default_locale` + `supported_locales[]`, `families.default_locale`, `students.locale`, plus per-row `locale` on invitations, lessons, reports, announcements, consent policies and compliance packs. `content_translations` carries locale overrides for **database-resident** content (subject names, skill names, rule text); UI chrome is translated by next-intl catalogues from STEP 3. Spanish subject names ship in the system seed. |
| **Data ownership split** | `app.record_class` enum (`student_educational`, `organization_operational`, `shared`, `platform`) on documents, portfolio items, attendance, teacher notes, incident reports, staff records, organization documents — plus `data_ownership_registry`, a machine-readable table stating, per table, who owns it, whether each side retains access when a membership ends, and whether it is included in the family export. The export job, retention job and membership-end job all read that table instead of hard-coding lists. New organization-owned tables: `incident_reports`, `staff_records`, `organization_documents`. |
| **Historical org membership** | `student_organization_memberships` (student, organization, location, academic year, enrollment type, status, start/end date, end reason, data sharing) is the **authoritative** source for organization access. `students.primary_organization_id` remains only as a trigger-maintained convenience column and is documented as never used for access decisions. Ending a membership revokes access on the next request while the history row survives — asserted in `tests/rls/01_access_matrix.sql` §10. |
| **Consent architecture** | `consent_policies` (versioned policy text per locale) + `consents`, a strictly append-only event log with `supersedes_id`, `policy_version`, `document_version`, `method`, `scope`, `metadata`. UPDATE and DELETE are blocked by trigger for every role. Revocation inserts a superseding row. `current_consents` (security-invoker view) and `app.has_consent()` derive current state. |
| **Provenance** | A standard block — `source_type`, `source_id`, `entered_by`, `ai_generated`, `ai_suggestion_id`, `human_confirmed_by`, `human_confirmed_at` — on `student_skills`, `student_skill_events`, `assessments`, `assessment_results`, `portfolio_items`, `activity_logs`, `reading_logs`, `lessons`, `learning_plans`, `learning_goals`. Enforced invariant: `ai_generated = true` requires **both** a suggestion id and a human confirmation, because AI never writes directly. |
| **AI cost observability** | `ai_usage_events` records provider, model, feature, prompt version, org/user/student/document, input/output/**cached** tokens, estimated cost, latency, status, error and the exact `permission_scope` the retrieval layer was allowed to use. `ai_usage_daily` is the rollup for budgets. Provider internals are not exposed: the base table is readable only under a break-glass session, and organization administrators read `ai_usage_summary`, a view that omits provider, model, prompt version and error text. |
| **Temporal history** | `record_history` — a partitioned, append-only before/after capture with `changed_fields[]`, attached to `students`, `student_skills`, `learning_plans`, `learning_goals`, `student_organization_memberships`, `student_staff_assignments`, `student_guardians`, `student_access_grants`, `compliance_requirements`, `student_compliance_records`, `evaluations`, `ai_suggestions`, `organization_members`, `consents`, `documents`, `document_submissions`, `user_permissions`. It complements the domain-level history some tables keep natively (`student_skill_events`, consent events, learning plan versions). |

## 2. Deviations from the STEP 1 architecture (and why)

**`force row level security` is not used.** FORCE applies RLS to the table owner as well. The entire access model depends on `SECURITY DEFINER` helper functions reading the access tables; under FORCE those functions would recurse into the very policies that call them. Isolation instead comes from the application connecting only as `authenticated`, which is never a table owner. Migration `0036` asserts RLS is on for every table and every partition.

**Partitions are locked individually.** RLS is not inherited by partitions, and `audit_logs_2026_09` is a queryable table name. Every partition gets `enable row level security` and has privileges revoked from `authenticated`/`anon`, so all access must go through the partitioned parent. `tests/rls/02_invariants.sql` §14 asserts a partition is not directly readable. This was a real hole found by the invariant check, not a theoretical one.

**`ai_interactions` + `ai_usage_counters` were merged** into `ai_usage_events` + `ai_usage_daily`, matching the richer telemetry contract requested above.

**`consents` carries a monotonic `seq`.** Two consent events written in the same transaction share `now()`, which made "the latest event" ambiguous and let a revocation lose to its own grant. Ordering is by identity sequence, not wall clock. Found by `tests/rls/02_invariants.sql` §4.

**`ltree`, `citext` and `btree_gist` were dropped.** Skill ancestry uses a trigger-maintained `ancestor_ids uuid[]` with a GIN index (subtree lookup is `ancestor_ids @> array[:id]`), email uniqueness uses a `lower(email)` index, and no exclusion constraints were needed. The schema now depends on exactly one extension, `pg_trgm`, so it runs on stock PostgreSQL as well as Supabase — which is what makes the local test cluster possible.

## 3. Invariants the database enforces (not just the UI)

1. AI can never mark a skill `mastered` — requires `teacher_observed`/`assessment_confirmed` **and** a human confirmer.
2. `ai_generated` rows require a suggestion id **and** a human confirmer.
3. `ai_suggestions.requires_confirmation` cannot be false — there is no auto-apply path.
4. Consents, signatures, skill events, audit rows and history rows cannot be updated or deleted.
5. A document's `storage_path`, `bucket`, `sha256`, `byte_size` and filename cannot change after insert.
6. A document under legal hold or inside a retention window cannot be soft-deleted.
7. An official filing cannot reach `sent`/`delivered`/`acknowledged` without an approver, a signature and a snapshotted destination.
8. A compliance rule cannot be `active` without `last_verified_on` **and** a named `verified_by`; a pack cannot be `active` without a named publisher.
9. A learning plan cannot be `active` without a human approver.
10. A private thread containing a minor must also contain one of that minor's active guardians.
11. `is_super_admin` grants nothing without an open, time-boxed `support_access_sessions` row carrying a written reason (max 24h).
12. An evaluation cannot be `submitted` without the evaluator's signature and a report; only a parent can move it to `accepted_by_parent`.
13. Auto-generated activity log rows are deduplicated by `(student_id, dedupe_key)`.

## 4. What STEP 2 deliberately did not do

- No application code, no TypeScript types generation (STEP 3 runs `supabase gen types`).
- No compliance rule content — the Florida pack ships as a **draft scaffold** with placeholder requirement text, `obligation_level = 'unknown'`, `active = false` and no verification date, exactly as the constraints require. Legal content is a human verification task, not a code task.
- No district contact data beyond three scaffold rows, all unverified.
- Billing tables (invoices, payments) — `organizations.plan` and the AI usage rollup are the only hooks.
- Vector/embedding storage for the assistant — the STEP 13 assistant uses permission-scoped tool calling, not a vector store.
