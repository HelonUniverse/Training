# Homeschool OS — STEP 2.5 Report

**Focused access-control and database-hardening pass. No application UI built.**

**Branch:** `claude/homeschool-os-mvp-arch-l6d0r3`
**Verification:** 49 migrations applied to a real PostgreSQL 16 cluster; 7 test files pass; performance measured at 10,000 students.

**Totals after 2.5:** 49 migrations · 76 tables · 182 RLS policies · 63 `app` functions (49 SECURITY DEFINER, 36 reachable by `authenticated`) · 409 capability rows

---

## 1. Changes made

| # | Concern | Change |
|---|---|---|
| 1 | Resource-scoped authorization | Added **Q2**: `app.can_student_action(student, resource, action)` over an explicit capability matrix (`app.capabilities`, 409 rows). `app.student_access()` is kept as **Q1**, the gate. |
| 2 | Class membership too broad | Class membership now resolves to student-level **`read`**. Academic write comes from the matrix: attendance, portfolio, assignments, assessments, skills, notes, lessons, calendar — and nothing on the guardian / consent / compliance / filing / evaluation / access-grant / retention / enrolment surface. |
| 3 | Evaluator scope not enforced in the DB | `student_access_grants.sections` is now `app.resource_type[]`. Capabilities marked `requires_section` are granted only if the resource is in that array. Enforced in RLS, proven by tests. |
| 4 | Guardian levels too coarse | `full` / `standard` / `view_only` now differ per resource, not just in breadth. Documented in `13-authorization-model.md` §3. |
| 5 | Document visibility | New `app.document_visibility` enum (7 values), default **`family_private`**, plus `document_shares` with trigger-written audit events for every share, un-share and visibility change. |
| 6 | SECURITY DEFINER hardening | Four findings, all fixed (§8). |
| 7 | Service-role boundary | Documented; ESLint flat config + a toolchain-free CI guard script. |
| 8 | Partition regression | Permanent invariant `app.assert_partition_security()` + an event trigger that seals any newly attached partition + assertion in migrations and tests. |
| 9 | Export authorization | `app.can_export_student()` and `app.export_manifest()` reading a registry extended with `export_filter` / `export_excludes`. |
| 10 | Adversarial tests | 4 new test files, ~120 new assertions. |
| 11 | Performance | Two catastrophic per-row policies found and fixed (38s → 19ms, 48s → 17.5ms, 3.0s → 5.8ms). |

## 2. New / modified migrations

| # | File | Contents |
|---|---|---|
| 0038 | `..004000_step25_enums` | `resource_type` (26), `resource_action` (9), `relationship_kind` (13), `document_visibility` (7), 4 new audit actions |
| 0039 | `..004100_authorization_capabilities` | `app.capabilities` + the 409-row matrix + 6 deploy-time guard rails |
| 0040 | `..004200_grant_sections_and_document_visibility` | Typed grant sections; visibility enum conversion; `document_shares`; share/visibility audit triggers |
| 0041 | `..004300_authorization_functions` | Drops every policy and every `p_user` helper; rebuilds the function layer; new `can_read_document`; retention guard trigger |
| 0042 | `..004400_rls_resource_scoped` | The complete policy surface, rebuilt resource-scoped (supersedes 0030–0034) |
| 0043 | `..004500_workflow_guards` | Transition guards: evaluation acceptance, filing approve/sign/submit, document delete, learning-plan activation |
| 0044 | `..004600_definer_hardening` | Default-deny on every `app` function + explicit allowlist; audit actor forced; deploy-time checks |
| 0045 | `..004700_partition_security` | `assert_partition_security()`, event trigger, deploy assertion |
| 0046 | `..004800_export_authorization` | Export gate, manifest, registry filters |
| 0047 | `..004900_step25_invariants` | `app.assert_schema_invariants()` (7 checks) + `app.authorization_model` review view |
| 0048 | `..005000_authorization_performance` | Set-based authorization for the large tables; 7 new scope-set helpers; 3 indexes |
| 0049 | `..005100_final_invariants` | Re-asserts every invariant after the rewrite; bans per-row auth functions on large tables |

Migrations 0001–0037 are unchanged in intent; 0018 and 0043's predecessors were amended in place only where they had never been deployed.

## 3. Final authorization model

Two questions, two mechanisms:

| | Question | Mechanism | Answer |
|---|---|---|---|
| **Q1** | Can this user reach this student at all? | `app.student_access(student)` | `none < read < write < admin` |
| **Q2** | May this user perform this ACTION on this RESOURCE for this student? | `app.can_student_action(student, resource, action)` | boolean |

Both read from one resolver, `app.my_student_relationships()`, which returns
every `(student_id, relationship, sections)` the caller holds. Q2 joins that to
`app.capabilities`. `user_permissions` can **narrow** (deny) but never widen — a
student-scope override with `effect = 'allow'` is refused by a check constraint.

Policy pattern:

```sql
-- SELECT / UPDATE USING: set form, resolved once per statement
student_id in (select app.my_student_ids_for('portfolio', 'read'))
-- WITH CHECK: scalar form, only sees rows actually being written
app.can_student_action(student_id, 'portfolio', 'create')
```

Six guard rails on the matrix itself are asserted at deploy time:
`teacher_note_private` is never grantable; `platform_support` is read-only;
`guardian_view_only` mutates nothing; `class_staff` never reaches the protected
surface; only `guardian_full` signs or submits a filing or accepts an
evaluation; every grant-based academic read is section-scoped.

RLS answers "may you touch this row". **Workflow guard triggers** answer "may
you make this transition" — accepting an evaluation, approving/signing/filing an
official document, soft-deleting a document, activating a learning plan. They
also verify the acting user *is* the recorded approver and that a signature
belongs to its signer.

## 4. Changes to `student_access()`

Kept, and still the Q1 gate. Three changes:

1. **Class membership now returns `read`, not `write`.** This was the requested
   correction and is the single most important change in 2.5.
2. **The `p_user` parameter is gone.** See §8, finding F2.
3. **It reads from `app.my_student_relationships()`** instead of an inline
   seven-branch UNION, so Q1 and Q2 can never disagree about who is related to
   whom. Grant-based relationships now return `read` regardless of the grant's
   `access_level`; grant write authority is expressed per resource in the matrix.

## 5. Resource-scoped permission model

**26 resources** — student_profile, academic_record, portfolio, activity_log,
reading_log, assignment, assessment, skill, learning_plan, attendance, calendar,
teacher_note, teacher_note_private, document, compliance, compliance_submission,
evaluation, evaluator_review, consent, guardian, access_grant,
organization_enrollment, communication, report, incident, audit.

**9 actions** — read, create, update, delete, approve, sign, submit, share, export.

**13 relationships**, 409 capability rows:

| Relationship | Caps | Resources | Non-read actions |
|---|---:|---:|---:|
| guardian_full | 96 | 25 | 71 |
| org_admin | 65 | 24 | 41 |
| guardian_standard | 56 | 23 | 33 |
| staff_assigned_write | 44 | 16 | 28 |
| class_staff | 37 | 15 | 22 |
| platform_support | 21 | 21 | **0** |
| student_self | 19 | 13 | 6 |
| guardian_view_only | 17 | 16 | **1** (send a message) |
| staff_assigned_read | 16 | 15 | 1 |
| grant_evaluator | 16 | 12 | 4 |
| grant_provider | 12 | 9 | 3 |
| grant_review / grant_transfer | 5 each | 5 | 0 |

Review the whole model with `select * from app.authorization_model;`.

**Guardian levels** (`13-authorization-model.md` §3 has the full table). `full`
holds everything. `standard` has full academic authority but no legal or
administrative authority: no guardian management, no access grants, no consent,
no prepare/sign/submit, no evaluation acceptance, no document sharing, no
retention control, no delete, no plan approval, no export, and **no access to
`family_private` documents**. `view_only` reads and sends messages; nothing else.
These record what the system was told — the system does not infer custody rights
beyond what a full guardian explicitly recorded.

## 6. Evaluator-scope enforcement

`sections` is a typed `app.resource_type[]`. A capability marked
`requires_section` applies only when the resource also appears in that array, so
a grant is a list of doors rather than a level of trust. Proven in
`tests/rls/05_evaluator_and_documents.sql`:

- An evaluator granted `{portfolio, reading_log}` reads exactly those, plus the
  student's name and their own evaluation.
- Reads **zero** of that student's documents, teacher notes, assessments,
  consents, guardian records or incident records.
- A second grant on a different student that *does* include `document` does not
  leak across.
- May create, update and **sign** their evaluation; may not `approve` it
  (the trigger rejects it and requires the approver to be the authenticated
  user) and may not `submit` a filing (no capability, no policy).
- Revocation and expiry both take effect on the next query.
- Cannot re-share the student onward (`access_grant.create` is guardian_full only).

Note: `sag_expiry_ck` refuses backdating an expiry below `granted_at` —
early termination is a revocation, not an edit.

## 7. Document visibility model

| Visibility | Readers |
|---|---|
| `family_private` *(default)* | uploader + full guardians |
| `family_shared` | the family |
| `academic_shared` | family + assigned staff + class staff + org admin — **never** grant holders |
| `assigned_staff` | family + explicitly assigned staff; **not** class staff |
| `evaluator_shared` | family + evaluators with a document-scoped grant |
| `organization_operational` | organization **administrators** only |
| `system_compliance` | family + platform support |

Readability = student authorization **AND** visibility **AND** explicit shares.
`document_shares` shares one document with one party, optionally expiring,
revocable; every share, un-share and visibility change writes an audit row by
trigger. The default being `family_private` means a parent-uploaded record is
invisible to staff until someone deliberately, auditably changes that.

Two tightenings came out of writing the tests: `academic_shared` had been an
unconditional `true` (which auto-opened academic documents to any grant holder),
and `organization_operational` had been readable by any org *member* rather than
org admins.

## 8. SECURITY DEFINER audit results

49 SECURITY DEFINER functions reviewed. Four findings, all fixed:

| | Finding | Severity | Fix |
|---|---|---|---|
| **F1** | **All 41 functions in `app` were EXECUTE-able by `PUBLIC`** (the PostgreSQL default). | High | Default-deny loop revoking from PUBLIC/anon/authenticated, then an explicit 27-function allowlist for `authenticated`. Now 36 of 63 are reachable by `authenticated`; internal resolvers, trigger bodies and DDL helpers are not. |
| **F2** | **Authorization helpers accepted `p_user`.** `app.my_student_ids(<victim>)` returned another family's student ids to any authenticated caller; `student_access(s, <other>)` allowed probing. | **Critical** | The parameter is *removed*, not guarded — inside a SECURITY DEFINER function `current_user` is already the owner, so an in-function caller check cannot work. Every function answers only for `auth.uid()`. A deploy-time assertion fails if any of the 24 named helpers regains a user argument. |
| **F3** | **`app.audit()` accepted an arbitrary actor**, allowing forged audit entries. | High | A user session is always recorded as itself; `p_actor` is honoured only when `auth.uid()` is null (a trusted background job). Test asserts a forged actor is overwritten. |
| **F4** | DDL helpers execute dynamic DDL. | Low | They were never SECURITY DEFINER (they ran as the caller and would fail), but EXECUTE is now revoked from application roles regardless. |

Verified for every definer function: `search_path = ''` pinned (deploy-time
assertion), all relation names fully qualified, no dynamic SQL built from
arguments — the only `EXECUTE` calls are the four DDL helpers, using
`format()` with `%I`/`%s` over `regclass` or internally generated identifiers.

**Also found and fixed while doing this:**
`ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` does
**not** suppress PostgreSQL's built-in PUBLIC EXECUTE default — it creates no
`pg_default_acl` entry and a newly created function is still public-executable
(verified empirically on PostgreSQL 16). There is no set-and-forget mechanism:
every new `app` function must revoke explicitly, and the deploy-time assertion
in 0044/0047 is what actually enforces it.

Escalation attempts proven to fail (`tests/rls/06_privilege_escalation.sql`):
enumerate students, read another family's records, call internal resolvers or
DDL helpers or trigger bodies, forge an audit actor, self-grant a permission,
open a support session, self-assign to a student, staff themselves onto a class,
read AI telemetry, read audit or history, query a partition directly, create a
pre-approved AI suggestion, self-set compliance status.

## 9. New adversarial tests

| File | Assertions |
|---|---|
| `04_resource_authorization.sql` | Class staff: read-not-write at student level; attendance/portfolio/assignment/skill/note/lesson writes allowed; 11 protected-surface denials; sibling still unreachable; real writes and real denials. View-only guardian mutates nothing. Standard vs full guardian boundary (10 capability assertions each). Learning-plan activation denied to standard. Org admin cannot set compliance status, file, accept an evaluation, edit custody, or record consent. |
| `05_evaluator_and_documents.sql` | Evaluator section scoping (11 assertions + real queries); no cross-grant leakage; create/sign yes, approve/submit no; revocation and expiry immediate. Document visibility for full/standard/view-only guardian, class staff, assigned staff, evaluator (18 assertions). Explicit share opens exactly one document and writes an audit event; class staff cannot share. Teacher-private notes invisible to other staff and to the family. |
| `06_privilege_escalation.sql` | 9 stranger-scope assertions; 5 uncallable internal functions; 9 closed tables; every partition unreadable by name; forged audit actor overwritten; 4 self-grant attempts; allow-override refused; deny-override actually narrows; pre-approved AI suggestion refused; organization exit (org loses students and documents, keeps its enrolment history; family keeps everything); export boundary for full guardian, standard guardian and teacher. |
| `07_schema_invariants.sql` | `assert_schema_invariants()`, partition seal, matrix size and shape guard rails. |

All 16 cases from the requested matrix are covered, plus the partition and
export cases. Existing STEP 2 tests (01–03) pass unchanged apart from one
assertion updated because the new fixtures give the evaluator a second grant.

## 10. Performance results

Fixture: 100 organizations, 500 teachers, 2,000 families, **10,000 students**,
500 classes, 20,000 class enrolments, 3,000 explicit staff assignments,
**30,000 documents**, 50,000 portfolio items, 40,000 calendar instances.
(`tests/perf/run.sh`)

**Two catastrophic bottlenecks found**, both the same root cause: a scalar
authorization function in a policy `USING` clause is evaluated **once per
candidate row**. Critically, a `FOR ALL` policy's `USING` clause also applies to
`SELECT`, so the write policies were contributing per-row functions too.

| Query | Before | After | Factor |
|---|---:|---:|---:|
| Parent document inbox (20 rows of 30k) | 38,304 ms | **19.1 ms** | ~2,000× |
| Org admin document list (50 rows of 30k) | 47,708 ms | **17.5 ms** | ~2,700× |
| Calendar, one week of 40k instances | 2,957 ms | **5.8 ms** | ~510× |
| Parent student list | 7.0 ms | 7.9 ms | — |
| Parent portfolio feed | 9.0 ms | 9.8 ms | — |
| Teacher student list (class + assignment) | 3.6 ms | 3.7 ms | — |
| Teacher portfolio across caseload | 9.2 ms | 10.0 ms | — |
| Org admin roster | 3.4 ms | 3.3 ms | — |
| `can_student_action()` single call | — | 1.6 ms | — |
| `my_student_ids_for()` (parent) | — | 1.3 ms | — |
| `my_student_relationships()` (parent) | — | 1.0 ms | — |
| `my_student_ids_for()` (teacher, ~230 students) | — | 1.5 ms | — |

Fix: 7 new set-returning scope helpers (`my_document_visibilities`,
`my_shared_document_ids`, `my_class_ids`, `my_manageable_class_ids`,
`my_admin_org_ids`, `my_staff_org_ids`, `my_teaching_org_ids`) and 11 policies
rewritten to set form; 3 supporting indexes. `app.can_read_document()` was
rebuilt on the same `my_document_visibilities()` source as the policy so the two
cannot drift apart. Migration 0049 fails the deploy if a per-row authorization
function reappears in a SELECT-applicable policy on a large table.

## 11. Remaining risk before STEP 3

1. **Not yet run against a real Supabase project.** The local shim covers
   `auth.uid()` and the storage tables, but the event trigger in 0045 may be
   refused by the managed platform (it degrades to a warning; the assertion is
   the real guard), and storage policy behaviour needs a real stack. **Highest
   remaining risk.**
2. **`org_admin` is broad by design.** An org admin holds 65 capabilities over
   every actively enrolled student. That is correct for a microschool operator,
   but it means a compromised org-admin account is a serious incident. Mitigated
   by audit, MFA (STEP 15) and the family-owned data boundary; not eliminated.
3. **Capability drift.** 409 rows is reviewable now. Without discipline it will
   grow into something nobody reads. The deploy-time guard rails cover the six
   rules that matter most; a periodic review of `app.authorization_model` should
   be part of the security review in STEP 14.
4. **`my_student_relationships()` for a very large organization.** Measured fine
   at 100 students/org and ~230 students for a teacher. An org admin over
   5,000+ students will materialise a large set per statement. Re-measure when a
   real tenant approaches that size; the fix (a materialised scope table
   refreshed on membership change) is understood but not warranted yet.
5. **Messaging is still thread-based, not resource-scoped.** `communication`
   exists in the matrix but message policies use thread participation. That is
   correct and safe, but it is a second mechanism; worth folding in if messaging
   grows features.
6. **The `assignment`/`academic_record` split is coarse.** Lessons map to
   `academic_record` and submissions to `assignment`. Fine today; revisit if
   teachers need to be scoped per subject.
7. **No load testing of writes.** All measurements are reads. Write throughput
   with history capture + audit triggers on hot tables is unmeasured.
8. **Storage policy tests** still require a real storage stack (carried over
   from STEP 2).

None of these block STEP 3.
