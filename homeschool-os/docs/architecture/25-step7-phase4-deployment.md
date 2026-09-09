# STEP 7 phase 4 — managed deployment record

Migrations 0089, 0090, 0091 applied to `homeschool-os-dev`
(`ucgxdtulnzumrroanais`, PostgreSQL 17.6) on 2026-09-09.

## Nothing that was there before moved

| | before | after |
|---|---|---|
| RLS policy digest (profile tables) | `44a0ff66f0db63c6b9b7e258d4233e2e` | `44a0ff66f0db63c6b9b7e258d4233e2e` |
| published Florida B.E.S.T. standards | 184 | 184 |
| skill↔standard mappings | 0 | 0 |
| STEP 6 staged-row content digest | `b0c0d24c365da8ac39524aa30640d229` | `b0c0d24c365da8ac39524aa30640d229` |
| families with advisories enabled | — | **0** |
| interval on every family | — | 180 |

## Local ↔ managed

| row | n | digest |
|---|---|---|
| tables_with_rls | 176 | `29099a7661f4d5369de6b1ecb53a1f47` |
| policies_public | 238 | `1b2e87f12ae03da9203b6e4d7558b11b` |
| policies_storage | 7 | `5e72593de13e23cf6bab72944af81f5f` |
| functions_app_public | 129 | `33a8e82084dcd22ab0926387ec8d48a1` |
| canonical_function_bodies | 129 | `ca09a79bf52762bc3f1f6503169ab84a` |
| triggers_public | 198 | `ef72b14b8eda168c95aaa6d5ebd28924` |
| enum_labels | 674 | `6a014d6279af325e6307626987db0ac7` |
| capabilities_rows | 448 | `01a1d7229283f333d39e40f7a21f6c57` |
| definer_without_search_path | 0 | none |
| view_write_grants_to_users | 0 | none |

`function_bodies` (the raw row) still differs, and that difference is the 22
pre-existing bodies recorded in `23-deferred-hygiene.md` — **not** Phase 4. All
nine Phase 4 function bodies were checked individually and are byte-identical
between local and managed, because this deployment sent the migration files
verbatim rather than trimming their comments.

## Behaviour, identical on both

A 19-check probe run as three different real accounts under RLS, every write
rolled back. **Line-for-line identical** on PG 16.13 and 17.6:

| | |
|---|---|
| brand-new family | nothing suggested; blocked by *family has not enabled it*, *no relevance*, *interval*, *no profile* |
| ~300-day-old evidence, not secure | nothing — blocked by *not human-confirmed secure* |
| secure but feature off | nothing |
| enabled, secure, elapsed, no relevance | nothing — *no current relevance* |
| all five conditions | **suggested**, because `active_learning_goal`, 300 days |
| the state while suggesting | effective `secure`, computed `developing`, corroborated |
| standards: present / mapped / unmapped / catalogue renamed away | **all four arms identical** |
| dismissed | quiet, *recently dismissed* |
| asked again immediately | still quiet |
| profile row after every call | byte-identical |
| parent requests a revisit | surfaced, `requested_by_parent`, state still `secure` |
| another family | cannot dismiss, cannot read, cannot even see the other family's setting |
| view-only guardian | may read, may not dismiss |
| `app.skill_state` | `unknown,emerging,developing,secure` |
| refresh columns on the profile row | 0 |

## Local at deployment

15/15 SQL suites PASS · migration regression PASS · typecheck, lint and guards
clean · 738 i18n keys in both locales.
