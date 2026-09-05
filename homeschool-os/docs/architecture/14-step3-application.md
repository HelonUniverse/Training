# STEP 3 — Application foundation

How the product is put together, and the decisions worth knowing before touching it.

## Layout

```
src/
  app/                        App Router
    (auth)/                   sign-in, sign-up, forgot/reset - no product chrome
    auth/callback/            email link → session exchange
    onboarding/               role choice, parent (5 steps), organization (4 steps)
    app/                      the product, behind auth + completed onboarding
      home, learning, calendar, portfolio, documents, progress,
      messages, records, reports, settings, more, children/new
      org/                    organization workspace (Command Center et al.)
  components/
    ui/                       design system: primitives, patterns, interactive
    app/                      shell, navigation, switchers
  lib/
    supabase/                 server / browser / middleware clients
    auth/                     session, context resolution, permission guard
    reference.ts              states, counties, subjects, goals (static)
    onboarding.ts             onboarding state machine + resume
  server/actions/             Server Actions (the only mutation path)
  i18n/                       locale resolution
messages/                     en-US.json, es-US.json
types/database.generated.ts   generated, never hand-written
```

## The three clients, and which to use

| Client | Runs as | Use for |
|---|---|---|
| `lib/supabase/server.ts` | the signed-in user | everything in Server Components and Server Actions |
| `lib/supabase/client.ts` | the signed-in user | browser-side reads, anon key only |
| *service role* | bypasses RLS | **nothing in STEP 3** |

There is no service-role client in this codebase. `scripts/check-service-role.sh`
fails CI if one appears outside the documented entry points, and the ESLint flat
config carries the same boundary as a lint rule.

## Authorization

RLS is the authority. Nothing in the UI decides what a user may see or do; the
UI only decides what to *show*.

`lib/auth/guard.ts` exports `requirePermission()`, which every authenticated
Server Action calls. It is not a second authorization system — it exists so that

- an action can never run for an anonymous caller,
- a student-scoped action asks `public.can_student_action` (a thin invoker-side
  bridge to the same `app.can_student_action` the policies call) rather than
  re-implementing the capability matrix in TypeScript,
- the CI guard can mechanically prove every `'use server'` file is wrapped.

`src/server/actions/auth.ts` is exempt and says so in a greppable marker: sign-in
and sign-up run before a session exists, so there is no permission to check.

## Onboarding writes

Onboarding creates a family, a membership, a student, a guardianship, an
academic year and subjects. Through PostgREST each would be a separate request,
so a failure halfway would leave a half-built family. Instead it calls
`public.onboard_parent` / `public.onboard_organization` / `public.add_child`,
which are **SECURITY INVOKER** — they run as the calling user, so RLS applies to
every statement inside, and the only thing they add is atomicity.

Three RLS bootstrap gaps had to be closed first (migration 0052): the policy
that authorises a first membership read the very table being written. See that
migration's header for the reasoning, and note the second-order trap it
documents — an inline `exists (select ... from families ...)` guard is itself
RLS-filtered and silently evaluates false, which is why those guards live in
SECURITY DEFINER helpers.

Two further findings came out of running the flows end to end:

- **`INSERT ... RETURNING` applies the SELECT policy.** A newly created student
  is not yet readable by the parent who created it (readability flows from the
  guardian link, inserted on the next statement), so `returning id into` fails.
  Ids are generated with `gen_random_uuid()` instead (0053).
- **A uniqueness pre-check under RLS lies.** `select ... where slug = ?` cannot
  see another tenant's organization, so it reported a taken slug as free and the
  insert died on the constraint. The fix is to attempt the insert and react to
  the real constraint (0054).

## Context switching

A user may be a parent and an organization administrator. `lib/auth/context.ts`
resolves the active workspace from a cookie, but the cookie is a *preference*:
the candidate list comes from `getContexts()`, which is RLS-scoped, and a value
that does not match one of those is ignored. A forged cookie can at most select
a workspace the user already belongs to.

Parent-owned family records and organization administration are never merged
into one view. Switching context changes navigation, dashboard and data scope.

The student switcher works the same way and calls `router.refresh()` on change,
which discards server-rendered state from the previous child so nothing carries
over into forms or, later, AI context.

## Internationalisation

`next-intl`, no locale prefix in URLs. The active locale comes from a cookie set
by the Settings switcher, with `profiles.locale` as the durable record. All
user-facing strings live in `messages/*.json`; feature components hold none.

## Empty states and honest numbers

A count is shown only when there is something to count. Where there is not, the
UI shows a human state — "Getting started", "No evidence yet", "Nothing
scheduled" — never `0%`, which reads as failure rather than as a beginning.

The organization setup checklist reflects real database state. No alert is
fabricated: with no students, "Everything looks good" is the truth.

## Florida

Recognised, not activated. The compliance pack remains draft and inactive, so
the records page shows the state and county and offers to help organize. It
shows no due dates, no district contacts, and never the word "compliant".

## Testing

`tests/e2e` runs the real journeys against a real PostgreSQL carrying the real
migrations, via `tests/harness/fake-supabase.mjs`. That harness is not a mock:
it translates REST and RPC calls to SQL and executes them as the `authenticated`
role with `request.jwt.claims` set, so **RLS is genuinely enforced** and a
cross-tenant test failure would be a real one. It exists because this workspace
has no Docker and no egress to `supabase.co`; where those are available, run
`supabase start` instead.
