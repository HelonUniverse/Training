# 17 — Child-paced learning, and the place of standards

Governing product principles, effective from STEP 6. They constrain STEP 6 and
every step after it. Where they conflict with an earlier recommendation, these
win.

> **Nestra is a child-paced homeschool platform. Educational standards are
> optional reference maps.**

## What standards do not determine

Not one of these: what the child must learn next · how quickly the child must
progress · the student's instructional level · grade placement · lesson
sequence · weekly schedule · mastery · remediation · advancement · whether the
homeschool is successful.

## The hierarchy, and the direction of the arrow

```
  Student ──► Skills ──► Evidence ──► Readiness ──► Learning Path
                 │
                 └──► optional standards mappings        (reference metadata)
```

The learner model runs down the top row. Standards hang off `Skills` as
metadata and never feed back into the row above them. **Never reverse this
relationship.** A Nestra skill is part of the learner model; a standard is
external context.

## Standards are not the curriculum

The adaptive engine must never ask *"what standard should this fourth grader
complete next?"* It asks:

> **"What skill is this learner ready to work on next?"**

Only afterwards may Nestra add: *"this skill is also associated with these
external standards."*

## Grade level is context, not a box

A student may legitimately hold evidence against skills commonly referenced at
several different grade levels at once — maths around Grade 5, reading around
Grade 6, writing around Grade 3. That is a **normal condition**, and Nestra
represents it as one. From those mappings alone, Nestra must never describe a
child as behind, ahead, off-grade, noncompliant, or anomalous. Asynchronous
development across subjects and domains is supported as ordinary, not as an
exception to be flagged.

## Family-facing language

| use | never use |
|---|---|
| Standards reference | Required standard |
| Related standards | Must complete |
| Aligned references | Grade-level requirement |
| See how this skill relates to Florida B.E.S.T. | Student should already know |
| No learning evidence is currently linked to this reference | Behind standard · On track for standard · This child is behind |

The right-hand column is allowed only inside a later, explicitly separate
regulatory feature that has a verified legal reason for it — never in normal
family UX. `scripts/check-family-language.mjs` enforces the ban on the shipped
catalogs, so this is a build failure rather than a good intention.

## Family control

Parents will eventually choose standards visibility — **hidden**, **simple
reference**, or **detailed reference**. The setting changes what a parent sees
and nothing about the child's learning path. **A parent who never once looks at
a standards code must still be able to use the entire Nestra learning system.**
That is the acceptance test for the whole feature, not a nice-to-have.

## Coverage is information, never a verdict

A future report may answer: which external standards relate to skills this child
has encountered; which have related evidence; which have not yet appeared. It
must not interpret an absence as a deficiency.

- Acceptable: *"No learning evidence is currently linked to this reference."*
- Not acceptable: *"This child is behind."*

The first states a fact about our records. The second states a conclusion about
a child, from a map the family never agreed to be measured against.

## The adaptive engine boundary (STEP 7/8)

The engine may use: skill prerequisites · confirmed evidence · assessment
performance · student readiness · historical difficulty · pace · interests ·
parent goals · learning modality.

**External standards must not control the next-skill decision.** They may become
an optional parent-defined planning constraint only when a parent explicitly
chooses that mode. The default is, and stays, child-paced.

## The homeschool-first design test

Every screen, at visual review, gets two questions:

1. *"Does this screen make a homeschool parent feel the child must keep pace
   with a school grade?"* → **if yes, redesign it.**
2. *"Does this screen help a parent understand where the child's learning
   happens to relate to an external framework?"* → **if yes, that is the
   intended role of standards.**

## Where STEP 5 already stands (audited 2026-09-07)

| principle | as-built |
|---|---|
| Standards are secondary in family UX | No screen surfaces a standard at all. The crosswalk ships empty. |
| No pacing or deficiency language | Neither catalog contains *behind*, *on track*, *must complete*, *required standard*, *should already know*, *proficient*, or *mastered*. |
| Evidence is not mastery | `learning_evidence` is a separate table; STEP 5 never writes to `student_skills`. Proven on managed: **+0**. |
| Grade is metadata, not identity | `skills.grade_band` is metadata; there is one canonical *Equivalent Fractions*. |
| Nothing derives a path from standards | There is no path builder yet, and the graph walk (`skill_prerequisite_closure`) reads prerequisites only. |
| Skills → standards, not the reverse | `skill_standards` points many frameworks **at** one Nestra skill. |

**One conflict, now settled (migration 0072).** `skills.framework` /
`skills.framework_ref` (from 0014, STEP 1) let a skill *be* a standard — the
reversed relationship these principles forbid — with a unique index enforcing one
skill per (framework, code). Two failures followed: a skill whose identity is its
B.E.S.T. code cannot also be a Common Core code, so the same learning had to
exist twice; and revising a framework meant rewriting the SKILL, which moves a
child's learning history because a state changed a document.

Audited first on both databases: 26 skills, every one `framework = 'internal'`
and `framework_ref = null`; no policy, function, view or application code read
either column. So 0072 is the clean retirement, not a data migration — it drops
the index, both columns, and `app.skill_framework` (leaving the type behind
leaves the invitation behind). It still **refuses rather than destroys** if it
meets a database where that audit does not hold: a migration is run in
environments its author never saw, and dropping a column is how provenance is
lost silently.

`app.assert_schema_invariants()` now rejects `framework`, `framework_ref`,
`standard`, `standard_id`, `standard_ref`, `standard_code` or `standards_code`
reappearing on `public.skills`. `tests/rls/10_standards_crosswalk.sql` proves the
guard fires by adding the column back, calling the invariant, and removing it.

## The crosswalk, proved as one skill's life story

`tests/rls/10_standards_crosswalk.sql` — 21 assertions, and the same sequence
re-run on managed:

1. A skill is created with **no** standards mapping, and is completely usable:
   the prerequisite graph walks into it and evidence attaches to it.
2. It is mapped to two frameworks at once, at **two different grade references**
   — which the old unique index made impossible.
3. One mapping is removed.
4. A framework version is superseded: the new edition is a new framework row, the
   old mapping is **deactivated rather than deleted** so what we once claimed
   survives, and the skill is not rewritten.
5. Both frameworks are deleted outright.

After every one of those, the skill's id and canonical identity are re-checked,
and after step 5 the graph and the child's evidence are re-checked too. That last
one is the governing rule stated as a test rather than a promise: **a standard
can disappear tomorrow and the child's learning history must still make sense.**

The frameworks and codes in that file are fixtures, created and destroyed inside
it. The standards catalogue still ships empty.

**A note on how that test was wrong first.** Its initial version borrowed a
*seeded* framework to hang a fixture standard on, then proved the cascade by
deleting it. Locally the whole file runs inside a transaction that rolls back, so
nothing showed. Run against the managed project — which has no rollback — it
deleted a real seeded row. The seed was restored and the test now creates its own
throwaway frameworks. A test that cleans up only because of a rollback is a test
that destroys real data the first time somebody runs it somewhere without one.
