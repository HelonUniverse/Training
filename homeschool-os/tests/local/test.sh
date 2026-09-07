#!/usr/bin/env bash
# Rebuilds the scratch database, applies all migrations, loads fixtures, runs tests.
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${DB:-hos_test}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

"$ROOT/tests/local/run.sh" >/dev/null
echo "migrations: ok"

for f in "$ROOT"/tests/rls/00*_fixtures.sql; do
  su postgres -c "$PSQL -d $DB -f $f" >/dev/null
done
echo "fixtures:   ok"

status=0
# Everything that is not a fixture. The old glob was [0-9][1-9]_*.sql, which
# quietly skipped 10_ onwards - a test file that is never run is worse than one
# that fails, because it reads as passing.
for f in "$ROOT"/tests/rls/[0-9][0-9]*_*.sql; do
  case "$(basename "$f")" in 00*) continue ;; esac
  printf '  %s ... ' "$(basename "$f")"
  if su postgres -c "$PSQL -d $DB -f $f" > /tmp/test.out 2>&1; then
    echo PASS
  else
    echo FAIL; sed -n '1,40p' /tmp/test.out; status=1
  fi
done
exit $status
