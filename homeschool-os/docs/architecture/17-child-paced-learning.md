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

**One conflict to settle in STEP 6.** `skills.framework` / `skills.framework_ref`
(from 0014, STEP 1) let a skill *be* a standard — the reversed relationship these
principles forbid — and carry a unique index. STEP 5 left them because STEP 1–4
was not being redesigned, and added `skill_standards` as the mechanism from then
on. Two homes for a standard code is one too many. Under these principles the
crosswalk wins, and STEP 6 should retire the old columns in a forward migration
rather than leave a second, contradicting answer in the schema. Nothing populates
them today: the seeded skills are all `framework = 'internal'` with
`framework_ref = null`, so the retirement is cheap now and expensive later.
