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

```sql
-- returns 'none' | 'read' | 'write' | 'admin'
create function app.student_access(p_student uuid, p_user uuid default auth.uid())
returns app.access_level
language sql stable security definer set search_path = '' as $$
  select coalesce(
    -- 1. the student themself
    (select 'read'::app.access_level from public.students s
      where s.id = p_student and s.user_id = p_user),
    -- 2. guardian
    (select case when sg.access_level = 'full' then 'admin' else 'write' end
       from public.student_guardians sg
      where sg.student_id = p_student and sg.user_id = p_user
        and sg.revoked_at is null),
    -- 3. explicit staff assignment (teacher/tutor)
    (select ssa.access_level from public.student_staff_assignments ssa
      where ssa.student_id = p_student and ssa.user_id = p_user
        and ssa.active and (ssa.ends_on is null or ssa.ends_on >= current_date)),
    -- 4. derived: staff on a class the student is enrolled in
    (select 'write'::app.access_level from public.class_students cs
       join public.class_staff cst on cst.class_id = cs.class_id
      where cs.student_id = p_student and cst.user_id = p_user
        and cs.active and cst.active),
    -- 5. org admin over the student's organization
    (select 'admin'::app.access_level from public.organization_members om
      join public.students s on s.organization_id = om.organization_id
     where s.id = p_student and om.user_id = p_user
       and om.role in ('org_admin') and om.status = 'active'),
    -- 6. time-boxed grant (evaluator, temporary reviewer)
    (select sag.access_level from public.student_access_grants sag
      where sag.student_id = p_student and sag.grantee_user_id = p_user
        and sag.status = 'active' and sag.expires_at > now()),
    -- 7. break-glass support session
    (select 'read'::app.access_level from public.support_access_sessions sas
      where sas.user_id = p_user and sas.expires_at > now()
        and (sas.student_id = p_student or sas.student_id is null)),
    'none'::app.access_level
  );
$$;
```

Companion helpers, all `security definer`, all `stable`:
`app.can_read_student(uuid)`, `app.can_write_student(uuid)`, `app.can_admin_student(uuid)`,
`app.is_org_member(uuid, app.org_role[])`, `app.my_student_ids()` (returns setof uuid; used for fast IN-list policies on high-volume child tables),
`app.can_read_org(uuid)`, `app.current_profile()`.

Performance note: `app.my_student_ids()` is materialized per statement via a `stable` function; child-table policies (`portfolio_items`, `activity_logs`, `assignments`, …) use `student_id in (select app.my_student_ids())` rather than re-running the full resolution per row. Verified with `EXPLAIN` in the RLS test suite.

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
