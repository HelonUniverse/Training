#!/usr/bin/env bash
# Rebuilds the scratch database, applies all migrations, loads fixtures, runs tests.
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${DB:-hos_test}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

"$ROOT/tests/local/run.sh" >/dev/null
echo "migrations: ok"

su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/00_fixtures.sql" >/dev/null
echo "fixtures:   ok"

status=0
for f in "$ROOT"/tests/rls/[0-9][1-9]_*.sql; do
  printf '  %s ... ' "$(basename "$f")"
  if su postgres -c "$PSQL -d $DB -f $f" > /tmp/test.out 2>&1; then
    echo PASS
  else
    echo FAIL; sed -n '1,40p' /tmp/test.out; status=1
  fi
done
exit $status
