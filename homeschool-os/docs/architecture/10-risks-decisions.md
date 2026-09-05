# 10 — Design Decisions, Risks, and Gaps in the Brief

## 1. Key decisions (and what they cost)

| Decision | Rationale | Trade-off accepted |
|---|---|---|
| Single `app.student_access()` resolver behind all RLS | One place to reason about access; adding a role touches one function | Needs careful indexing; mitigated with `app.my_student_ids()` for child tables |
| AI proposes, never writes (`ai_suggestions`) | Satisfies every human-in-the-loop requirement structurally, not by convention | One extra click per AI action; more tables; worth it |
| Compliance as data rows, not code | Adding a state = data work; no legal logic in components | Rule DSL must be expressive enough; deliberately kept small and versioned |
| The **family owns the student record**; orgs get revocable memberships | Homeschool families change programs; data must follow the child | Slightly more complex scoping than a pure multi-tenant model |
| Roles resolved from DB per request, never from the JWT | Immediate revocation; no stale-permission window | One extra (indexed, cached) query per request |
| Precomputed `student_compliance_records` | Dashboards stay instant; no rule evaluation at request time | Requires recompute triggers; staleness bounded to one nightly run + write triggers |
| `date` for legal dates, `timestamptz` for instants | A filing date must not shift by timezone | Two date types to keep straight; utility layer enforces it |
| Materialized recurring event instances | Fast day/week queries | A job must keep the ±18-month window filled |
| Append-only `student_skill_events` | Trend analysis is honest; a bad quiz is reversible | More rows; trigger-maintained current value |
| Next.js Server Components as the data layer | Permission checks stay server-side; small client bundle | Drag-and-drop planner and calendar need real client islands — budgeted |
| No payments in MVP, but marketplace tables now | Avoids a painful retrofit of evaluator identity | Some unused columns until V2 |

## 2. Top risks

| Risk | Severity | Mitigation |
|---|---|---|
| **A user treats a status badge as legal advice** | Highest | Fixed vocabulary, mandatory disclaimer component, `unknown` as a real state, `last_verified_on` staleness downgrades, no "compliant" string anywhere |
| **AI fabricates content from a poor scan and a parent files it** | High | Confidence bands, mandatory confirmation for official docs, zero-fabrication CI fixtures, signature + destination gates before any send |
| **Cross-family data leak via a missing policy** | High | RLS forced on all tables, migration lint blocks policy-less tables, pgTAP matrix per table, 404-not-403 |
| **District contact data goes stale → failed filings** | High | Contacts are versioned data with source URL + verified date; user must confirm destination at send; staleness banner |
| **Custody / access disputes** | Medium-high | Per-guardian `access_level`, revocation with audit trail, no silent removals, access log visible to guardians |
| **Scope creep — this is 5 products** | Medium-high | The MVP list in §37 is the contract; anything else is explicitly V2 (see §3 below) |
| **AI cost blowout at scale** | Medium | Async pipeline, per-feature model routing, per-tenant budgets, caching of document analysis by `sha256` |
| **Org staff over-permission by default** | Medium | Explicit per-student assignment required; class membership is the only derivation; audited views |
| **Mobile photo uploads on poor connections** | Medium | Resumable/chunked uploads, client-side compression, optimistic queue with retry |

## 3. Gaps in the brief worth deciding now

These are things I'd want a decision on before or during STEP 2 — most have a sane default I'll take if you don't object.

1. **Spanish (i18n).** Osceola/Kissimmee is majority Hispanic and the existing Helon Universe site already ships an `index-es.html`. Retrofitting i18n is expensive. *Default: build with `next-intl` from STEP 3, English strings only at first, Spanish before launch.* Compliance form output stays in English (filings must be), UI is bilingual.
2. **Who owns the data when a family leaves an org.** *Default (encoded above): the family. Org access ends; nothing is deleted; the family keeps everything and can export it.* This needs to be in the terms of service too.
3. **Data portability and export.** Not in your list, but it is the trust unlock for families joining a program. *Default: full export in STEP 12.*
4. **COPPA / student accounts under 13.** No self-signup, guardian-provisioned credentials, recorded consent, no email required for minors. Also affects marketing analytics on any page a child might see.
5. **Retention & legal hold.** Portfolio retention rules mean "delete my account" cannot mean "delete everything immediately." Encoded as `retention_until` + `legal_hold`, with the reason shown to the user.
6. **Accessibility.** WCAG 2.1 AA as a build requirement, not a cleanup task — you already asked for never-color-alone (§35); the rest (focus order, labels, contrast, reduced motion) should be in the component primitives from STEP 3.
7. **Offline / poor connectivity.** Field trips and co-op basements. *Default: offline-tolerant upload queue + read caching for today's schedule; not a full offline app.*
8. **Timezones and DST.** Called out because recurring class schedules across a DST boundary are the classic calendar bug. Handled by storing RRULE + IANA timezone and materializing instances.
9. **Evaluator credential verification.** The platform will imply trust by listing evaluators. Verification status is a first-class field with a human verification step; unverified evaluators are labeled as such.
10. **Notification volume.** Compliance reminders at T-90/30/7/0 across several children is a lot of email. Digest preferences and quiet hours are in the schema from the start.
11. **Billing hooks.** No payments in MVP, but `organizations.plan` and `ai_usage_daily` exist now so metering and gating don't require a schema migration under time pressure later.
12. **Support/impersonation.** Every SaaS needs it; doing it wrong here is a child-records incident. Break-glass sessions with a stated reason, expiry, and full audit are in from STEP 2.
13. **Duplicate students across families** (shared custody, two households). *Default: one student record, multiple guardians across households, per-guardian access levels — not two records.*
14. **What "learning progress %" actually means.** The dashboard shows a number; it needs a defined, explainable formula (weighted skill mastery over the student's active skill set for the year) with a tooltip that explains it. Vague numbers erode trust fast.
15. **Standards frameworks.** `skills.framework` supports state standards, but the MVP ships an internal skill taxonomy. Mapping to Florida B.E.S.T. standards is a data project — worth scoping separately.

## 4. What I am explicitly not building in MVP
Billing/payments, marketplace transactions, payroll, accounting, native mobile apps, 50-state packs, video conferencing, curriculum marketplace, advanced analytics — per §37. The schema leaves room for each; none of them get code.
