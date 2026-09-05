# Database

PostgreSQL 16 (Supabase). Migrations are plain SQL, applied in filename order.

49 migrations · 76 tables · 182 RLS policies · 409 capability rows.
The authorization model is documented in `docs/architecture/13-authorization-model.md`.

```
supabase/
├── migrations/          37 migrations, timestamp-ordered
├── seed/system/         (reserved) additional production-safe reference data
└── seed/dev/            development fixtures, guarded - see seed/dev/README.md
```

System reference data (locales, the global subject catalogue, the starter skill
taxonomy, the Florida pack scaffold) ships **as a migration**, not as a seed
script, because it is referenced by foreign keys and must exist in every
environment. Development fixtures are separate and refuse to run without
`-v allow_dev_seed=on`.

## Apply

```bash
supabase db reset            # local stack: applies every migration in order
supabase db push             # remote project
```

## Test

The test suite runs against a stock PostgreSQL 16 cluster — no Supabase
required, because `tests/local/00_supabase_shim.sql` provides the small surface
the migrations touch (`auth.users`, `auth.uid()`, the storage tables, and the
`anon`/`authenticated`/`service_role` roles).

```bash
./tests/local/run.sh     # rebuild the scratch DB and apply every migration
./tests/local/test.sh    # the above, plus fixtures and the RLS/invariant suite
```

`tests/rls/` is the highest-value test asset in this repository:

| File | Covers |
|---|---|
| `00_fixtures.sql` | Two families, one organization, teacher/staff/admin/evaluator/student/stranger |
| `01_access_matrix.sql` | Read scope for every role, revocation, membership end |
| `02_invariants.sql` | The 15 database-enforced product rules |
| `03_write_policies.sql` | Write and denial paths, audit visibility |
| `04_resource_authorization.sql` | Resource/action capabilities per relationship |
| `05_evaluator_and_documents.sql` | Grant section scoping and document visibility |
| `06_privilege_escalation.sql` | Escalation attempts, partitions, org exit, export boundary |
| `07_schema_invariants.sql` | Deploy invariants re-asserted as a test |

`tests/perf/run.sh` loads a 10,000-student fixture and runs the authorization
EXPLAIN suite. Any authorization helper appearing per-row in a policy on a large
table is a production outage - see `docs/architecture/13-authorization-model.md` §6.

## Conventions

- `NNNN`-style timestamp prefix, one concern per migration, never edited once deployed.
- UUID primary keys; `created_at`/`updated_at`/`created_by`/`updated_by` on mutable tables.
- Legal and calendar dates are `date`; instants are `timestamptz`.
- Soft delete (`deleted_at`) — educational records are never hard-deleted by user action.
- Every table has RLS enabled; every partition is locked separately.
- Helper functions live in schema `app`, are `SECURITY DEFINER`, `STABLE`, and pin `search_path = ''`.
- Migration `0036` fails the deploy if any of those conventions is violated.
