#!/usr/bin/env bash
# Dry-runs the STEP 2.6 acceptance scripts against the local PostgreSQL harness,
# to catch syntax errors before spending time on the managed platform.
set -uo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=hos_accept
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB;' -c 'create database $DB;'" >/dev/null
su postgres -c "$PSQL -d $DB -f $ROOT/tests/local/00_supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do su postgres -c "$PSQL -d $DB -f $f" >/dev/null || exit 1; done
echo "migrations: ok"
status=0
for f in "$ROOT"/tests/acceptance/0*.sql; do
  printf '  %s ... ' "$(basename "$f")"
  if su postgres -c "$PSQL -d $DB -f $f" >/tmp/acc.out 2>&1; then echo PASS
  else echo FAIL; grep -E "ERROR|ASSERTION" /tmp/acc.out | head -3; status=1; fi
done
exit $status
