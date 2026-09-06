# STEP 4.1 — Real Supabase deployment verification

Project `homeschool-os-dev` (`ucgxdtulnzumrroanais`), PostgreSQL **17.6**.
Local harness for comparison: PostgreSQL **16.13**.

---

## 1. Deployment result

All nine STEP 4 migrations applied to the managed project, plus one forward fix.

| # | Migration | Ledger version |
|---|---|---|
| 0056 | `20260906010000_activity_kinds` | 20260906162557 |
| — | `20260906010200a_audit_action_document_scanned` | 20260906162737 |
| 0057 | `20260906010100_capture_rpcs` | 20260906162703 |
| 0058 | `20260906010200_scan_and_sharing` | 20260906162929 |
| — | `20260906010300a_audit_action_invitation_accepted` | 20260906162942 |
| 0059 | `20260906010300_invitations_and_email` | 20260906163309 |
| 0060 | `20260906010400_storage_read_and_dupes` | 20260906165517 |
| 0061 | `20260906010500_protect_scan_status` | 20260906170819 |
| 0062 | `20260906010600_batch_view_audit` | 20260906170833 |
| 0063 | `20260906010700_capture_notifications` | 20260906171218 |
| 0064 | `20260906010800_infected_visibility` | 20260906171234 |
| **0065** | `20260906020000_view_write_grants` | applied |

`supabase db push` was not usable: the sandbox egress proxy returns **403 to
`CONNECT`** for both `*.supabase.co` and `api.supabase.com`. The approved
Supabase MCP `apply_migration` channel was used instead.

**Two deployment details that differ from the repo files.**

1. `ALTER TYPE app.audit_action ADD VALUE` was **split out of 0058 and 0059**
   into their own migration steps (the two `...a` rows above). PostgreSQL
   forbids *using* a freshly added enum label in the transaction that adds it,
   and MCP `apply_migration` wraps each call in one transaction. Locally each
   psql statement autocommits, so the single file is safe there.
2. The leading comment banners of 0057–0059 were trimmed when sent through MCP.
   The schema effect is identical, and the digest comparison in §2 proves it.

## 2. Migration ledger status

64 migration files in the repository are represented by 37 ledger rows: the
STEP 1–2.6 files were applied as bundles during earlier acceptance runs, and
STEP 4's nine were applied individually (plus the two enum splits). 0065 makes
65 files.

**Drift: none.** `scripts/schema-digest.sql` — twelve counts and MD5s over the
catalog — produces byte-identical output on local PG16 and managed PG17.6:

```
buckets_public               0    none
buckets_total                6    c2514f3190e8460a12d7b4236c0dca57
capabilities_rows          409    a96b65a721e561e1e3de768ac819ffbb
definer_without_search_path  0    none
enum_labels                486    b55813fb943110b2ccc376667077babc
functions_app_public        90    e7256c28975d105c9506a53ea014329c
policies_public            185    73c92d0fbd86d4d3e9a975d3146024cf
policies_storage             7    5e72593de13e23cf6bab72944af81f5f
tables_with_rls            151    4b56493694e9831e1d3f45d195c6f8c6
tables_without_rls           0    none
triggers_public            179    186bf92aed5ff07fede29ddf745d08b6
view_write_grants_to_users   0    none
```

- RLS on every one of 151 public tables; none without.
- All 6 storage buckets private; 7 storage policies including 0060's
  `read own clean document bytes`.
- Capability matrix exactly **409** rows.
- SECURITY DEFINER / INVOKER as designed for all 22 STEP 4 functions; the
  INVOKER RPCs add transactionality only, never authority.
- **0** SECURITY DEFINER functions without a pinned `search_path`.
- `app.assert_schema_invariants()` passes on managed.
- Generated TypeScript types match `types/database.generated.ts` exactly, once
  two generator-version cosmetics are normalised (`__InternalSupabase` marker
  block; `NonNullable<Json>` vs `Json` for non-null `jsonb`). Every table,
  column, enum, function signature and relationship is identical.

## 3–9. Behaviour, as real authenticated users on managed

**110 checks, 110 passing.** Executed through the real policies with
`request.jwt.claim.sub` set to real `auth.users` rows and the role switched to
`authenticated`, so RLS applied to every statement.

| Area | Checks | Result |
|---|---|---|
| Capture | 12 | pass |
| Scan gate (0061) | 7 | pass |
| Storage, 4 real users | 11 | pass |
| Duplicate privacy | 6 | pass |
| Sharing, revoke, expiry | 16 | pass |
| Signed-view gate | 9 | pass |
| Notifications | 4 | pass |
| Invitations | 23 | pass |
| Service-role boundary | 5 | pass |
| Journeys A–D | 17 | pass |

Highlights worth stating in full:

- **The scan gate holds.** `PATCH scan_status` and `PATCH scanned_at` from a
  user session are both refused by 0061's trigger, while an ordinary title
  correction on the same row still succeeds — the guard is narrow, not blunt.
- **Bytes follow scan state.** `pending`, `error` and `infected` each yield
  *zero* readable objects even to the uploader; only `clean` delivers. The
  infected *record* stays readable (0064), so the refusal can be explained.
- **Sharing is audited once, not twice**, revoke and expiry both take effect
  within the same session, and no unrelated user can discover that a share
  exists.
- **The duplicate check is not a cross-tenant oracle**: an identical file in
  another household matches nothing and raises nothing.
- **Invitations** store only a SHA-256 hash, the outbox never holds a live
  token, and forwarded / expired / cancelled / already-used links all fail
  identically.
- **The service-role boundary has two independent locks**, both proven:
  `authenticated` cannot execute `app.record_scan_result` at all, *and* the
  function refuses even a `service_role` caller when a user session is present.
  The repo guard `scripts/check-service-role.sh` was proven able to fail on all
  four of its arms by planting real violations.

## 10. Browser suite

Rerun locally as the UI half: **74 passed, 0 failed** across desktop, tablet and
mobile (4 mobile-only tests skipped on the wider viewports by design).

**No browser-to-cloud journey was performed, and none is claimed.** The sandbox
cannot reach `*.supabase.co` at all.

## 11. Managed performance

Measured on PostgreSQL 17.6 in the cloud.

| Operation | ms |
|---|---|
| `app.student_access` (Q1) | 3.50 |
| `app.can_student_action` (Q2) | 4.04 |
| Portfolio timeline, top 50 through RLS | 3.23 |
| Documents list, top 50 through RLS | 0.24 |
| `register_document` (capture write path) | 10.48 |
| `find_duplicate_document` (pre-upload check) | 0.40 |
| `record_document_views` — a page of 10 in ONE call | 2.37 |
| Storage read authorization (the signed-URL gate) | 11.44 |
| `app.record_scan_result` (worker write) | 1.40 |

Nothing shows the shape of a per-row query.

## 12. The bug this run found

`public.ai_usage_summary` is deliberately a SECURITY DEFINER view. A view
without `security_invoker` executes as its **owner for writes as well as
reads**, it is auto-updatable, and `authenticated` held *every* privilege on it
rather than only `SELECT`. So an organization admin could do this:

```sql
update public.ai_usage_summary set input_tokens = 999999 where id = ...;  -- 1 row
delete from public.ai_usage_summary where id = ...;                       -- 1 row
```

Both reached `ai_usage_events` through the view, as the view's owner, with the
base table's RLS bypassed — letting an org admin silently rewrite or erase her
own AI cost and usage ledger.

It survived earlier review because a stranger genuinely reads nothing through
the view, and that is the test everyone writes. The `WHERE` clause is a real
read filter — but it was the *only* gate, and it answers *who may see this row*,
which is not the same question as *who may destroy it*. Reading and writing were
authorised by one predicate and only one of them was ever tested.

Fixed forward in **0065**: everything but `SELECT` revoked on every view in
`public`, plus a schema invariant so it cannot return. Verified on managed —
the org admin still reads her aggregates, and `UPDATE`/`DELETE`/`INSERT`
through the view are all refused. A behavioural regression test in
`tests/rls/06_privilege_escalation.sql` was proven to fail when the grant is
put back.

## 13. Known non-blocking differences

- **PG16 local vs PG17.6 managed.** No observable behavioural difference; all
  twelve digests match.
- **`app.has_consent(..., p_user uuid, ...)`** is the one function taking a
  `p_user` argument. It is a STEP 1 consent-lookup helper, it is referenced by
  no policy and called by no function, and it is not part of the two-question
  authorization model. Dead code, worth removing in a later step.
- **Advisor: `security_definer_view` (ERROR) on `ai_usage_summary`.** Expected
  and documented in 0050 — the view must bypass RLS to project a safe column
  subset. Now read-only (0065).
- **Advisor: `authenticated_security_definer_function_executable` (WARN)** on
  `accept_invitation` and `preview_invitation`. By design: an invitee cannot
  read the `invitations` table. Both are proven safe by 23 invitation checks.
- **Advisor: `rls_enabled_no_policy` (INFO ×75)** on `audit_logs_*` partitions.
  RLS on with no policy is deny-all, which is the intended direction; the
  parent carries the policy (migration 0045).
- **Advisor: `auth_leaked_password_protection`** is off. A project setting, not
  schema. Recommended before real users.
- **Supabase Pro** lifts the two-project limit, but the blocker here is the
  *sandbox egress proxy*, not the plan — a paid plan does not open
  `*.supabase.co` to this environment.
- Test scaffolding schemas `t` and `t41` were dropped from the managed project
  after the run. `t41.results` (158 rows) and `t41.timings` were kept as the
  evidence of it.

## Verdict

**PASS.** STEP 5 may begin.
