# STEP 7 phase 3 — the profile, the recompute, and the parent who outranks it

Migrations 0084, 0085, 0086. Local only; not deployed to managed pending one
decision (see the last section).

## What a profile row now holds

| | |
|---|---|
| `computed_state` | what the deterministic rules derive from evidence. Never `secure`. |
| `override_state` | what an authorized human decided, if anyone has. |
| `skill_state` | **the state in force** — the human's if there is one, else the computed one. |
| `evidence_sufficiency` | `none · preliminary · supported · corroborated` — how much we have. |
| `state_reasons` | reason codes. The source of truth for "why do you think that?". |
| `state_evidence_ids` | the evidence that produced it, resolvable. |
| `sufficiency_inputs` | the counts the sufficiency tier came from. |
| `state_as_of` | the date of the evidence that governs. A state with no date is a claim about forever. |
| `recompute_rule_version` | which rules produced it. |

A check constraint makes the third follow from the second: with a decision
active, the effective state *is* that decision. A recompute cannot overwrite a
parent's judgement without violating a constraint to do it.

## Usable evidence

An event counts unless one of these is true:

- its provenance is `ai_proposed_unreviewed` — a machine proposed it;
- a human has retracted it (`student_skill_evidence_exclusions`, append-only
  alongside the event, which is never mutated);
- it came from a proposal nobody has accepted, or that somebody rejected.

Each exclusion has its own reason code, so "why was that ignored?" is a query.

## Sufficiency

Highest tier whose conditions all hold:

| tier | conditions |
|---|---|
| `corroborated` | ≥3 items, ≥2 distinct occasions, ≥2 distinct sources, ≥1 entered or confirmed by a person |
| `supported` | ≥2 items on ≥2 distinct occasions |
| `preliminary` | ≥1 item |
| `none` | nothing usable |

Distinct **sources**, never source **authority**. A parent and a portfolio
artifact are two sources; a teacher is not worth more than a mother. Standards
mappings are not a factor and are not readable from this path at all. Elapsed
time is not a factor in any direction.

## State

Only usable events that assert a state count. The computed state is the
**highest** state any of them supports, then cut back by a ceiling:

    none → unknown    preliminary → emerging    supported, corroborated → developing

`secure` is not reachable from here by any route, and the column is constrained
against it. A machine that could compute `secure` would then have to write a
person's name into `human_confirmed_by` to satisfy 0082 — inventing a
confirmation nobody gave.

Sufficiency and state are independent, in both directions: a skill can be
`corroborated` and `developing`, or `supported` and human-confirmed `secure`.

## Parent decisions

A decision is a row in `student_skill_overrides`, not an edit to a field. It
keeps what Nestra believed at the moment it was made — the computed state, the
sufficiency, the evidence ids — because "she confirmed secure when Nestra had
one worksheet" and "when Nestra had thirty" are different acts. It is frozen
after the fact by a trigger, released rather than deleted, and supersedes rather
than overwrites.

It deliberately does **not** write an evidence event. That was tempting and
would have been a feedback loop: her judgement would become evidence, raising
sufficiency, raising the ceiling, changing the computed state she was
disagreeing with.

`explain_student_skill` returns both characterizations, so a screen can say
*"Nestra's evidence-based characterization is developing"* and *"Parent has
confirmed secure"* without either one erasing the other. Nothing labels the
parent's decision as a correction or an error.

## Legacy rows

A pre-Phase-3 row holds a state a person typed, with no events under it. The
first recompute would have found nothing, computed `unknown`, and erased it. So
0084 carries every non-`unknown` state forward as an active human decision,
attributed where the row names anyone and marked `carried_forward` and anonymous
where it does not — losing the name is better than inventing one, and losing the
state is worse than either. A constraint stops anonymity spreading: a decision
made through the RPC always names its actor.

Both environments hold zero rows today. The regression suite is where this is
actually exercised.

## Security

Everything is `SECURITY INVOKER`; no new definer function was added. Recompute
and decisions require `skill:update` for that child; explanation requires
`skill:read`. The new tables carry the same family scoping as the rows they
describe, resolved through the same capability functions, so "who may see a
skill" and "who may see a decision about it" cannot drift apart.

Recompute writing under invoker rights is safe for determinism for a specific
reason: the SELECT policy on `student_skill_events` scopes by **student**, not
by row, so two authorized callers necessarily compute over the same evidence.

## The decision that is not mine to make

**Automatic recompute never walks a child backwards.** If a child has three
observations at `developing` and then one wobbly afternoon recorded at
`emerging`, the computed state stays `developing` and the disagreement is
reported as `conflicting_assertions_present`. A state comes down only when a
human does it — by deciding, or by retracting the evidence underneath it.

The first version took the most recent occasion instead. The smoke test showed
what that means: Nestra announcing a regression on the strength of one
afternoon. That is the thing this product exists not to do, so the rule changed.

But the brief says two things that pull apart here — *conflicting evidence must
not become a negative judgment*, and *prefer the conservative state*. This
resolves that tension in the direction of never making a negative claim, at the
cost of Nestra sometimes lagging behind a genuinely harder week. That is a
product decision about what a family sees, and it is recorded here rather than
buried in a function.
