# 05 — Folder Architecture

Homeschool OS lives in `homeschool-os/` at the repo root, isolated from the existing Helon Universe training site.

```
homeschool-os/
├── app/
│   ├── (marketing)/                 public pages
│   ├── (auth)/                      login, signup, invite, onboarding
│   ├── (app)/                       authenticated shell
│   │   ├── layout.tsx               sidebar + context switcher + notification bell
│   │   ├── home/                    role-routed dashboard
│   │   ├── students/[studentId]/    tabbed profile (12 tabs)
│   │   ├── calendar/ academics/ portfolio/ documents/ compliance/
│   │   ├── messages/ reports/ assistant/ activity/ reading/ settings/
│   │   ├── org/[orgSlug]/           organization context
│   │   └── evaluator/
│   ├── (admin)/                     super admin
│   └── api/                         route handlers (upload, signed urls, ai stream, cron, webhooks)
│
├── components/
│   ├── ui/                          primitives: Button, Card, Badge, Dialog, Sheet, Table, Tabs…
│   ├── patterns/                    StatusBadge, StatCard, EmptyState, ConfirmDialog,
│   │                                AIDisclosure, ConfidenceChip, NeedsAttentionList,
│   │                                PersonAvatar, DateRangePicker, FileDropzone
│   ├── students/ calendar/ lessons/ portfolio/ documents/ compliance/
│   ├── messaging/ reports/ ai/      feature components
│   └── layout/                      AppShell, Sidebar, MobileTabBar, ContextSwitcher
│
├── lib/
│   ├── supabase/                    server.ts, client.ts, middleware.ts, service.ts (guarded)
│   ├── auth/                        session.ts, requireRole.ts, requireStudentAccess.ts
│   ├── permissions/                 policy.ts (single source of truth mirroring RLS), withPermission.ts
│   ├── ai/
│   │   ├── types.ts                 AIProvider, DocumentAnalysisProvider interfaces
│   │   ├── providers/anthropic/ openai/ mock/
│   │   ├── prompts/                 versioned prompt modules (v1/, v2/…)
│   │   ├── schemas/                 zod schemas for every structured output
│   │   ├── pipeline/                extract.ts ocr.ts classify.ts suggest.ts
│   │   ├── assistant/               tools.ts (permission-scoped), retrieval.ts, guardrails.ts
│   │   └── suggestions/             apply.ts (one applier per suggestion kind)
│   ├── compliance/
│   │   ├── engine/                  evaluate.ts, dueDate.ts, triggers.ts, types.ts
│   │   ├── packs/florida/           rules.ts, templates/, districts.ts, sources.md
│   │   └── templates/               PDF form templates
│   ├── storage/                     StorageProvider + supabase adapter, signing, validation
│   ├── email/                       EmailProvider + resend adapter, templates
│   ├── pdf/                         renderers per report kind
│   ├── notifications/               dispatch.ts, channels/, preferences.ts
│   ├── progress/                    skill scoring, trend detection, insight generation
│   ├── audit/                       log.ts (typed action enum)
│   ├── jobs/                        enqueue.ts, handlers/
│   ├── validation/                  zod schemas shared by forms + server actions
│   └── utils/                       dates (tz-safe), format, id, result types
│
├── server/actions/                  server actions grouped by domain, all wrapped in withPermission
├── config/                          brand.ts, navigation.ts, features.ts, statuses.ts, env.ts (zod-validated)
├── supabase/
│   ├── migrations/                  NNNN_verb_object.sql
│   ├── functions/                   job-worker, compliance-nightly, digest-email, scan-callback
│   ├── seed/system/                 subjects, skills, FL pack, district contacts (production-safe)
│   └── seed/dev/                    development fixtures only
├── tests/
│   ├── rls/                         pgTAP — one file per policy area (the highest-value tests here)
│   ├── unit/                        compliance evaluator, skill scoring, date math, prompt schemas
│   ├── integration/                 server actions with a real DB
│   ├── e2e/                         Playwright: onboarding, upload→confirm, submission, evaluation
│   └── ai/                          golden-set document fixtures + accuracy thresholds
├── types/                           database.generated.ts (supabase gen) + domain types
└── docs/architecture/               this documentation
```

**Rules**
1. `lib/supabase/service.ts` (service-role key) may only be imported by `supabase/functions/**` and `app/api/cron/**`; enforced by an ESLint `no-restricted-imports` rule.
2. No component fetches data; Server Components and server actions do.
3. Every server action: `withPermission(policy, async (ctx, input) => …)` + zod-validated input + audit call. CI lint fails otherwise.
4. Vendor SDKs only inside `lib/*/providers/*`.
5. Feature components never import from another feature's folder — shared pieces move to `components/patterns/`.
