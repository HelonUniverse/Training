#!/usr/bin/env bash
# Rebuilds the database, loads the RLS fixtures (for the t.* helpers), loads the
# scale fixture, then runs the authorization EXPLAIN suite.
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${DB:-hos_perf}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB;' -c 'create database $DB;'" >/dev/null
su postgres -c "$PSQL -d $DB -f $ROOT/tests/local/00_supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  su postgres -c "$PSQL -d $DB -f $f" >/dev/null
done
su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/00_fixtures.sql" >/dev/null
echo "schema + fixtures loaded"
su postgres -c "$PSQL -d $DB -f $ROOT/tests/perf/01_scale_seed.sql" 2>&1 | grep -E "scale seed|students" | head -3
su postgres -c "$PSQL -d $DB -f $ROOT/tests/perf/02_explain.sql"
