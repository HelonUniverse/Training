#!/usr/bin/env bash
# =============================================================================
# Migration regression: 0081-0083 over synthetic legacy rows
# =============================================================================
# The two profile tables are empty in every environment, so running a migration
# test against them proves nothing and passes for the wrong reason. This builds
# the schema as it stood at 0080, seeds rows carrying every legacy mastery_level
# and every legacy confidence_level value, applies the three STEP 7 foundation
# migrations over them, and then asserts what came out.
#
# The migrations under test are the REAL files. Nothing here reimplements them.
# =============================================================================
set -euo pipefail
PGDIR=${PGDIR:-/var/tmp/hos-pg}
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB=${MIGDB:-hos_migtest}
PSQL="/usr/lib/postgresql/16/bin/psql -h $PGDIR/run -p 5433 -U postgres -v ON_ERROR_STOP=1 --quiet"

# Everything up to and including 0080 is "before"; the three after it are "under test".
BOUNDARY="20260908040000_staging_locators.sql"
UNDER_TEST=("20260909010000_evidence_axes.sql"
            "20260909010100_skill_state_model.sql"
            "20260909010200_step7_invariants.sql")

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB;' -c 'create database $DB;'" >/dev/null
su postgres -c "$PSQL -d $DB -f $ROOT/tests/local/00_supabase_shim.sql" >/dev/null 2>&1

echo "  building the schema as it stood before STEP 7 ..."
seen_boundary=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  base="$(basename "$f")"
  case " ${UNDER_TEST[*]} " in *" $base "*) continue ;; esac
  su postgres -c "$PSQL -d $DB -f $f" >/dev/null
  [ "$base" = "$BOUNDARY" ] && seen_boundary=1
done
if [ "$seen_boundary" -ne 1 ]; then
  echo "  FAIL: boundary migration $BOUNDARY never applied - the pre-migration schema is wrong"
  exit 1
fi

su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/00_fixtures.sql" >/dev/null
su postgres -c "$PSQL -d $DB -f $ROOT/tests/rls/00b_step25_fixtures.sql" >/dev/null 2>&1 || true

# The seed must be impossible to run against the NEW schema: if these columns
# already exist the harness has silently tested nothing.
if su postgres -c "$PSQL -d $DB -tAc \"select 1 from information_schema.columns where table_schema='public' and table_name='student_skills' and column_name='skill_state'\"" | grep -q 1; then
  echo "  FAIL: skill_state already exists before the migrations under test ran"
  exit 1
fi

printf '  seeding synthetic legacy rows ... '
su postgres -c "$PSQL -d $DB -f $ROOT/tests/migration/0081_0083_seed_legacy.sql" >/dev/null
n=$(su postgres -c "$PSQL -d $DB -tAc 'select count(*) from public.student_skills'")
if [ "$n" -lt 7 ]; then echo "FAIL: only $n rows seeded"; exit 1; fi
echo "ok ($n rows)"

for f in "${UNDER_TEST[@]}"; do
  printf '  applying %s ... ' "$f"
  su postgres -c "$PSQL -d $DB -f $ROOT/supabase/migrations/$f" >/dev/null
  echo ok
done

printf '  asserting ... '
if su postgres -c "$PSQL -d $DB -f $ROOT/tests/migration/0081_0083_assert.sql" > /tmp/migassert.out 2>&1; then
  echo PASS
else
  echo FAIL; sed -n '1,40p' /tmp/migassert.out; exit 1
fi

su postgres -c "$PSQL -d postgres -c 'drop database if exists $DB;'" >/dev/null
echo "migration regression: PASS"
