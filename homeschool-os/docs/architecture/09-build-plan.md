# 09 — Development Order

Each step is independently shippable and must not regress a prior step. Every step ends with: migrations applied, RLS tests green, unit/integration tests green, typecheck + lint clean.

| Step | Deliverable | Definition of done |
|---|---|---|
| **1** | Architecture (this document) | Approved by the product owner |
| **2** | Migrations: enums, identity, tenancy, students, access spine, RLS + pgTAP suite; system seeds (subjects, skills) | A second family cannot read the first family's rows through any client; `app.student_access` unit-tested for all 7 branches |
| **3** | Auth, invites, parent onboarding, org onboarding, app shell, context switcher, design system primitives | A new user reaches a populated dashboard in <4 min; invite acceptance grants exactly the intended role |
| **4** | Parent dashboard + org command center (real data, no AI narration yet) | All §4 and §5 cards render from live queries; every "needs attention" row links to the action that clears it |
| **5** | Student profile (12 tabs), guardians, access grants, student settings | Access grant creation/revocation works end-to-end and is audited |
| **6** | Calendar (day/week/month/year), recurrence materialization, classes/groups, enrollment, attendance | Recurring weekly class renders correctly across a DST boundary; attendance hidden for families that disabled it |
| **7** | Lesson planner: manual lessons, weekly drag-and-drop planner, assignments | Drag to reschedule updates lesson + calendar atomically; copy-week works |
| **8** | Portfolio, universal upload, document storage, signed URLs, malware scan hook, activity log, reading log | Upload → view → delete is fully audited; duplicate upload detected; quarantined file is not viewable |
| **9** | AI: provider abstraction, document pipeline, `ai_suggestions` + appliers, Document Inbox, AI lesson generator, portfolio suggestions | Golden-set accuracy target met; blank fixture produces "couldn't identify", not a fabrication; nothing is written without confirmation |
| **10** | Compliance engine, Florida pack (draft→verified), compliance dashboard, submission workflow W6 | Adding a second dummy state pack requires zero code changes; no send path exists without signature + destination confirmation |
| **11** | Evaluator accounts, dashboard, evaluation workflow, credentials, evaluation PDF, marketplace-ready schema (no payments) | Evaluator sees exactly one student's granted sections; grant expiry blocks access |
| **12** | Reports (all 11 kinds) + PDF export + share links + full family data export | Every report renders from a snapshot; expired share token returns 404 |
| **13** | AI assistant with permission-scoped tools; daily brief; weekly report; progress engine | Adversarial prompt cannot retrieve out-of-scope students (automated test); assistant cannot write to domain tables |
| **14** | Security review | Full RLS matrix test pass; storage access audit; dependency and secret scan; prompt-injection test suite; penetration checklist |
| **15** | Production readiness | Observability (Sentry + structured logs), backups + restore drill, seed guard verified, rate limits tuned, a11y (WCAG 2.1 AA) audit, mobile QA on iPhone/iPad, runbook, incident + breach response doc |

**Cross-cutting from step 2 onward:** notifications architecture is built incrementally alongside the feature that emits each notification type; `audit()` is called from day one, not retrofitted.

**Parallelization:** steps 6+7 and 10+11 can run concurrently once step 5 lands. Steps 9 and 13 share the AI foundation; build 9 first.
