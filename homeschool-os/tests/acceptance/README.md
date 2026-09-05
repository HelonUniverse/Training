# STEP 2.6 — Real Supabase acceptance

These scripts run against a **managed Supabase project**, not the local
PostgreSQL harness in `tests/local/`. They exist to prove the schema and the
authorization model behave identically on the real platform.

Differences from `tests/rls/`:

- No psql meta-commands (`\set`, `\if`) — everything runs through
  `execute_sql`, so each file is plain SQL with `DO` blocks that raise on failure.
- Auth users are **real `auth.users` rows** with bcrypt passwords, so they can
  actually sign in through GoTrue and receive a real JWT.
- The session is impersonated the way PostgREST does it: `set local role
  authenticated` plus `set local request.jwt.claims` as JSON, so `auth.uid()`
  resolves through Supabase's own function rather than the local shim.

| File | Purpose |
|---|---|
| `01_platform_checks.sql` | Extensions, roles, privileges, definer functions, partition security, event trigger |
| `02_fixtures.sql` | Real auth users + the eight-role fixture graph |
| `03_rls_smoke.sql` | The representative STEP 2.5 authorization cases |
| `04_storage_policies.sql` | Storage policy evaluation via `storage.objects` |
| `05_performance.sql` | Representative query timings on managed hardware |
| `storage_api_test.sh` | End-to-end Storage HTTP test with real user JWTs |
