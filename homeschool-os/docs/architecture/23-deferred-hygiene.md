# Deferred database hygiene

Standing items that are known, understood, harmless today, and deliberately not
being fixed inside a feature deployment. Recorded here so they are a decision
rather than a thing nobody noticed.

## 22 cosmetically drifted function bodies (local ↔ managed)

**Status:** deferred by decision, 2026-09-09. Do not repair inside a phase.

Every migration applied to `homeschool-os-dev` before Phase 4 crossed the
Supabase MCP channel by hand, and some had their comments trimmed on the way to
keep the payload manageable. The result is that 22 of the 121 function bodies in
`app` and `public` differ textually between the repository and managed.

**They do not differ in what they do.** `scripts/schema-digest.sql` reports two
rows for exactly this reason:

| row | meaning |
|---|---|
| `function_bodies` | the text as stored. Differs — this is the drift. |
| `canonical_function_bodies` | comments stripped, whitespace removed. **Matches: `16d6d06f4e748514773cb7f59aab4205` on both sides.** |

So the same code runs on both databases; only the reasoning written beside it is
missing on one. The functions involved are from STEP 2–6 — `app.audit`,
`app.capture_history`, `public.onboard_parent`, `public.share_document` and
similar. The two Phase 3 functions that had drifted were restored verbatim in
migration 0088 and are not part of this list.

**Why it is deferred rather than fixed.** Repairing it means re-applying 22
function definitions to managed, which is 22 opportunities to introduce a real
difference while removing a cosmetic one — inside a deployment whose subject is
something else entirely. The right time is a dedicated pass with nothing else in
flight.

**How it will be caught if it ever becomes real.** `canonical_function_bodies`
is now part of the standard digest. If that row ever differs, the drift has
stopped being cosmetic and is a defect to fix immediately.
