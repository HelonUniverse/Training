# 02 — Roles, Access Spine, and Permission Matrix

## 1. Role taxonomy

Roles are **contextual**, not global. A user is not "a teacher"; a user *is a teacher within organization X*. This is why roles live in join tables, never on `users`.

| Role | Where it is stored | Scope |
|---|---|---|
| Parent / Guardian | `student_guardians(student_id, user_id, relationship, is_primary, access_level)` | Per student |
| Student | `students.user_id` (nullable — many students have no login) | Self only |
| Teacher | `organization_members(role='teacher')` + `student_staff_assignments` | Per org, then per assigned student |
| Tutor | `organization_members(role='tutor')` + `student_staff_assignments` | Per org, then per assigned student |
| Evaluator | `evaluator_profiles` + `student_access_grants(kind='evaluation')` | Per grant, time-boxed |
| Organization Administrator | `organization_members(role='org_admin')` | Whole org (+ optional location scoping) |
| Staff Member | `organization_members(role='staff')` | Whole org, read-mostly, no student academic write by default |
| Super Admin | `profiles.is_super_admin = true` | Platform; every access is audited and requires a stated reason |

Notes that matter:
- **A teacher/tutor never gets automatic access to all students in an org.** Org membership grants org *context* (see the class list, see the calendar); student data requires a row in `student_staff_assignments` or membership in a class the student is enrolled in (`class_staff` + `class_students`), which is a derived assignment.
- **Org admins do get org-wide student access** — but only for students whose family has an *active* `organization_memberships` link, and every document/evaluation view is audited.
- **Evaluator access is time-boxed and revocable**, defaults to 90 days, and is scoped to a subset of sections (`portfolio`, `documents`, `progress`) chosen by the parent.
- **Super admin access is break-glass**: `is_super_admin` alone grants nothing at the RLS layer without an open `support_access_sessions` row with a reason and an expiry. This prevents a compromised admin account from silently reading every child's records.

## 2. The access spine

> **Updated in STEP 2.5.** This section described a single `student_access()`
> gate. The implemented model splits authorization into two questions:
>
> * **Q1 — can this user reach this student at all?** `app.student_access(student)`
>   returns `none < read < write < admin`, resolved from
>   `app.my_student_relationships()`.
> * **Q2 — may this user perform this ACTION on this RESOURCE for this student?**
>   `app.can_student_action(student, resource, action)`, answered from the
>   explicit capability matrix in `app.capabilities`.
>
> Two behaviours changed from the STEP 1 sketch:
>
> 1. **Class membership resolves to `read`, not `write`.** A class teacher's
>    academic write authority comes from the capability matrix, so it covers
>    attendance, portfolio, assignments, skills and notes — and nothing on the
>    guardian / consent / compliance / evaluation / access-grant surface.
> 2. **No authorization function takes a `p_user` argument.** Asking "what may
>    this OTHER user do?" was itself an enumeration surface. Every function
>    answers only for `auth.uid()`.
>
> The full model — relationships, the capability matrix, guardian access levels,
> grant sections, document visibility and the performance rules — is documented
> in [`13-authorization-model.md`](13-authorization-model.md), and the
> implementation is migrations 0038-0049.

## 3. Permission matrix

`—` none · `R` read · `W` create/update · `D` delete (soft) · `A` administer (grant/revoke/configure) · `Rs` read own-scope subset only · `!` requires explicit per-student assignment or grant

| Resource | Parent/Guardian | Student | Teacher | Tutor | Evaluator | Org Admin | Staff | Super Admin |
|---|---|---|---|---|---|---|---|---|
| Own profile | RW | RW | RW | RW | RW | RW | RW | RW |
| Organization settings / branding | — | — | — | — | — | RWA | R | R (break-glass) |
| Locations | — | — | R | R | — | RWA | R | R |
| Org members / invites | — | — | — | — | — | RWDA | R | R |
| Families | Rs (own) | — | Rs! | Rs! | — | RW | R | R |
| Students (roster) | RWD (own) | Rs (self) | R! | R! | R! (granted) | RW | R | R |
| Student demographics/PII | RW | Rs | R! | R! | Rs! | RW | Rs | R |
| Calendar events | RW (own students) | Rs | RW! | RW! | Rs! | RWA | R | R |
| Classes / groups | Rs (enrolled) | Rs | RW (own classes) | RW (own classes) | — | RWDA | R | R |
| Enrollment (add/remove student to class) | — | — | — | — | — | RWA | — | R |
| Lessons | RWD (own students) | Rs (assigned) | RWD! | RWD! | — | RWD | R | R |
| Assignments & submissions | RW | RW (own, submit) | RWD! | RWD! | Rs! | RW | R | R |
| Assessments & results | RW | Rs (own results) | RW! | RW! | Rs! | RW | R | R |
| Portfolio items | RWD | RW (own, add) | RW! | RW! | Rs! | R | Rs | R |
| Activity log / reading log | RWD | RW (own) | RW! | RW! | Rs! | R | Rs | R |
| Skill map | RW (parent rating) | Rs | RW! | RW! | Rs! | R | — | R |
| Learning plan & goals | RWA | Rs | RW! | R! | Rs! | R | — | R |
| Documents (upload) | RWD | W (own work) | RW! | RW! | RW! (evaluation only) | RW | R | R |
| Documents (view file) | R | Rs | R! | R! | Rs! | R (audited) | Rs | R (break-glass, audited) |
| Compliance records | RWA (own students) | — | R! | — | R! | R | R | R |
| Compliance rules / state packs | R | — | R | — | R | R | R | **RWDA** |
| Document submissions (file an NOI etc.) | RWA | — | — | — | — | — (prepare only) | — | R |
| Evaluations | RW (request, review, accept) | — | R! | — | RW (own assigned) | R | R | R |
| Evaluator credentials | R (of granted evaluator) | — | — | — | RW (own) | R | R | RWA (verify) |
| Attendance | RW (own students) | Rs | RW! | RW! | — | RWA | RW | R |
| Messages | RW (own threads) | Rs (parent-enabled) | RW | RW | RW (granted parents) | RWA | RW | — (no read of content) |
| Announcements | R | R | R | R | — | RWDA | RW | — |
| Reports / exports | RW (own students) | — | RW! | R! | RW (own evaluations) | RWA | R | R |
| Notifications & preferences | RW (own) | RW (own) | RW | RW | RW | RW + org defaults | RW | R |
| Audit logs | Rs (own students' access log) | — | — | — | — | Rs (own org) | — | R (all) |
| AI assistant | RW (own scope) | Rs (limited persona) | RW (own scope) | RW | RW (own scope) | RW (org scope) | Rs | RW |
| Billing (post-MVP) | RW | — | — | — | — | RWA | — | R |

### Enforcement layers (all three, always)
1. **Route guard** — layout-level `requireRole()` / `requireStudentAccess()` returns 404 (not 403) for unauthorized student IDs, so IDs cannot be enumerated.
2. **Server action guard** — `withPermission(policy, handler)` wrapper; a mutation without it fails a CI lint check.
3. **RLS** — the database refuses regardless. Tests assert that a raw anon/user client cannot read another family's rows even with a correct UUID.

### Parent-controlled sub-permissions
`student_guardians.access_level` ∈ `full | standard | view_only` supports custody arrangements (a non-custodial guardian who may view progress but not submit official filings or change guardianship). `student_access_grants.sections jsonb` limits an evaluator to exactly the tabs the parent chose.

### Child safety (§26)
- Student accounts are provisioned **by a guardian**, never self-signup; under-13 accounts require a recorded guardian consent event (`consents` table) before activation.
- A student can only be in a thread that includes at least one of their guardians, or a class thread moderated by org staff. `message_thread_participants` has a DB-level check enforcing this; there is no code path to a 1:1 adult↔minor thread.
