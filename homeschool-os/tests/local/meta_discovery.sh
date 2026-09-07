#!/usr/bin/env bash
# =============================================================================
# Does the runner's discovery actually find every numeric prefix?
# =============================================================================
# This is the guard for the defect itself, not for anything the suite tests. It
# builds a scratch directory of files named the way real test files are named,
# runs the runner's OWN discovery expression over it, and checks the result.
#
# The expression is duplicated here on purpose: it must be possible for this to
# FAIL when test.sh changes, which is exactly what would not have happened if it
# imported the thing it is checking.
# =============================================================================
set -euo pipefail
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

EXPECT=(00_fixtures.sql 00b_step25_fixtures.sql 01_a.sql 09_a.sql 10_a.sql 11_a.sql 20_a.sql 99_a.sql 100_a.sql)
for f in "${EXPECT[@]}"; do : > "$TMP/$f"; done

mapfile -t FOUND < <(find "$TMP" -maxdepth 1 -name '*.sql' -printf '%f\n' | sort -t_ -k1,1n -k1)

fail=0
for f in "${EXPECT[@]}"; do
  found=0
  for g in "${FOUND[@]}"; do [ "$g" = "$f" ] && found=1 && break; done
  if [ $found -eq 0 ]; then echo "  MISSED: $f"; fail=1; fi
done

# The old glob, kept as the thing we are proving we no longer do.
mapfile -t OLD < <(cd "$TMP" && ls [0-9][1-9]_*.sql 2>/dev/null || true)
if [ ${#OLD[@]} -ge ${#FOUND[@]} ]; then
  echo "  the old glob was not actually narrower - this guard is not testing anything"; fail=1
fi

# And numeric ordering, so 9 runs before 10.
ORDER="$(printf '%s\n' "${FOUND[@]}" | grep -E '^(01|09|10|11|20|99|100)_' | tr '\n' ' ')"
if [ "$ORDER" != "01_a.sql 09_a.sql 10_a.sql 11_a.sql 20_a.sql 99_a.sql 100_a.sql " ]; then
  echo "  numeric ordering is wrong: $ORDER"; fail=1
fi

if [ $fail -eq 0 ]; then
  echo "test discovery: ok - ${#FOUND[@]} files found including 10, 11, 20, 99 and 100 (old glob found ${#OLD[@]})"
else
  echo "test discovery: FAILED"; exit 1
fi
