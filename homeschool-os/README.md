# Homeschool OS

Teach. Document. Stay organized. AI handles the rest.

An operating system for homeschooling families, support programs, microschools, teachers,
tutors, evaluators, and education organizations. First launch market: Florida.
State-agnostic core with pluggable compliance packs.

**Current status: STEP 2 complete — database schema.** No application code yet.

- Architecture: [`docs/architecture/`](docs/architecture/README.md)
- Schema: [`supabase/`](supabase/README.md) — 37 migrations, 75 tables, 155 RLS policies
- Tests: `./tests/local/test.sh` (runs against a stock PostgreSQL 16 cluster)

Start here: [`docs/architecture/README.md`](docs/architecture/README.md)
