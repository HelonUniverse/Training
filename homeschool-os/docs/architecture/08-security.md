# 08 — Security & Privacy Architecture

This system holds children's educational records. Assume every bug is a disclosure incident.

## 1. Defense in depth
1. **Route guards** — layout-level access resolution; unauthorized student IDs → 404.
2. **Server actions** — `withPermission()` + zod input validation + audit write. Enforced by lint.
3. **RLS** — enabled on every table (and on every partition separately); policies call the `app.student_access` spine. `force` is intentionally not used - see 02-database-schema.md.
4. **Storage** — private buckets only; access exclusively through a server route that re-checks permission, signs a ≤5-minute URL, and writes an audit row.

The RLS test suite (`tests/rls/`) is the highest-value test asset in the repo. For every table it asserts: another family cannot read; an unassigned teacher cannot read; an org admin of a *different* org cannot read; an expired evaluator grant cannot read; a revoked guardian cannot read. New table without RLS tests → CI fails.

## 2. Isolation
- **Organization isolation:** every org-scoped table carries `organization_id`; policies require `app.is_org_member(organization_id, …)`.
- **Record ownership:** `data_ownership_registry` classifies every table as family-owned (student educational record), organization-owned (operational record), shared, or platform, and states whether each side retains access when a membership ends.
- **Family isolation:** family-scoped data with `organization_id is null` is reachable only through guardianship.
- **Cross-tenant students:** a student in an org is visible to that org only while `organization_memberships.status='active'`. The family owns the record; ending the relationship ends org access without deleting anything.
- **Context isolation:** the active-context cookie is signed; server code derives scope from the DB, not the cookie's claims alone.

## 3. Files
- Upload: signed ticket, mime allowlist (`pdf, png, jpg, heic, webp, docx, mp4`), magic-byte verification server-side, ≤50 MB (≤500 MB video, post-MVP), per-user rate limit.
- Quarantine bucket → `MalwareScanProvider` → clean bucket. A document is not viewable while `scan_status <> 'clean'`.
- Downloads: `/api/documents/[id]/url` re-checks `app.can_read_student`, audits `document_viewed`, returns a short-lived signed URL. Raw storage paths never reach the client.
- Images stripped of EXIF geolocation on ingest.
- Content-addressed by `sha256` for duplicate detection and tamper evidence.

## 4. Authentication & sessions
Supabase Auth; password minimum 12 chars with breach-list check; email verification required; password reset via single-use expiring token; session refresh in middleware; idle timeout 12h / absolute 30d for parents, 8h for org staff; MFA (TOTP) available for all, **required for org admins and super admins** (post-MVP hard enforcement, architecture in place now). Roles are never read from the JWT — always resolved from the database, so revocation is immediate.

## 5. Rate limiting & abuse
Edge middleware token bucket keyed by user+route class: auth (5/min), upload (20/hr), AI (per-plan), export (10/hr), messaging (60/hr). Backed by a `rate_limits` table (Redis-swappable interface).

## 6. Audit (§32)
Append-only `audit_logs`, monthly partitions, no update/delete policy for any role. Logged actions include: `document_uploaded/viewed/downloaded/deleted`, `evaluation_viewed/signed/completed`, `compliance_document_generated/submitted`, `permissions_changed`, `student_access_granted/revoked`, `staff_added/removed`, `report_exported/shared`, `ai_suggestion_applied`, `support_session_opened`, `login_failed`, `data_exported`. Fields: actor, actor role, action, subject type/id, student id, org id, IP, user agent, metadata, timestamp. Parents can view the access log for their own children — this is a **trust feature**, not just a control.

## 7. Privacy commitments encoded in the system
- **Data portability:** a parent can export everything for a student (documents + structured data as a zip + PDF portfolio) at any time, unconditionally. Built in STEP 12, not "later" — it is what makes the org relationship safe to enter.
- **Deletion:** user-initiated delete is soft; hard deletion runs after a 30-day window unless `legal_hold` or a retention rule (e.g. portfolio retention) applies, in which case the record is retained and the user is told why.
- **Minors:** no self-signup under 13; guardian consent recorded in `consents`; no adult↔minor 1:1 messaging path exists.
- **AI processing** requires an `ai_processing` consent per family, revocable; revoking disables AI features rather than degrading silently.
- Secrets in env only, `config/env.ts` validates at boot with zod and fails fast. Service-role key never reaches the browser bundle (lint-enforced import restriction + a build-time bundle scan).

## 8. Threat model highlights
| Threat | Mitigation |
|---|---|
| ID enumeration | 404 on unauthorized; UUIDv4 ids; no sequential ids anywhere |
| Compromised org admin | RLS scoped to org; every student-record view audited; MFA required; no cross-org reach |
| Compromised super admin | Break-glass session required with reason + expiry; all access audited and visible in admin log |
| Prompt injection via uploaded document | Untrusted-content delimiters; assistant has no write tools beyond `propose_suggestion`; scope injected server-side |
| Malicious upload | Magic-byte check, size caps, malware scan, quarantine bucket, no server-side rendering of untrusted HTML/SVG |
| Stale evaluator access | Grants expire by default; expiry checked per query; instant revoke |
| Accidental official filing | Signature freshness window + explicit destination confirmation + idempotency key |
| Report link leakage | Share tokens hashed, expiring, revocable; snapshot data so a revoked share can't leak later updates |
