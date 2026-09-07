# 18 — The standards reference layer

STEP 6, Phase A. The governing rule is `17-child-paced-learning.md`, and the
acceptance criterion for everything below is an absence:

> **A parent who never once looks at a standards code must be able to use the
> entire Nestra learning system.**

## The pipeline, and the thing it exists to prevent

```
  Source Artifact ─► Parse ─► Normalize ─► Validate ─► Stage ─► Human ─► Publish
```

and never

```
  Source Artifact ─► AI ─► Canonical Standards
```

Parsed is not verified. Verified is not relevant to a child. Published is not
required learning. Each is a different claim, so each has its own state rather
than one `imported` boolean.

The importer has no path to `public.standards` at all. It writes to
`standards_staged_records` and stops; `publish_standards_batch()` is the only
door, it moves only rows a person marked `approved`, and it refuses a
`synthetic_test` source outright.

## Three things kept apart

| | is | identified by |
|---|---|---|
| **source** | an artifact somebody handed us | the sha256 of its bytes |
| **version** | an edition of a framework | (framework, label, subject) |
| **batch** | one run of one adapter over one source | (source, adapter, adapter version) |

A benchmark code is **not** a global identity. `standards` is unique on
`(framework_version_id, code)`, so the same code in two editions is two records
and a mapping made under the old one still means what it meant.

## Source representation vs our metadata

A staged row keeps what the document said — code, wording, grade, strand, in its
own language — in columns a trigger refuses to let anyone edit. Normalization
lives beside it and a reviewer may correct it freely. Rewriting official wording
and still calling it official is the failure this separation prevents.

## Unknown is valid. Fabricated is failure.

`unresolved`, `ambiguous`, `parse_error`, `source_conflict` and `duplicate` are
outcomes, reported as counts and never folded into a success percentage. The
Florida adapter contains **no Florida benchmark** — a test greps for one — and:

- a missing code is unresolved, never inferred from neighbouring rows;
- truncated wording is flagged, never completed;
- a grade derived from the code layout must **agree** with what the artifact
  states, or the row is `source_conflict`; where the artifact states none, the
  derivation is a candidate a person confirms.

## Florida is an adapter, not the schema

There is no `florida_code`, no `best_strand`. The generic table is
`standards_domains`, called *domain* precisely because *strand* is Florida's
word. Two adapters exist because two are justified: the one STEP 6 targets, and
the synthetic one that proves the pipeline without an authoritative artifact.

## Who may publish

`app.is_standards_admin()` — one explicit, expiring, audited grant in
`user_permissions` at the new `platform` scope. No role implies it: not
org_admin, not teacher, not evaluator, not guardian. Deliberately **not** wired
to `is_super_admin` or break-glass support, which exists to help a family in
trouble, not to edit what every family reads.

## Provenance is authority, not confidence

`official_source` · `nestra_reviewed` · `imported` · `teacher_suggested` ·
`parent_reference` · `provider_claimed` · `ai_suggested` are seven different
claims. `provider_claimed` is never silently upgraded. A mapping is `proposed`
until a person approves it, RLS shows families only `approved`, and 0.99
confidence approves nothing — a trigger requires an approver and a time, and for
an AI-proposed mapping requires that approver to be the caller.

Deterministic strategies run first — exact code, existing approval, canonical
alias, subject narrowing — and only what survives all four is a candidate for
semantic help. A model call costs money and produces weaker provenance than
string equality.

## The progression boundary

A framework's progression document says how ITS benchmarks build on each other.
That is a claim about the framework. `app.prerequisites_are_not_imported()`
refuses any `skill_prerequisites` row whose source is `import` or
`ai_suggestion`: a reviewer may read a progression while designing skill
relationships, and an import may not write one.

## The family side

`families.standards_visibility` — hidden, simple, detailed. It changes what is
displayed and nothing else. `getSkillStandards()` returns `[]` for `hidden`
**without querying**: the cheapest way to be sure a preference is honoured
everywhere is to honour it before the lookup.

Skill detail puts evidence first and the reference last, headed "Related
standards". `check-family-language.mjs` keeps deficit and pacing language out of
both catalogs, and `step6-family.spec.ts` re-checks the rendered page at 390,
768 and 1440.

## Testing

- `tests/rls/11_standards_reference.sql` — 40 database proofs as real users.
- `tests/e2e/step6-standards.spec.ts` — 26 parser, validation, diff and mapping
  proofs over the synthetic golden fixture.
- `tests/e2e/step6-family.spec.ts` — 6 family journeys × 3 viewports.
- Managed: 33 properties, with namespaced self-owned fixtures and a destructive
  guard that refuses any target outside the test namespace.

## Phase B has not happened

No authoritative Florida artifact has been supplied, and none is reachable from
this environment. No real benchmark exists in this repository or either
database. **WAITING FOR AUTHORITATIVE SOURCE ARTIFACT.**

## The source-of-truth decision, enforced

The first ingestion uses **Florida's B.E.S.T. Standards for Mathematics** as
published by the Florida Department of Education. Not a parent guide, an
instructional guide, a progression document, an assessment blueprint, an
instructional-materials correlation spreadsheet, or a third-party export.

Those documents are welcome as **secondary references** with their own
provenance — several are genuinely useful, and several are far easier to parse.
That last part is the whole problem, and why this is a mechanism rather than a
note. The temptation runs one way: a correlation spreadsheet has one benchmark
per clean row, the published standards are a long PDF, and whoever is under time
pressure reaches for the spreadsheet. The rows that result are a vendor's
transcription of a state document, shown to families as the state's words.

So `standards_sources.artifact_kind` records **what** a document is, separately
from `authority`, which records **who** published it — a department of education
publishes all of the above. `publish_standards_batch()` refuses anything that is
not `canonical_standards_publication`, and `classifyArtifact()` reads the
document's own title, subject and opening pages rather than its filename, biased
towards refusing: a document that merely *mentions* the standards is registered
as a secondary reference, and one that does not say what it is never becomes the
standards by default.

## Reading the authoritative PDF

`src/server/standards/pdf.ts` extracts a text layer with a page and line locator
for every line, so each staged benchmark can say `p41:12` — which is what turns
a spot check into a ten-second job and a disagreement into something resolvable.
Metadata comes from the document itself.

**A PDF with no text layer is refused, not OCR'd.** OCR of a standards document
produces codes that differ from the published ones by characters nobody notices
(`MA.4.FR.1.1` against `MA.4.FR.l.1`), and there is no OCR path here on purpose.

`florida-best-pdf.ts` segments benchmarks from the code that starts a line to
the next one. Before it does, `assessLayout()` measures that assumption against
the actual lines: no codes at all, or codes appearing mid-sentence, produce a
**structural refusal with diagnostics** rather than rows. A flowed or
two-column layout would pair statements with the wrong codes, and rows that look
right and are wrong are the failure this whole pipeline exists to prevent.

The grade a code implies is a **candidate**: the PDF states grade by section
heading rather than per benchmark, so every derived grade lands `unresolved` for
a person to confirm. Missing statements stay missing, truncated wording stays
truncated, malformed codes are `parse_error`, and none of it is repaired.

**Neither adapter contains a Florida benchmark.** A test greps all three files
for one and asserts zero.

## Phase B status

**WAITING FOR AUTHORITATIVE SOURCE ARTIFACT.** No FLDOE publication has been
supplied and none is reachable from this environment. Nothing above has parsed a
real one; the layout assumption in `florida-best-pdf.ts` is stated, measured and
refusable precisely because it has not yet met the document it describes.
