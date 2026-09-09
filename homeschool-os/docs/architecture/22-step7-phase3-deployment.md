# STEP 7 phase 3 — managed deployment record

Migrations 0084–0088 applied to `homeschool-os-dev` (`ucgxdtulnzumrroanais`,
PostgreSQL 17.6) on 2026-09-09.

| ledger version | name | file |
|---|---|---|
| `20260909…` | `step7_profile_recompute_schema` | `20260909020000_profile_recompute_schema.sql` |
| `20260909…` | `step7_profile_recompute_functions` | `20260909020100_profile_recompute_functions.sql` |
| `20260909…` | `step7_phase3_invariants` | `20260909020200_step7_phase3_invariants.sql` |
| `20260909…` | `step7_state_evidence_citation` | `20260909020300_state_evidence_citation.sql` |
| `20260909…` | `step7_restore_function_comments` | `20260909020400_restore_function_comments.sql` |

## Nothing that was there before moved

Same snapshot before 0084 and after 0088:

| | before | after |
|---|---|---|
| RLS policy digest (three affected tables) | `44a0ff66f0db63c6b9b7e258d4233e2e` | `44a0ff66f0db63c6b9b7e258d4233e2e` |
| `student_skills` triggers | 2 | 2 |
| append-only trigger | `O` enabled | `O` enabled |
| published Florida B.E.S.T. standards | 184 | 184 |
| skill↔standard mappings | 0 | 0 |
| prerequisites created by import | 0 | 0 |
| STEP 6 staged-row content digest | `b0c0d24c365da8ac39524aa30640d229` | `b0c0d24c365da8ac39524aa30640d229` |

## Local ↔ managed

`scripts/schema-digest.sql`, local `hos_test` (PG 16.13) vs managed (PG 17.6):

| row | n | digest |
|---|---|---|
| tables_with_rls | 175 | `67bd2f7f938b7aa06ea834de976632f9` |
| policies_public | 236 | `cd7448a7e9aa2d99960d3b7a7aa343c6` |
| policies_storage | 7 | `5e72593de13e23cf6bab72944af81f5f` |
| functions_app_public | 121 | `6e7c0bceaf32499cdf677406abb11a29` |
| canonical_function_bodies | 121 | `16d6d06f4e748514773cb7f59aab4205` |
| triggers_public | 197 | `1c9f58720c8291f50a6915c845e7e4de` |
| enum_labels | 659 | `11d43e2fe1f935625f69b3ddc0033dc7` |
| capabilities_rows | 448 | `01a1d7229283f333d39e40f7a21f6c57` |
| buckets_total / public | 6 / 0 | `c2514f3190e8460a12d7b4236c0dca57` / none |
| definer_without_search_path | 0 | none |
| view_write_grants_to_users | 0 | none |

## Behaviour, proved rather than assumed

The same 22-check probe, run as `authenticated` with `auth.uid()` set and
`is_superuser` off, every write rolled back. **Managed output is line-for-line
identical to local**, including:

| | |
|---|---|
| no evidence | `unknown` / `none`, nothing stored |
| one observation claiming `secure` | `emerging` / `preliminary`, ceiling and machine-refusal both named |
| 3 items, 3 occasions, 3 sources | `developing` / `corroborated`, as-of 2026-09-05 |
| re-run | `rewritten=false` |
| parent confirms `secure` | effective `secure`, computed `developing` preserved underneath |
| a later, lower observation | computed unchanged, conflict reported |
| release the decision | effective returns to `developing` |
| supporting evidence retracted | computed falls to `emerging` — the basis is gone |
| one restored | back to `developing` |
| retracted events | all 3 still present, set aside not deleted |
| unreviewed AI proposal alone | `unknown`, 0 usable, exclusion named |
| catalogue tables renamed away | every field identical |
| view-only guardian | decide refused, write refused, read allowed |
| another family | decide refused, read refused, 0 rows visible; own child fine |
| `computed_state = 'secure'` | refused by constraint |

## Two defects found during deployment

**The explanation cited the wrong evidence.** 0085 picked `state_evidence_ids`
and `state_as_of` from the observations at the highest asserted level, then
capped the state separately. When the cap bit, a profile computed as
`developing` cited one row that said `secure`, dated four days before the two
that actually said `developing`. Found by the managed probe, which prints the
as-of next to the state; every local assertion passed throughout, because they
checked that the date was NOT NULL rather than what it was. Fixed in 0087, with
a test that asserts the value.

**The deployed code was not textually the repository's.** The new
`function_bodies` digest — added because of this — showed 24 of 121 bodies
differing between local and managed, all inherited from earlier steps where
migrations were retyped through the MCP channel and some had comments trimmed.
`canonical_function_bodies`, which strips comments and whitespace, matches
exactly: `16d6d06f4e748514773cb7f59aab4205` on both sides. So the same code
runs on both, and 0088 restores the two Phase 3 bodies verbatim. The remaining
22 are pre-existing cosmetic drift in STEP 2–6 functions, recorded here rather
than quietly repaired inside a Phase 3 deployment.

## Local at deployment

14/14 SQL suites PASS · migration regression PASS (8 migrations over synthetic
legacy rows) · typecheck, lint and guards clean.
