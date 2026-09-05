# 12 — The Service-Role Boundary

The service-role key bypasses RLS entirely. It is not "an admin key" — it is a
key that turns every policy in this document set off. Treat any place it appears
as a place where the whole authorization model does not exist.

## 1. Where service-role credentials are permitted

| Entry point | Why it needs the service role | Constraint |
|---|---|---|
| `supabase/functions/job-worker` | Drains `job_queue`, which has no user-facing policy at all | Must re-derive scope from the job payload, never trust it blindly |
| `supabase/functions/ai-pipeline` | Writes `document_ai_analysis` and `ai_suggestions` for documents belonging to many families | Writes only proposals; may never write a domain table |
| `supabase/functions/compliance-nightly` | Recomputes `compliance_requirements` / `student_compliance_records` across all students — these tables have no user write policy by design | Pure function of rules × facts; writes nothing else |
| `supabase/functions/scan-callback` | Moves files out of quarantine and sets `documents.scan_status` before any user may read them | Only touches scan columns |
| `supabase/functions/materialize-events` | Fills `calendar_event_instances`, which has no user write policy | Derived data only |
| `supabase/functions/digest-email` | Reads across users to build notification digests | Must respect `notification_preferences` |
| `app/api/cron/*` | Vercel-invoked scheduled work; verifies the cron secret before doing anything | Rejects any request without the platform cron header |
| `app/api/webhooks/*` | Provider callbacks (email delivery, malware scanner, signature) with no user session | Must verify the provider signature first |
| `scripts/*` | Operator tooling, run by a human with credentials of their own | Never deployed |

Everything on that list runs **server-side only, with no user session**, and each
one is expected to write an `audit_logs` row for anything it does to a student
record.

## 2. Where it is forbidden — without exception

- Any client component, any file carrying `'use client'`.
- Any browser bundle. A service-role key in a `NEXT_PUBLIC_*` variable is a full
  data breach of every family on the platform.
- Ordinary server actions. If the acting user has the authority, use the
  user-scoped client so RLS applies as a second check. Reaching for the service
  role because "the policy is getting in the way" is the bug, not the fix.
- Route handlers that serve a logged-in user, including the signed-URL endpoint.
  That endpoint re-checks `app.can_read_document()` as the *user* and only then
  mints a URL with a short-lived server credential.

**Rule of thumb:** if a human is waiting for the response, the request runs as
that human.

## 3. How it is enforced

1. **Module boundary.** The service client lives in exactly one file,
   `lib/supabase/service.ts`. Nothing else may construct it.
2. **ESLint** (`eslint.config.mjs`, written in STEP 2.5, active from STEP 3):
   `no-restricted-imports` blocks `lib/supabase/service` everywhere except the
   allowed entry points, and blocks client components from importing the server
   client or server actions at all.
3. **CI guard** (`scripts/check-service-role.sh`) — a toolchain-free grep that
   runs today and fails the build on: a service-role import outside the
   allowlist, a secret exposed through `NEXT_PUBLIC_*`, a `'use client'` file
   importing a server-only module, or a server action missing its permission
   wrapper.
4. **Environment separation.** `SUPABASE_SERVICE_ROLE_KEY` is validated in
   `config/env.ts` under a server-only schema; the client schema does not
   contain it, so a client-side read is a type error before it is a leak.
5. **Bundle scan.** The production build greps the emitted client chunks for the
   key prefix and fails the deploy on a hit — the last line of defence if
   somebody defeats all of the above.

## 4. Reviewing a service-role change

Any diff that touches `lib/supabase/service.ts`, adds a file to the ESLint
allowlist, or edits `scripts/check-service-role.sh` is a security change. It
needs the same scrutiny as an RLS policy change: state which trusted job needs
it, why user-scoped access is insufficient, and what audit rows it writes.
