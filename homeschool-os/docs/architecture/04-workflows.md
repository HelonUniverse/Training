# 04 — Primary Workflows

Each workflow below is a state machine with explicit human-confirmation gates. Gates marked 🔒 cannot be performed by AI or automation under any circumstance.

## W1 — Parent onboarding (§36)
```
signup → verify email → create family (name, state, county, timezone)
       → add student(s) (legal name, preferred name, DOB, grade level, homeschool start date)
       → independent vs. organization  ├─ independent → skip
                                       └─ org code / invite → organization_memberships(pending)
       → academic year (defaults from compliance pack: FL = Aug 1–Jul 31)
       → select subjects (seeded list, multi-select)
       → optional: upload existing records → documents queued for AI analysis
       → compliance pack activated → first evaluation of rules → dashboard
```
Time budget: **under 4 minutes** to a populated dashboard. Everything except name/state/DOB is skippable and resumable (`profiles.onboarding_state`).

## W2 — Universal upload → AI classification → filing (§7, §8)
```
1. Client requests signed upload ticket (validates mime + size ≤ 50MB, per-user rate limit)
2. Upload → bucket `uploads-quarantine`, documents.status='scanning'
3. MalwareScanProvider → clean ? move to `documents` bucket : quarantine + notify
4. Enqueue job `analyze_document`
5. Worker: text layer? extract : OCR → vision pass for images/handwriting
6. DocumentAnalysisProvider returns structured JSON + per-field confidence
7. Write document_ai_analysis (never touches the file) + ai_suggestions rows
8. Notify uploader → Document Inbox
9. 🔒 Human reviews: confirm / edit / reject
10. On confirm: apply suggestions in ONE transaction
      - documents.category/student_id/document_date set
      - optional portfolio_item, activity_log, assessment + assessment_results
      - optional student_skill_events (never mastery)
      - optional compliance requirement linkage
      - audit_logs rows, ai_suggestions.status='accepted'
```
Confidence policy: `≥0.85` → pre-filled, single confirm click. `0.6–0.85` → pre-filled with visible "please verify" chips. `<0.6` → nothing pre-filled; message is *"I couldn't confidently identify this document."* Official documents (evaluation, NOI, credential) always require confirmation regardless of confidence.

## W3 — AI lesson generation (§12)
```
inputs (student/group, subject, topic, skill, duration, level, materials, style, considerations)
→ AIProvider.generateLesson (structured output, schema-validated, streamed to UI)
→ preview (status='draft', source='ai_generated')
→ 🔒 user saves/edits → lessons row (source flips to 'ai_edited' on any edit)
→ actions: assign to students · add to calendar (creates calendar_event + lesson link)
          · duplicate · export PDF · generate worksheet · generate assessment
→ on completion: auto-create activity_log (dedupe_key='lesson:<id>') + suggest portfolio evidence
```

## W4 — Weekly planner (§13)
Drag-and-drop across Mon–Sun grid. A drag writes `lessons.scheduled_for` + upserts a `calendar_events` row in one server action with optimistic UI and rollback. Copy-week and template-week actions exist because homeschool schedules repeat. Filters: student, teacher, class, subject, org, location.

## W5 — Compliance evaluation loop (§21, §22)
```
Triggers: nightly cron · student created/updated · academic year rollover
          · document filed · submission confirmed · pack version change
→ load active rules for (state, county, student profile)
→ evaluate each: applies? → due date via due_date_logic → satisfied by existing records?
→ upsert compliance_requirements + recompute student_compliance_records
→ create notifications at T-90 / T-30 / T-7 / T-0 / overdue (per-rule reminder schedule)
```
The evaluator is a **pure function** `evaluate(studentFacts, rules, today) → requirements[]` with no I/O, so it is exhaustively unit-testable and reusable for "what-if" previews.

## W6 — Official document submission (§23) 🔒
```
draft (generate from template + student data)
 → review (side-by-side: form fields ⇄ rendered PDF)
 → edit (any field, tracked)
 → 🔒 sign (typed/drawn signature → signatures row with hash, IP, UA)
 → 🔒 confirm destination (district contact shown with source URL and last-verified date;
       user must actively confirm the address — never pre-submitted)
 → send  ├ email via EmailProvider (idempotency_key prevents double-send)
         ├ download PDF
         ├ print
         └ mark submitted manually (+ upload proof)
 → save copy to documents (is_official=true, retention_until per pack)
 → save transmission evidence (provider message id, SMTP response, timestamp, recipients)
 → await confirmation → user uploads district acknowledgement → status='acknowledged'
```
There is **no code path** that sends an official filing without an explicit user action in the same session. The send endpoint requires a fresh signature id created <15 minutes prior.

## W7 — Evaluation workflow (§24)
```
parent requests evaluation (picks evaluator or enters an outside evaluator's email)
 → 🔒 parent creates student_access_grant (sections + expiry, default 90 days)
 → evaluator accepts → schedules → reviews portfolio/progress (every view audited)
 → evaluator completes: date, method, notes, outcome, signature, credentials upload
 → PDF generated → status='parent_review'
 → 🔒 parent reviews and accepts (or requests changes)
 → 🔒 parent decides whether to submit to the district (feeds W6)
 → access grant auto-expires; parent can revoke instantly at any point
```
The evaluator never gains access to another student, and never to compliance submission actions.

## W8 — Skill map updates (§17)
Sources: assessment result · assignment grade · portfolio evidence · teacher observation · manual rating · AI analysis. Each writes a `student_skill_events` row; a trigger recomputes `student_skills.score` (weighted recency: last 5 events, recency-weighted, capped movement per event to prevent one bad quiz from tanking a skill). Mastery transition to `mastered` 🔒 requires a human with `teacher_observed` or `assessment_confirmed` confidence — enforced by a DB constraint, not just UI.

## W9 — Progress engine & weekly report (§19, §20)
Nightly per-student computation over `student_skill_events`, `activity_logs`, `attendance`, `assignment_submissions`: improvement, plateau, gap, missing work, engagement drop. Emits `insights` (typed, templated, deterministic) — AI is used only to *narrate* precomputed signals, never to invent them. Weekly report is drafted Sunday 18:00 local, sits in `reports` as `ready`, and 🔒 the parent/teacher edits before sharing. Language guard: a lint list of prohibited clinical terms (diagnosis names, disability labels) blocks generation and is asserted in tests.

## W10 — Org daily brief (§5)
05:00 local: aggregate today's classes, attendance gaps, compliance items due ≤30 days, students with no portfolio evidence in 14 days, incomplete lesson plans, unassigned evaluations → deterministic counts → AI narration over those counts only → `reports(kind='org_daily_brief')`. Every number in the brief links to the filtered list that produced it.

## W11 — Invite & access grant lifecycle
Invites are single-use hashed tokens with expiry. Accepting an invite for a role the inviter cannot grant fails closed. Revocation (`student_guardians.revoked_at`, `student_access_grants.status='revoked'`, `organization_memberships.status='ended'`) takes effect on the next request — access is resolved per query, never cached in the JWT.
