# Homeschool OS

Teach. Document. Stay organized. AI handles the rest.

An operating system for homeschooling families, support programs, microschools, teachers,
tutors, evaluators, and education organizations. First launch market: Florida.
State-agnostic core with pluggable compliance packs.

**Current status: STEP 2.5 complete — schema, authorization model and hardening.** No application code yet.

- Architecture: [`docs/architecture/`](docs/architecture/README.md)
- Schema: [`supabase/`](supabase/README.md) — 49 migrations, 76 tables, 182 RLS policies
- Authorization: [`docs/architecture/13-authorization-model.md`](docs/architecture/13-authorization-model.md)
- Tests: `./tests/local/test.sh` · Performance: `./tests/perf/run.sh` (stock PostgreSQL 16)

Start here: [`docs/architecture/README.md`](docs/architecture/README.md)
