# 07 — Compliance Rule Engine

## 1. Principle

**No legal conclusion is ever expressed in application code.** The engine is a deterministic evaluator over declarative rule rows. The product reports *state of documentation in this system*, never legal compliance.

Enforced mechanically:
- ESLint `no-restricted-syntax` bans state names, statute citations, and hard-coded deadlines outside `lib/compliance/packs/**` and the seed SQL.
- Every user-facing compliance surface must render `<ComplianceDisclaimer>`; a test snapshot asserts its presence on each compliance route.
- Copy is drawn from a fixed vocabulary: "Documentation appears current based on information in the system." / "This item appears incomplete." / "We could not determine this — please verify." Never "you are compliant."

## 2. Rule shape

```ts
type ComplianceRule = {
  id: string; packId: string; code: string;             // 'FL.NOI', 'FL.ANNUAL_EVAL'
  stateCode: string; county: string | null;             // county overrides state
  category: 'registration' | 'evaluation' | 'portfolio' | 'termination' | 'records' | 'other';
  title: string; requirementText: string;               // plain-language, quoted from the source
  obligationLevel: 'required' | 'recommended' | 'optional' | 'unknown';

  appliesTo: {                                          // predicate over student facts
    ageMin?: number; ageMax?: number;
    gradeLevels?: string[];
    programTypes?: ('independent' | 'organization')[];
    startedAfter?: string;
  };

  trigger: {                                            // when the obligation comes into existence
    type: 'homeschool_start' | 'academic_year_start' | 'enrollment' | 'prior_rule_satisfied'
        | 'anniversary' | 'termination' | 'manual';
    ruleCode?: string;                                  // for prior_rule_satisfied
    offset?: Duration;                                  // e.g. { days: 30 }
  };

  dueDateLogic: {                                       // pure date math, no side effects
    base: 'trigger_date' | 'academic_year_end' | 'anniversary_of' | 'fixed_date';
    anniversaryOf?: 'homeschool_start' | 'noi_submitted' | 'last_evaluation';
    offset?: Duration;                                  // { years: 1 } etc.
    windowOpensOffset?: Duration;                       // when the user may start acting
    graceOffset?: Duration;
    recurrence?: 'once' | 'annual';
  };

  requiredFields: FieldSpec[];                          // drives the generated form
  documentTemplateId?: string;
  submissionMethod: 'email' | 'mail' | 'portal' | 'in_person' | 'none';
  submissionDestination: { type: 'district_contact' | 'fixed'; …snapshot at send time };
  satisfiedBy: SatisfactionSpec[];                      // what counts as done
  reminderSchedule: Duration[];                         // [{days:90},{days:30},{days:7},{days:0}]
  retention?: { years: number; note: string };

  authoritativeSourceUrl: string;                       // required, non-empty
  authorityCitation: string;
  lastVerifiedOn: string;                               // date; drives staleness warnings
  verifiedBy: string;                                   // human who checked the source
  active: boolean;
  adminNotes: string;
};
```

`SatisfactionSpec` examples: `{ kind: 'document_submission', ruleCode: 'FL.NOI', status: 'sent' }`, `{ kind: 'evaluation', status: 'accepted_by_parent', withinYears: 1 }`, `{ kind: 'portfolio_activity', minItems: 1, withinDays: 30 }`.

## 3. Evaluator

```ts
// pure — no I/O, fully unit-tested, also used for "what-if" previews
evaluateCompliance(facts: StudentFacts, rules: ComplianceRule[], today: LocalDate)
  : { requirements: ComputedRequirement[]; rollup: ComplianceRollup }
```
`ComputedRequirement` carries `computedInputs` — the exact facts and offsets used — so any due date shown in the UI can be explained ("Due Aug 22, 2027 because your Notice of Intent was filed Aug 22, 2026 and this rule recurs annually"). This is the difference between a trustworthy compliance product and a black box.

Rollup states: `current | needs_attention | incomplete | overdue | unknown`. **`unknown` is a first-class state** — missing input data produces `unknown`, never an optimistic `current`.

Ordering: county rules override state rules of the same `code`. Rule versioning is by pack; changing a live rule requires a new pack version, and existing `compliance_requirements` record which pack version computed them (so a rule change never silently rewrites history).

## 4. Florida pack (initial scope)

Workflows shipped: **Notice of Intent · Annual Evaluation · Portfolio reminders · Portfolio retention · Notice of Termination · District contact directory.**

Every Florida rule row ships with `authoritative_source_url`, `authority_citation`, `last_verified_on`, and `verified_by`. **A rule with `last_verified_on` older than 12 months renders a "needs verification" banner in the admin UI and downgrades its obligation display to `unknown`.** Seeded packs start `status='draft'`; a human must verify each rule against the primary source and publish before it is `active` — the code ships the mechanism, a person ships the legal content.

District contacts for all 67 Florida counties live in `district_contacts` with their own `source_url` / `last_verified_on`, surfaced to the user at the confirm-destination gate of W6.

## 5. Adding a state (§40)

1. Insert a `compliance_packs` row.
2. Author rule rows (data only) + form templates in `lib/compliance/packs/<state>/templates/`.
3. Seed district/county contacts.
4. Verify each rule against its authoritative source, set `last_verified_on`/`verified_by`, publish the pack.

No application code changes. This is the acceptance test for the engine: if adding Georgia requires touching a component, the engine is wrong.
