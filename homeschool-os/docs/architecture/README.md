# Homeschool OS — MVP Architecture

> Teach. Document. Stay organized. AI handles the rest.

**Status:** STEP 1 — architecture only. No application code has been written yet.
**Launch market:** Florida (state-agnostic core, pluggable compliance packs).
**Audience:** a senior engineer taking over this project cold.

## Document map

| File | Contents |
|---|---|
| `README.md` (this file) | System architecture, stack, runtime topology, product principles → technical mapping |
| `01-roles-permissions.md` | Roles, access spine, full permission matrix |
| `02-database-schema.md` | Tables, columns, relationships, indexes, conventions |
| `03-navigation-routes.md` | Route tree, navigation per role, URL contracts |
| `04-workflows.md` | Primary end-to-end workflows (state machines) |
| `05-folder-structure.md` | Repository/folder architecture |
| `06-ai-architecture.md` | AI abstraction, document pipeline, suggestion model, assistant/RAG, guardrails |
| `07-compliance-engine.md` | Rule engine data model, evaluator, Florida pack |
| `08-security.md` | RLS, isolation, storage, audit, threat model |
| `09-build-plan.md` | STEP 2 → STEP 15 execution order with definitions of done |
| `10-risks-decisions.md` | Design decisions, risks, and gaps in the original brief |

---

## 1. System architecture

### 1.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)**, React 19, TypeScript (`strict`) | Server Components let us do permission-checked data access on the server and ship almost no data-fetch logic to the browser. |
| Styling | **Tailwind CSS** + local primitives (shadcn/ui-style, vendored not imported) | Premium, calm design system fully under our control; no vendor lock on component APIs. |
| Database | **PostgreSQL via Supabase**, UUID PKs, RLS on every table | Single source of truth; RLS is the last line of defense even if app code is wrong. |
| Auth | **Supabase Auth** (email+password, magic link, OAuth later) | JWT carries `auth.uid()`, consumed directly by RLS. |
| Files | **Supabase Storage**, private buckets only, signed URLs (≤5 min) | No public object URLs, ever. |
| Server logic | Next.js Route Handlers + Server Actions; **Supabase Edge Functions** for webhooks & long jobs | Keeps secrets server-side; edge functions handle provider callbacks and cron. |
| Background work | `job_queue` table + Edge Function worker on a cron schedule | No extra infra in MVP; swappable for a real queue later. |
| AI | Provider-agnostic interfaces (`AIProvider`, `DocumentAnalysisProvider`) | Default adapter: Anthropic. Never import a vendor SDK outside `lib/ai/providers/*`. |
| PDF | React-PDF (`@react-pdf/renderer`) rendered server-side | Deterministic, no headless browser in MVP. |
| Email | `EmailProvider` interface (default adapter: Resend) | Compliance submissions must be able to move providers without touching workflow code. |
| Hosting | Vercel (app) + Supabase (data) | Matches the team's existing footprint. |

**Non-negotiable rule:** no vendor SDK is imported outside its adapter directory. Application code imports interfaces from `lib/ai`, `lib/email`, `lib/storage`, `lib/pdf`, `lib/notifications` only.

### 1.2 Runtime topology

```
Browser (RSC payloads + minimal client islands)
   │  HTTPS only, session cookie (Supabase SSR cookie adapter)
   ▼
Next.js on Vercel
   ├─ middleware.ts .............. session refresh, org/role hydration, rate limiting
   ├─ Server Components ......... read via user-scoped Supabase client → RLS applies
   ├─ Server Actions ............ writes, wrapped in requirePermission() + audit()
   └─ Route Handlers ............ file signing, exports, AI streaming, webhooks
   ▼
Supabase
   ├─ Postgres .................. RLS policies + SECURITY DEFINER access functions
   ├─ Storage ................... private buckets: uploads-quarantine, documents, portfolio, generated
   ├─ Edge Functions ............ job-worker, virus-scan-callback, compliance-nightly, digest-email
   └─ Auth ...................... JWT (sub = user id); app roles live in DB, NOT in the JWT
   ▼
External adapters (all behind interfaces)
   AIProvider · DocumentAnalysisProvider · EmailProvider · StorageProvider · MalwareScanProvider · SignatureProvider
```

### 1.3 The three architectural spines

Everything in this product hangs off three ideas. If you understand these, you understand the system.

**Spine 1 — Student access resolution.**
Every student-scoped read and write in the entire product resolves through one SQL function, `app.student_access(student_id, user_id)`, returning `none | read | write | admin`. Guardianship, org membership, explicit staff assignment, and temporary evaluator grants all feed that one function. RLS policies never re-implement access logic; they call it. Adding a new role means teaching that function about the role — not editing 40 policies.

**Spine 2 — Proposal, not mutation (the AI safety spine).**
AI never writes to a domain table. AI writes to `ai_suggestions` (a proposal, with confidence, rationale, and a target action payload). A human accepts it and *the application* performs the write, in a transaction, with an audit row and `source = 'ai_confirmed'`. This one rule satisfies §7, §8, §9, §17, §18, §39 simultaneously, and makes "AI made a mess" recoverable by definition.

**Spine 3 — Compliance as data, not code.**
No file outside `lib/compliance/` may contain the string "Florida", a statute reference, or a deadline. Rules are rows in `compliance_rules` with a small declarative JSON schema for triggers and due-date math. A pure evaluator turns (student facts × active rules) into `student_compliance_records`. Adding Georgia is a seed file plus form templates.

### 1.4 Product principles → technical mapping

| Principle (§1) | Mechanism |
|---|---|
| "Is my documentation current?" answered in seconds | `student_compliance_records` is precomputed nightly + on write; the dashboard reads one indexed row per student, never evaluates rules at request time. |
| "What does my child have today?" | `calendar_events` with a `(organization_id, starts_at)` and per-student index; day view is a single range query. |
| Design around actions, not databases | Every dashboard card carries a primary action route. The nav is nouns; the cards are verbs. |
| Feels simple, backend is powerful | Complexity lives in the DB (RLS, rule engine) and in `lib/`. Screens are thin. Parents see ≤5 controls per screen. |
| Never claim legal compliance | The UI renders only enum states from the rule engine (`current`, `needs_attention`, `incomplete`, `overdue`, `upcoming`, `unknown`) plus a standing disclaimer component. No free-text legal claims anywhere. |

### 1.5 Naming / branding centralization (§41)

```ts
// config/brand.ts — the only place product identity exists
export const brand = {
  name:        process.env.NEXT_PUBLIC_BRAND_NAME        ?? 'Homeschool OS',
  shortName:   process.env.NEXT_PUBLIC_BRAND_SHORT_NAME  ?? 'HOS',
  tagline:     process.env.NEXT_PUBLIC_BRAND_TAGLINE     ?? 'Teach. Document. Stay organized.',
  logoUrl:     process.env.NEXT_PUBLIC_BRAND_LOGO_URL    ?? '/brand/logo.svg',
  supportEmail:process.env.NEXT_PUBLIC_SUPPORT_EMAIL     ?? 'support@example.com',
  legalEntity: process.env.NEXT_PUBLIC_LEGAL_ENTITY      ?? '',
} as const;
```
Lint rule (`no-hardcoded-brand`) fails CI on a literal "Homeschool OS" outside `config/brand.ts`. Per-organization branding (logo, accent color, from-name on email) lives in `organizations.branding jsonb` and overrides the global brand inside org context.
