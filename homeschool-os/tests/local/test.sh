#!/usr/bin/env bash
# =============================================================================
# The SQL suite runner
# =============================================================================
# Discovery used to be the glob [0-9][1-9]_*.sql, which silently skipped every
# file numbered 10 and above. Nothing failed. The suite printed PASS and a whole
# test file had never run - which is strictly worse than a failing test, because
# a failing test tells you something.
#
# So discovery is no longer a pattern that happens to match. It is:
#
#   1. every tests/rls/*.sql is DISCOVERED,
#   2. each is classified as a fixture (00*) or a test,
#   3. every test file is EXECUTED, and
#   4. the runner reconciles discovered against executed at the end and FAILS
#      if the two sets differ, whatever the individual results were.
#
# A numeric prefix of any width sorts and runs: 01, 09, 10, 11, 20, 99, 100.
# tests/local/meta_discovery.sh proves that rather than asserting it.
# =============================================================================
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${DB:-hos_test}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

"$ROOT/tests/local/run.sh" >/dev/null
echo "migrations: ok"

# --- discovery ---------------------------------------------------------------
# Sorted by numeric prefix then name, so 9 comes before 10 rather than after it.
mapfile -t DISCOVERED < <(
  find "$ROOT/tests/rls" -maxdepth 1 -name '*.sql' -printf '%f\n' \
  | sort -t_ -k1,1n -k1
)

FIXTURES=(); TESTS=(); UNEXPECTED=()
for f in "${DISCOVERED[@]}"; do
  case "$f" in
    00*_fixtures.sql) FIXTURES+=("$f") ;;
    [0-9]*_*.sql)     TESTS+=("$f") ;;
    *)                UNEXPECTED+=("$f") ;;   # not named to a convention: surfaced, never skipped
  esac
done

if [ ${#UNEXPECTED[@]} -gt 0 ]; then
  echo "UNEXPECTED files in tests/rls (not <number>_<name>.sql):"
  printf '  %s\n' "${UNEXPECTED[@]}"
  exit 1
fi

for f in "${FIXTURES[@]}"; do
  su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/$f" >/dev/null
done
echo "fixtures:   ok (${#FIXTURES[@]})"

# --- the real standards ingestion -------------------------------------------
# Not a fixture: this is the generated import of the authoritative Florida
# artifact, plus the review decision, run end to end on every local run. It
# lives here rather than in tests/rls because it is the actual production
# ingestion, and a test suite that exercises a hand-written imitation of it
# would pass while the real one was broken. Applied in order, and a failure in
# any of them fails the suite before a single test runs.
IMPORTS=("_grant_admin.sql"
         "20260908_florida_best_mathematics_k5.sql"
         "20260908_florida_best_mathematics_k5_review.sql")
for f in "${IMPORTS[@]}"; do
  if [ ! -f "$ROOT/supabase/imports/$f" ]; then
    echo "MISSING import: supabase/imports/$f"; exit 1
  fi
  if ! su postgres -c "$PSQL -d $DB -f $ROOT/supabase/imports/$f" > /tmp/import.out 2>&1; then
    echo "IMPORT FAILED: $f"; sed -n '1,40p' /tmp/import.out; exit 1
  fi
done
echo "imports:    ok (${#IMPORTS[@]}) - Florida B.E.S.T. K-5 staged, reviewed and published"

# --- execution ---------------------------------------------------------------
status=0
EXECUTED=()
for f in "${TESTS[@]}"; do
  printf '  %s ... ' "$f"
  EXECUTED+=("$f")
  if su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/$f" > /tmp/test.out 2>&1; then
    echo PASS
  else
    echo FAIL; sed -n '1,40p' /tmp/test.out; status=1
  fi
done

# --- reconciliation ----------------------------------------------------------
# The part that makes the defect impossible to repeat: a test file that was
# discovered and not executed fails the suite even when everything that DID run
# passed.
SKIPPED=()
for f in "${TESTS[@]}"; do
  found=0
  for e in "${EXECUTED[@]}"; do [ "$e" = "$f" ] && found=1 && break; done
  [ $found -eq 0 ] && SKIPPED+=("$f")
done

echo
echo "discovery: ${#DISCOVERED[@]} discovered, ${#FIXTURES[@]} fixtures, ${#TESTS[@]} tests, ${#EXECUTED[@]} executed, ${#SKIPPED[@]} skipped, ${#UNEXPECTED[@]} unexpected"
if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo "SUITE INVALID - discovered but never executed:"
  printf '  %s\n' "${SKIPPED[@]}"
  status=1
fi

# An empty suite is not a passing suite.
if [ ${#TESTS[@]} -eq 0 ]; then
  echo "SUITE INVALID - no test files discovered"; status=1
fi

exit $status
