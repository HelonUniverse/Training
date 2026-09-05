# 03 — Navigation & Routes

## 1. Navigation model

Navigation is generated from a single declarative table (`config/navigation.ts`) filtered by the viewer's role and active context. There is no per-role copy of the nav component.

```ts
type NavItem = {
  key: string; label: string; href: string; icon: IconName;
  contexts: ('family' | 'org' | 'evaluator' | 'student')[];
  roles: Role[];              // omitted = all roles in those contexts
  featureFlag?: string;       // e.g. 'attendance' for families that enabled it
  badge?: (ctx) => number;    // needs-attention counts
};
```

**Family context (parent, and student in a reduced form)**
HOME · STUDENTS · CALENDAR · ACADEMICS · PORTFOLIO · DOCUMENTS · COMPLIANCE · MESSAGES · REPORTS · AI ASSISTANT

**Organization context (adds, for org_admin/staff)**
FAMILIES · STAFF · CLASSES · OPERATIONS · SETTINGS

**Evaluator context** — deliberately minimal
HOME · EVALUATIONS · STUDENT ACCESS · MESSAGES · MY PROFILE

**Student context** — TODAY · MY WORK · MY PORTFOLIO · MY READING · MESSAGES (guardian-enabled only)

A **context switcher** in the header (family ⇄ each org ⇄ evaluator practice) sets `active_context` in an encrypted cookie; every server read derives scope from it. A user who is both a parent and a teacher at a microschool sees two clearly separated worlds, never a merged one.

Mobile: the same items collapse to a 5-item bottom tab bar (`Home · Students · Calendar · Upload · AI`) with the remainder under "More". **Upload is a first-class tab** — the universal "Upload Anything" action (§7) is the single most important action in the product.

## 2. Route tree

```
/(marketing)                         public
  /                                  landing
  /pricing /about /legal/{terms,privacy}

/(auth)
  /login  /signup  /forgot-password  /reset-password
  /verify  /invite/[token]           accept org/guardian/evaluator invite
  /onboarding
    /parent/{welcome,student,location,program,year,subjects,import,done}
    /organization/{welcome,locations,staff,classes,families,year,compliance,done}

/(app)                               authenticated shell: sidebar + context switcher
  /home                              role-routed dashboard (parent | org | teacher | evaluator | student)
  /students
    /students/new
    /students/[studentId]            → redirects to /overview
      /overview /calendar /progress /skills /assignments /portfolio
      /documents /evaluations /attendance /notes /plan /reports /messages
      /settings                      guardians, access grants, archive
  /calendar                          ?view=day|week|month|year & filters in querystring
    /calendar/events/[eventId]
  /academics
    /academics/lessons               library + filters
    /academics/lessons/new           AI lesson planner
    /academics/lessons/[lessonId]
    /academics/planner               weekly drag-and-drop planner
    /academics/assignments
    /academics/assessments
    /academics/subjects
    /academics/skills                skill framework browser
  /portfolio                         all students, filterable
    /portfolio/new
    /portfolio/[itemId]
  /documents                         AI Document Inbox
    /documents/inbox                 needs-review queue (the default landing)
    /documents/[documentId]          viewer + AI panel + confirm/edit actions
  /compliance
    /compliance                      per-student status board
    /compliance/[studentId]
    /compliance/[studentId]/[ruleCode]        requirement detail
    /compliance/submissions/[submissionId]    generate → review → sign → send → evidence
  /messages
    /messages/[threadId]
  /reports
    /reports/new                     report builder
    /reports/[reportId]
  /assistant                         full-screen AI assistant (also available as a slide-over anywhere)
  /activity                          activity log
  /reading                           reading log
  /notifications
  /settings/{profile,notifications,security,privacy,billing}

/(app)/org/[orgSlug]                 organization context
  /dashboard                         command center + AI daily brief
  /families  /families/[familyId]
  /staff  /staff/[userId]  /staff/invite
  /classes /classes/new /classes/[classId]/{roster,schedule,attendance,lessons,messages,documents}
  /operations/{today,attendance,compliance,evaluations,alerts,tasks}
  /settings/{general,branding,locations,academic-year,compliance-pack,roles,integrations,audit}

/(app)/evaluator
  /dashboard /requests /evaluations/[evaluationId] /access /profile

/(admin)                             super admin, break-glass gated
  /organizations /users /compliance-packs /compliance-packs/[packId]/rules
  /ai/{usage,evals,suggestions} /audit /support-sessions

/api
  /api/documents/upload              signed upload ticket issuance
  /api/documents/[id]/url            short-lived signed download URL (audited)
  /api/ai/assistant                  streaming SSE
  /api/ai/lesson                     streaming
  /api/reports/[id]/pdf
  /api/webhooks/{email,scanner,signature}
  /api/cron/{compliance,digest,reminders,materialize-events}
```

## 3. URL contracts

- Student-scoped URLs always carry `[studentId]`; the layout resolves access once and provides it via React context. **Unauthorized → `notFound()` (404), never 403** (prevents ID enumeration).
- Filters live in the querystring (shareable, back-button correct): `/calendar?view=week&from=2026-09-07&studentId=…&subjectId=…`.
- Org context is path-based (`/org/[orgSlug]/…`) so an org admin's links are unambiguous; family context is cookie-based since a user has exactly one family in MVP.
- Every list route supports `?q=` and cursor pagination `?after=`.

## 4. Key screens (what STEP 4–5 must produce)

**Parent Home** (§4) — greeting; one card per child with four signals (compliance status badge, learning progress %, portfolio completion %, days-to-next-evaluation); TODAY timeline; NEEDS ATTENTION list where each row is a link to the action that clears it; AI prompt bar with the five suggested prompts; and the five primary buttons (Create Lesson, Upload Work, Upload Document, Add Activity, Ask AI).

**Org Command Center** (§5) — 6 stat tiles, NEEDS ATTENTION grouped by category with counts and drill-through, today's class schedule with live attendance %, and the **AI Daily Brief** card (generated 5:00 local, regenerable on demand, always labeled "AI-generated summary — verify before acting").

**Document Inbox** (§7) — split view: file preview left, AI analysis right with per-field confidence chips, a "Recommended location" block, and two buttons: *Confirm & file* / *Edit details*. Low confidence (<0.6) renders "I couldn't confidently identify this document" and asks the user to classify manually.

**Compliance board** (§22) — per-student rows with status pills for Notice of Intent / Annual Evaluation / Portfolio, next deadline, and a persistent footer disclaimer: *"Status reflects information stored in this system. This is not legal advice."*
