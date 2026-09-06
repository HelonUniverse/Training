#!/usr/bin/env bash
# =============================================================================
# End-to-end: real PostgreSQL, real migrations, real RLS, real browser.
#
# Rebuilds the scratch database, starts the RLS-faithful Supabase harness,
# builds and starts the app against it, then runs Playwright. Nothing here is
# mocked: a request the policies would refuse in production is refused here.
#
# SCANNER_PROVIDER=dev is set deliberately. The default scanner does nothing, so
# uploads would stay pending and undeliverable forever - correct for production,
# useless for testing the delivery path. The dev adapter does real work: it
# re-checks the stored bytes and treats the EICAR test string as infected, so
# both the clean and the infected paths are genuinely exercised.
# =============================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PGDIR=${PGDIR:-/var/tmp/hos-pg}
DB=${DB:-hos_app}
PORT=${PORT:-3100}
SUPA_PORT=${SUPA_PORT:-54321}
STORAGE_DIR=/tmp/hos-fake-storage

export DATABASE_URL="postgresql://postgres:localdev@127.0.0.1:5433/${DB}"
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:${SUPA_PORT}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:${PORT}"
export SCANNER_PROVIDER=dev
export CRON_SECRET=test-cron-secret
export FAKE_SUPABASE_PORT="${SUPA_PORT}"
export FAKE_STORAGE_DIR="${STORAGE_DIR}"
export BASE_URL="http://127.0.0.1:${PORT}"

cleanup() {
  [ -n "${APP_PID:-}" ] && kill "$APP_PID" 2>/dev/null
  [ -n "${SUPA_PID:-}" ] && kill "$SUPA_PID" 2>/dev/null
}
trap cleanup EXIT

# A harness left over from an earlier run keeps the port and quietly serves
# STALE CODE against a STALE database - so the suite passes or fails for
# reasons that have nothing to do with the working tree. Clear the ports first,
# and refuse to start if they are still held.
# `next start` re-execs as `next-server`, which no longer matches the command
# line it was launched with - so pkill on the original pattern leaves it alive.
pkill -f 'tests/harness/fake-supabase.mjs' 2>/dev/null
pkill -f "next start -p ${PORT}" 2>/dev/null
pkill -f 'next-server' 2>/dev/null
sleep 2
for p in "$SUPA_PORT" "$PORT"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    exec 3<&- 3>&-
    echo "port $p is still in use; refusing to run against something else's server"
    exit 1
  fi
done

echo "== rebuilding ${DB} =="
DB="$DB" bash tests/local/run.sh >/dev/null || { echo "migrations failed"; exit 1; }
rm -rf "$STORAGE_DIR"; mkdir -p "$STORAGE_DIR"

echo "== starting the Supabase harness =="
node tests/harness/fake-supabase.mjs > /tmp/fake-supabase.log 2>&1 &
SUPA_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:${SUPA_PORT}/auth/v1/user" -o /dev/null -w '' 2>/dev/null && break
  curl -s "http://127.0.0.1:${SUPA_PORT}/auth/v1/user" >/dev/null 2>&1 && break
  sleep 0.25
done

echo "== building the app =="
# From scratch. NEXT_PUBLIC_* values are inlined into the client bundle at BUILD
# time, and Next will happily reuse cached chunks compiled when they were absent
# - which produces a browser Supabase client with no URL and a capture flow that
# fails with no server-side error to find.
rm -rf .next
npx next build > /tmp/next-build.log 2>&1 || { tail -30 /tmp/next-build.log; exit 1; }

# Prove it, rather than assume it. This is the check that would have saved an
# afternoon: the symptom of a missing inline is a silent client-side throw.
if ! grep -rqs "127.0.0.1:${SUPA_PORT}" .next/static/chunks/; then
  echo "NEXT_PUBLIC_SUPABASE_URL was not inlined into the client bundle."
  echo "The browser would build a Supabase client with no URL. Refusing to run."
  exit 1
fi

echo "== starting the app =="
npx next start -p "$PORT" > /tmp/next-start.log 2>&1 &
APP_PID=$!
for _ in $(seq 1 80); do
  curl -s "http://127.0.0.1:${PORT}/sign-in" >/dev/null 2>&1 && break
  sleep 0.25
done

echo "== playwright =="
npx playwright test "$@"
STATUS=$?

exit $STATUS
