# 13 — The Authorization Model

Two questions, two mechanisms. This is the whole model.

| | Question | Mechanism | Answer |
|---|---|---|---|
| **Q1** | Can this user reach this student at all? | `app.student_access(student)` | `none < read < write < admin` |
| **Q2** | May this user perform this ACTION on this RESOURCE for this student? | `app.can_student_action(student, resource, action)` | boolean |

Q1 is a **gate**, not an authorization. Every resource policy also asks Q2.

## 1. Relationships

`app.my_student_relationships()` returns every relationship the current user has
to any student. It is the single input to both questions.

| Relationship | Source | Q1 level |
|---|---|---|
| `student_self` | `students.user_id` | read |
| `guardian_full` | `student_guardians.access_level = 'full'` | admin |
| `guardian_standard` | `student_guardians.access_level = 'standard'` | write |
| `guardian_view_only` | `student_guardians.access_level = 'view_only'` | read |
| `staff_assigned_write` | `student_staff_assignments.access_level = 'write'` | write |
| `staff_assigned_read` | `student_staff_assignments.access_level = 'read'` | read |
| `class_staff` | active `class_staff` × active `class_students` | **read** |
| `org_admin` | `org_admin` of an org with an **active** enrolment | admin |
| `grant_evaluator` / `grant_provider` / `grant_review` / `grant_transfer` | live `student_access_grants` | read |
| `platform_support` | open `support_access_sessions` + `is_super_admin` | read |

**Class membership resolves to `read`, not `write`** (changed in STEP 2.5).
A class teacher's academic write authority comes from the capability matrix, not
from a blanket student-level grant.

## 2. The capability matrix

`app.capabilities(relationship, resource, action, requires_section)` — presence
of a row means allowed. 409 rows, all enumerable:

```sql
select * from app.authorization_model order by relationship, resource;
```

| Relationship | Capabilities | Resources | Write-ish actions |
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

Six guard rails are asserted at deploy time (migration 0039):
`teacher_note_private` is never grantable; `platform_support` is read-only;
`guardian_view_only` mutates nothing; `class_staff` never reaches the protected
surface; only `guardian_full` signs or submits a filing or accepts an
evaluation; every grant-based academic read is section-scoped.

**`user_permissions` may only narrow.** A student-scope override must have
`effect = 'deny'` (check constraint). There is no runtime string that widens
authority — that would require a migration.

## 3. Guardian access levels

These record what the system was told. **They are not a legal determination of
custody, and nothing infers custody rights beyond what a full guardian
explicitly recorded.**

| | `full` | `standard` | `view_only` |
|---|---|---|---|
| Read the academic record | ✓ | ✓ | ✓ |
| Create/edit academic work, portfolio, logs, attendance | ✓ | ✓ | — |
| Edit the student profile | ✓ | ✓ | — |
| Upload documents | ✓ | ✓ | — |
| Read `family_private` documents | ✓ | — | — |
| Share a document | ✓ | — | — |
| Change retention / legal hold | ✓ | — | — |
| Delete an educational record | ✓ | — | — |
| Approve a learning plan | ✓ | — | — |
| Manage guardians | ✓ | — | — |
| Grant access to the child (evaluator, provider) | ✓ | — | — |
| Record consent | ✓ | — | — |
| Prepare / sign / submit an official filing | ✓ | — | — |
| Accept an annual evaluation | ✓ | — | — |
| Export the whole record | ✓ | — | — |

`standard` exists for the second household in a shared-custody arrangement:
full participation in the child's education, no unilateral legal authority.
`view_only` is for a guardian who should see progress and nothing more.

## 4. Evaluator and provider grants

A grant carries a typed `sections app.resource_type[]`. A capability marked
`requires_section` is granted **only if the resource also appears in that
array**, so a grant is a list of doors, not a level of trust.

An evaluator granted `{portfolio, reading_log}` can read exactly those, plus the
student's name (needed to write the report) and their own evaluation record.
They cannot read documents, assessments, teacher notes, consents, guardian
records, incident records, or anything belonging to another student — verified
in `tests/rls/05_evaluator_and_documents.sql`.

They may create, update and **sign** their own evaluation. They may not
`approve` it (accepting is the parent's act) and may not `submit` it (filing is
the parent's act). Expiry and revocation both take effect on the next query.

## 5. Document visibility

Reaching a student never means reading every document belonging to them.
Readability is **student authorization AND visibility AND explicit shares**.

| Visibility | Who can read |
|---|---|
| `family_private` | The uploader and full guardians only |
| `family_shared` | The family (all guardians + the student) |
| `academic_shared` | Family + staff with academic access (assigned staff, class staff, org admin) — never grant holders |
| `assigned_staff` | Family + explicitly assigned staff; **not** class staff |
| `evaluator_shared` | Family + evaluators holding a document-scoped grant |
| `organization_operational` | Organization **administrators** only; not the family, not general staff |
| `system_compliance` | Family + platform support |

**The default is `family_private`.** A parent-uploaded record is invisible to
staff until someone deliberately changes that, and the change is audited.

`document_shares` is the escape hatch: one document, one party, optional expiry,
revocable. Every share and un-share writes an `audit_logs` row by trigger, as
does every visibility change.

## 6. Performance

A scalar authorization function in a policy `USING` clause is evaluated **once
per candidate row** — including in a `FOR ALL` policy, whose `USING` clause also
applies to `SELECT`. On a table that grows, that is a production outage.

The rule: **resolve the authorized set once per statement.**

```sql
-- SELECT / UPDATE USING: set form, one hashed subplan per statement
student_id in (select app.my_student_ids_for('portfolio', 'read'))

-- WITH CHECK: scalar form is fine, it only sees rows actually being written
app.can_student_action(student_id, 'portfolio', 'create')
```

Measured on 10,000 students / 30,000 documents / 40,000 calendar instances:

| Query | Per-row | Set-based |
|---|---:|---:|
| Parent document inbox | 38,304 ms | **19 ms** |
| Org admin document list | 47,708 ms | **17.5 ms** |
| Calendar week | 2,957 ms | **5.8 ms** |

Migration 0049 fails the deploy if `can_read_document()` or `can_read_class()`
reappears in a SELECT-applicable policy on any of the large tables.
