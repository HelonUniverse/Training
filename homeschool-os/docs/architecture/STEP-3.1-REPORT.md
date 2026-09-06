# STEP 3.1 — Deployment verification

Applied migrations 0052–0055 to the real Supabase development project
(`homeschool-os-dev`, `ucgxdtulnzumrroanais`, PostgreSQL 17.6) and verified the
STEP 3 fixes under real Supabase Auth and RLS.

## Deployment mechanism

`supabase db push` is **not usable in this environment**. The egress proxy
rejects both the management API and the database host:

```
api.supabase.com                    -> CONNECT tunnel failed, 403
db.ucgxdtulnzumrroanais.supabase.co -> CONNECT tunnel failed, 403
pooler:6543                         -> no TCP route
```

The Supabase MCP `apply_migration` tool was used instead — the normal deployment
mechanism actually available here. Each migration was applied as its own ledger
entry named after its migration file. No already-deployed migration was
modified; 0052–0055 are forward migrations only.

A free-tier slot had to be freed (2-project limit). `verified-agent` was paused
with the owner's explicit approval and **restored afterwards**;
`homeschool-os-dev` is paused again now that verification is complete.

## Results

| Check | Result |
|---|---|
| 0052–0055 deploy | clean, all deploy-time assertions passed on PG17 |
| Ledger | 26 rows, 4 new entries, names match the migration files |
| Schema drift | none — 8/9 digests identical to local; the 9th is the known cosmetic `pg_get_indexdef` trigram rendering |
| Capability matrix | **409 rows, unchanged** |
| RLS | 0 tables without RLS, 0 insecure partitions, 0 anon grants |
| Invariants | `app.assert_schema_invariants()` passes |
| Generated types | 150/150 tables, identical enums, the four RPCs byte-identical, app typechecks |
| Advisors | 82 lints, byte-identical to the STEP 2.6 baseline — no new finding |

## Parent bootstrap

`onboard_parent` succeeded as a real authenticated user: family created,
creator became a family member, student created, creator became full guardian,
`student_access = admin` immediately, `add_child` produced a second student.
Both bootstrap guards closed behind themselves (`is_new_family_founder` and
`is_founding_guardian_candidate` both false afterwards).

## Organization bootstrap

`onboard_organization` succeeded: creator became `org_admin`, Command Center
data loads (1 org, 2 members, 1 enrolment, 1 family, 1 student in scope).

**Duplicate slug, the point of 0054:** a *different* tenant requesting the same
name received `helon-learning-program-f6e8ca` instead of an error — resolved by
the real uniqueness constraint, not by the RLS pre-check that could not see the
other tenant's row.

## Authorization bridge — `public.can_student_action`

| Role | access | profile.read | portfolio.read | portfolio.create | attendance.create | guardian.update | consent.create | compliance.submit | export | access_grant.create |
|---|---|---|---|---|---|---|---|---|---|---|
| Parent | admin | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Teacher | write | Y | Y | Y | Y | n | n | n | n | n |
| Org admin | admin | Y | Y | Y | Y | n | n | n | n | n |
| Evaluator | read | Y | Y | n | n | n | n | n | n | n |
| Stranger | none | n | n | n | n | n | n | n | n | n |

No widening. Note the org admin row: `student_access = admin` yet every
legal/custodial resource answers **n** — exactly the STEP 2.5 point that an
access level alone confers no resource authority.

**Impersonation is structurally impossible**: the function takes
`(p_student, p_resource, p_action)` only. There is no user argument anywhere in
the signature; identity comes solely from `auth.uid()`. It is SECURITY INVOKER
with `search_path` pinned, `anon` cannot execute it.

## Adversarial results (all denied)

Attacker against a separate victim family: sees 0 students, 0 families,
`student_access = none`; joining the family, becoming a guardian, and
`add_child` into that family all **DENIED**; both bridge answers false; both
bootstrap guards closed.

Org admin of an enrolling organization: becoming the child's guardian
**DENIED**, joining the family **DENIED**.

Teacher: self-promotion to `org_admin` by UPDATE **DENIED**, by INSERT
**DENIED**.

Evaluator: after grant expiry, `access = none`, portfolio read false, 0 students
visible — revocation is immediate.

## Service-role guard

Baseline clean across `src/app`, `src/lib`, `src/components`, `src/server`
(exit 0). Proven to fail by injection, then removed:

| Injected violation | Location | Exit |
|---|---|---|
| service-role client import | `src/app` | 1 |
| service-role env read | `src/lib` | 1 |
| `NEXT_PUBLIC_*SERVICE_ROLE_KEY` | `src/components` | 1 |
| unwrapped `'use server'` action | `src/server` | 1 |

Baseline restored to exit 0, no probe files left in the tree.

## Bugs found

None. No forward fix was required.

One thing worth recording: `app.assert_schema_invariants()` **caught a scratch
table** (`public._step31`) I created for the test run, because it had no RLS.
That is the invariant doing its job on live infrastructure, and the table was
dropped.

## Limitation, stated plainly

The **browser** journey could not be run against the real project: the app runs
in this sandbox and the sandbox cannot reach `supabase.co`. What was verified
against the real project is the complete database call sequence the app makes —
profile read, onboarding gate, contexts, student switcher, the four dashboard
counts, records/Florida, subjects, academic years, and the Command Center reads
— executed as the real authenticated users through the real RPCs and RLS. The
browser journey itself (29 Playwright tests, three widths) was re-run with
0052–0055 applied against the RLS-faithful local harness and passes.

To close this gap, run the Playwright suite from an environment with egress,
pointed at the dev project.
