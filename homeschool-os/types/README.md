# Generated database types

`database.generated.ts` is **generated**, never hand-edited.

## How it is produced

Normally:

```bash
npx supabase gen types typescript --project-id <ref> > types/database.generated.ts
```

The copy in this repository was generated with `scripts/gen-types.mjs`, which
drives the same `@supabase/postgres-meta` generator the Supabase CLI wraps, but
points it at a local PostgreSQL instance carrying the identical schema. That
route exists because this workspace has no Docker (which `supabase gen types`
requires) and no network egress to `supabase.co`.

The two schemas were proven byte-identical in STEP 2.6 by comparing MD5 digests
of columns, policies, functions, enums, constraints, triggers and grants — see
`docs/architecture/STEP-2.6-REPORT.md` §2. The generated table set was also
diffed against the Supabase-generated file: 150 tables on both sides, no
difference.

## Regenerating

```bash
node scripts/gen-types.mjs > types/database.generated.ts   # local schema
```

Prefer the Supabase CLI whenever an environment with Docker and egress is
available.
