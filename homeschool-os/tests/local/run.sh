#!/usr/bin/env bash
# Drops and rebuilds a scratch database, applies the shim then every migration in order.
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${DB:-hos_test}

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB;' -c 'create database $DB;'" >/dev/null
su postgres -c "$PSQL -d $DB -f $ROOT/tests/local/00_supabase_shim.sql" >/dev/null

for f in "$ROOT"/supabase/migrations/*.sql; do
  printf '  applying %s ... ' "$(basename "$f")"
  if su postgres -c "$PSQL -d $DB -f $f" > /tmp/mig.out 2>&1; then
    echo ok
  else
    echo FAILED; cat /tmp/mig.out; exit 1
  fi
done
echo "All migrations applied to $DB."
