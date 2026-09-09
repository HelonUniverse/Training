# STEP 7 phase 4 — the revisit advisory

Migrations 0089, 0090, 0091.

## What it is, and what it structurally cannot be

`refresh_suggested` is a derived signal computed on demand. There is no column.
A stored boolean would agree with its conditions at write time and drift
afterwards, and the drifted version is the one that ends up on a screen.

It cannot become a state:

- 0083 pins `app.skill_state` to exactly four labels, so adding it to the enum
  fails the invariants;
- nothing in the refresh path writes to `student_skills`,
  `student_skill_events` or `student_skill_overrides`, and 0091 refuses any
  refresh function whose source acquires such a write;
- `secure` stays `secure` while a revisit is suggested.

## The five conditions

All must hold. No subset is sufficient.

1. **The family turned it on.** `families.refresh_advisory_enabled`, default
   `false` for every family including the ones that already existed.
2. **The state in force is human-confirmed `secure`** — an active override with
   `decided_state = 'secure'` and a named `decided_by`. An anonymous
   carried-forward legacy state does not qualify.
3. **The evidence under it is at least `supported`.**
4. **The skill is currently relevant.**
5. **The interval has elapsed since the anchor.** `refresh_interval_days`,
   default 180, configurable between 7 and 3650.

**Time is condition 5 and only condition 5.** A skill nobody enabled, nobody is
working towards, and nobody confirmed can sit untouched for a decade and
generate nothing.

## The anchor

The most recent of: the last **usable** evidence (Phase 3's definition, so an
unreviewed proposal or a retracted item cannot make a skill look recently
demonstrated) · the human confirmation of `secure` · the last dismissal · the
last completed revisit.

A dismissal moving the anchor is what makes "do not nag" structural: after
dismissing, a full interval must pass again before the question returns.

## Relevance

An enumerated type, because *relevant* is the word under which grade level walks
back in. Every member is something a person in this family did:

| | |
|---|---|
| `active_learning_goal` | a goal someone set, still active — and `learning_goals` already requires `approved_by` before a goal may be active, so this is human-approved by construction |
| `active_learning_plan_priority` | named in an active plan's `priority_skill_ids` |
| `active_course_enrollment` | a course the child is actually enrolled in |
| `prerequisite_of_current_work` | it underpins something relevant above — one level, not a recursive walk |
| `parent_requested` | she asked |

Age, grade, standards, benchmark expectations and cohort norms are absent and
may not be added. 0091 refuses the relevance function if it reads the catalogue.

## The parent asking is not Nestra suggesting

`request_skill_revisit` surfaces the advisory regardless of enablement,
relevance and interval, marked `requested_by_parent: true`. This is a deliberate
reading of an ambiguity: the eligibility rules govern what *Nestra* proposes,
and a family with the feature switched off should still be able to leave
themselves a note. It changes no state.

## Family language

23 new keys per locale under `refresh.*`. `scripts/check-family-language.mjs`
now bans `forgetting`, `declined`, `no longer secure`, `remediation`,
`regressed` and their Spanish equivalents, and — scoped to `refresh.*` keys —
`overdue` / `vencido`.

The scoping is new and needed: an invitation that is `Vencida` really has
expired, and saying so is correct. The guard grew a third element so an entry
can be narrowed to the copy where the subject is a child rather than a token.

## The defect this phase found

The first smoke run reported `refresh_suggested = true` for a brand-new family
with no profile, no evidence and the feature switched off — the exact opposite
of the required default, and the worst possible failure for this feature.

With no decision rows, `v_latest` is NULL, so `v_latest = 'revisit_requested'`
is NULL, so `if not v_asked` is NULL, so the entire block that accumulates the
blocking reasons was skipped and the advisory returned true with an empty
`blocked_by`. A missing `coalesce`. Fixed, and the first three assertions of the
test file exist to keep it fixed.
