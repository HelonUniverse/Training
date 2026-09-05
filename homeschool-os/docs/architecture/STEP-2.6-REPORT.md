# STEP 2.6 — Real Supabase Acceptance Test

**Result: PASS.** The STEP 2/2.5 database and security architecture was applied from zero to a
real, Supabase-managed PostgreSQL 17.6 instance and behaves as designed. Two defects were found
and fixed (migrations 0050 and 0051); the remaining differences are documented below and are
non-blocking.

| | |
|---|---|
| Project | `homeschool-os-dev` (`ucgxdtulnzumrroanais`), us-east-1, free tier |
| Server | PostgreSQL **17.6** (local harness is 16.x — the version gap was the main thing under test) |
| Migrations | **51** applied from an empty database (49 from STEP 2/2.5, plus 0050 and 0051 from this pass) |
| Date | 2026-09-05 |

---

## 1. Migrations

All 51 migrations applied cleanly to the managed instance, and independently to a from-scratch
local PostgreSQL 16 database. Every deploy-blocking `DO` block inside them passed on PG17:
the STEP 2 invariants (0036), the SECURITY DEFINER assertions (0044), the partition-security
assertion (0045), the export boundary check (0046), and the full invariant suites (0047, 0049).

One honest caveat about *how* they were applied. The sandbox has no Docker and no network egress
to `supabase.co`, so the Supabase CLI could not be used. The migrations were transmitted through
the MCP `apply_migration` tool, which meant grouping the 49 files into 20 ledger entries rather
than 49. The **file-by-file** application was verified separately against local PG16, and the
resulting schemas were then compared byte-for-byte (§2), so the grouping introduced no drift.
For STEP 3, migrations should be applied with `supabase db push` from an environment that has
egress, which will produce a 1:1 ledger.

## 2. Transcription fidelity — local PG16 vs. managed PG17

Because the migrations were retyped through a tool boundary, the two schemas were compared with
MD5 digests over the system catalogs rather than trusted by eye.

| Digest | Match |
|---|---|
| Column names, types, nullability (74 tables) | identical |
| RLS policies — name, command, `USING`, `WITH CHECK` (182) | identical |
| `app` functions — signature, `prosecdef`, `proconfig` (63) | identical |
| Enum labels (67 types) | identical |
| Constraints, with full definitions (754) | identical |
| Triggers, with full definitions (175) | identical |
| Capability matrix rows (409) | identical |
| `authenticated`-executable function set (36) | identical |
| Index definitions | **differs on 3 tables — cosmetic only** |

The index difference is confined to `organizations`, `profiles` and `students`, and is a rendering
artifact, not a schema difference. Both databases use the identical operator class
`extensions.gin_trgm_ops`; `pg_get_indexdef()` prints it schema-qualified locally and unqualified
on Supabase, because Supabase's default `search_path` includes `extensions`. Verified directly
against `pg_opclass`. Counts also matched exactly across the board: 74 tables, 74 partitions,
182 policies, 63 functions, 67 enums, 409 capabilities, 175 triggers, 754 constraints, 2 views.

## 3. Platform behaviour verified on real Supabase

| Check | Result |
|---|---|
| `pg_trgm` extension | installed (1.6) |
| `auth.uid()` resolves from `request.jwt.claims` | yes; and returns NULL with no JWT |
| `auth.users` → `profiles` trigger | fired for all 10 real auth users |
| Partitioned `audit_logs` / `record_history` | 74 monthly partitions created and sealed |
| `secure_new_partitions` event trigger | **installed successfully** — the safe-degradation path was written but not needed |
| `revoke all on schema public from anon` | succeeded |
| `authenticated` / `anon` role attributes | no superuser, no `BYPASSRLS`, no `CREATEROLE`, no `CREATEDB` |
| Tables owned by `authenticated` / `anon` | none (owners bypass non-forced RLS, so this matters) |
| `anon` grants on `public` | none |
| Storage buckets | 6, all private |

## 4. Authorization — real Supabase Auth users, real RLS

Ten real `auth.users` rows were created with bcrypt passwords via `extensions.crypt`, then
impersonated exactly the way PostgREST does (`set_config('request.jwt.claims', …)` followed by
`SET LOCAL ROLE authenticated`). Roles covered: full guardian, standard guardian, view-only
guardian, org admin, assigned teacher, class teacher, evaluator, student, other family, stranger.

All checks passed, including: a full guardian sees exactly 2 students and reads `family_private`;
a standard guardian can write academic records but cannot file compliance documents, share the
child, or export; a view-only guardian's write is rejected with `insufficient_privilege`; an
assigned teacher sees 1 student and not the sibling; class membership grants READ only, never
custody or consent authority; an evaluator sees only the live grant and an expired grant
disappears immediately; a stranger enumerates zero students, documents, audit rows and telemetry;
nobody reads an infected document; and on leaving an organization the org loses the student while
the family keeps students, documents and portfolio.

**The harness was verified to actually enforce.** A deliberate negative control — asserting that a
stranger *can* see students — failed as required (`expected 2, got 0`). Without that control, a
silently no-op test suite would look identical to a passing one.

Ten `storage.objects` cases also passed against the real table: uploads confined to the caller's
own family prefix, cross-family writes rejected, a forged `owner` column rejected, traversal
prefixes rejected, avatars scoped to the caller's own UUID folder, and org branding writable only
by an org admin and invisible to non-members.

## 5. Defects found and fixed

**0050 — `ai_usage_summary` lacked `security_barrier` (real, fixed).**
The view has no `security_invoker`, so it executes as its owner and bypasses RLS on
`ai_usage_events` — that part is deliberate and correct, and is the only way to give an org admin
cost data while withholding provider internals (RLS is row-level; granting row access would also
expose `provider`, `model` and `error_message`). But without `security_barrier`, the planner may
push a cheap caller-supplied predicate *below* the view's authorization filter, leaking rows for
organizations the caller does not administer. Fixed by adding the barrier and making the
`(A and B) or C` precedence explicit. Behaviour verified unchanged before and after: org admin
sees 1 row (their own org), guardian/other-family/stranger see 0, and the raw table stays closed
to all four. The view's column list contains no provider, model, prompt or error field.

**0050 — 12 `app` functions had a role-mutable `search_path` (real, fixed).**
None was SECURITY DEFINER, so the 0044/0047 invariant did not cover them — but they are trigger
bodies and DDL helpers that execute inside other people's transactions, where a caller-controlled
`search_path` changes which function a bare name resolves to. All 12 pinned;
`ensure_month_partitions` also had its bare `pg_class` reference qualified. The invariant was
widened to *every* function in `app`/`public`, plus a new rule that any non-`security_invoker`
view must carry `security_barrier`, so neither can regress.

**0051 — duplicate index on `calendar_event_instances` (real, fixed).**
Migration 0048 added `cei_class_idx (class_id, starts_at)` when 0015 already had
`cei_class_start_idx` on the same columns; the `if not exists` guard missed it because the names
differ. Double write amplification and storage on a table that grows one row per recurring-event
occurrence (~40,000 in the scale seed). Dropped, with an invariant that fails on any future
duplicate.

After the fixes, all 7 local RLS suites still pass and the schema digests still match.

## 6. Things that are working as designed, not defects

**Quarantine bucket is not readable, even by the uploader.** An assertion that the uploader could
read back their own pending upload failed. This is the documented design, not a bug —
`STEP-2-REPORT.md` records "no SELECT policy on document buckets — all reads are server-minted
signed URLs, so every view is audited." The test was corrected, not the schema.

**75 `rls_enabled_no_policy` advisories.** These are the 74 partitions plus `job_queue`. Partitions
deliberately have RLS enabled, no policies and no grants — they are sealed, and all access goes
through the parent. This is the permanent partition invariant, so the advisory is the expected
signal of a correct configuration.

**1 remaining `security_definer_view` ERROR.** The linter flags the property, not the risk. Kept
deliberately, now with `security_barrier`, documented in a `COMMENT ON VIEW`, and reviewed above.

## 7. Platform differences worth knowing for STEP 3

1. **`storage.protect_delete()`** — managed Supabase installs a trigger that blocks *all* direct
   SQL `DELETE` from `storage.objects`, including as `service_role`. Deletion must go through the
   Storage HTTP API. This does not exist in the local shim. Any cleanup job that expects to
   `DELETE FROM storage.objects` will fail.
2. **`search_path` includes `extensions`**, which is why extension operator classes render
   unqualified. Harmless, but it means index DDL text is not a reliable cross-environment
   comparison key — compare `pg_opclass` instead.
3. **PG17 vs PG16** produced no behavioural difference in any policy, function or constraint.

## 8. Generated types

`types/database.generated.ts` was generated from the live Supabase schema (17,514 lines) — not
hand-written. Enum-typed columns are strongly typed as inline string-literal unions; spot-checked
`documents.visibility`, which carries all 7 members. The `public.Enums` block is empty only because
every enum lives in the `app` schema and is therefore expanded at each use site rather than named.

## 9. Service-role boundary guard

`scripts/check-service-role.sh` was proven to fail CI, not merely to exist. Against a synthetic
tree: a clean tree passes (exit 0); a service-role import from an ordinary page fails; a
`NEXT_PUBLIC_*SERVICE_ROLE*` variable fails; a `'use client'` component importing a server-only
module fails; and an unwrapped server action fails. The ESLint flat config carries the same
boundary as a lint rule.

One limitation: the server-action check is a substring grep, so the literal text `withPermission`
appearing anywhere in the file — including inside a comment — satisfies it. The ESLint rule is the
stronger enforcement; the shell script is the toolchain-free CI backstop.

## 10. Performance sanity

Not the 10,000-student study (explicitly out of scope). Representative queries on managed hardware,
under RLS as a real authenticated user:

| Query | Time |
|---|---|
| Students | 0.10 ms |
| Documents (inbox, limit 20) | 0.15 ms |
| Portfolio feed (limit 20) | 0.09 ms |
| Calendar instances (limit 100) | 0.07 ms |
| `app.my_student_relationships()` | 1.75 ms |
| `app.can_read_document()` (single row) | 7.37 ms |

Consistent with the STEP 2.5 local results. Small dataset, so these confirm no pathological
regression rather than proving scale.

## 11. Non-blocking items deferred to STEP 3

1. **`auth_rls_initplan` — 42 policies.** Bare `auth.uid()` in a policy is re-evaluated per row;
   wrapping it as `(select auth.uid())` makes PostgreSQL hoist it into an InitPlan. STEP 2.5 fixed
   this for the scalar *authorization functions* but left the inline `auth.uid()` comparisons.
   Deliberately **not** changed here: rewriting 42 policies without re-running the full
   10,000-student EXPLAIN suite would risk a regression to trade for an optimisation the measured
   numbers do not yet demand. It should be one focused pass with the perf suite re-run.
2. **`multiple_permissive_policies` — 22 tables.** Tables with both a `_select` and a `FOR ALL`
   `_write` policy evaluate both on SELECT. Correct but not free; the fix is to narrow the write
   policies to `FOR INSERT/UPDATE/DELETE`.
3. **`unindexed_foreign_keys` (286) and `unused_index` (469).** Not actionable on an empty
   database — "unused" only means no traffic yet. Re-run against realistic data.
4. **Leaked-password protection** is off. It is a Supabase Auth dashboard setting, not schema.
   Enable it in STEP 3.
5. **Drop the `t` schema** (test harness) before any production deploy — it is the source of the
   5 remaining `function_search_path_mutable` warnings and must never ship.

## 12. Acceptance gate

| Pass condition | Status |
|---|---|
| All migrations apply to real Supabase | PASS (51/51) |
| Required extensions available | PASS |
| SECURITY DEFINER functions behave as expected | PASS |
| RLS parity with the local harness | PASS (policy digest identical) |
| Storage stack works | PASS (10 cases) |
| Partition security holds | PASS (74 sealed) |
| Event trigger supported or degrades safely | PASS (supported) |
| `auth.uid()` works | PASS |
| `authenticated` has no owner/service-role authority | PASS |
| Generated types produced from the real schema | PASS |

**The gate passes. The architecture is sound on the real platform.**

Cleanup: `homeschool-os-dev` has been paused, and `verified-agent` — paused only to free a
free-tier project slot — has been restored.
