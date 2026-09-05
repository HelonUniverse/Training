#!/usr/bin/env bash
# =============================================================================
# Service-role boundary guard. Runs in CI; needs no toolchain.
#
# The service-role key bypasses RLS completely. It is allowed ONLY in trusted
# server-side entry points (see docs/architecture/12-service-role-boundary.md).
# Anywhere else - a client component, a browser bundle, an ordinary server
# action - it is a full data breach.
# =============================================================================
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
status=0
fail() { echo "FAIL: $1"; status=1; }

# Paths permitted to import the service-role client. Both a root-level and a
# src/ layout are matched, because the app uses src/ and an earlier version of
# this guard silently passed over it.
ALLOWED='^(supabase/functions/|(src/)?app/api/cron/|(src/)?app/api/webhooks/|(src/)?lib/supabase/service\.ts|scripts/|tests/)'

# Where application code actually lives.
SRC_DIRS=""
for d in app lib components server config src; do
  [ -d "$ROOT/$d" ] && SRC_DIRS="$SRC_DIRS $d"
done

echo "== service-role import boundary =="
if [ -n "$SRC_DIRS" ]; then
  hits=$(cd "$ROOT" && grep -rIl --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
        -e 'supabase/service' -e 'createServiceClient' -e 'SERVICE_ROLE' \
        $SRC_DIRS 2>/dev/null | grep -Ev "$ALLOWED" || true)
  if [ -n "$hits" ]; then
    fail "service-role usage outside the allowed entry points:"; echo "$hits"
  else
    echo "  ok"
  fi
else
  echo "  skipped (no application code yet)"
fi

echo "== service-role key never in a client bundle =="
if [ -n "$SRC_DIRS" ]; then
  hits=$(cd "$ROOT" && grep -rIn --include='*.ts' --include='*.tsx' \
        -e 'NEXT_PUBLIC_[A-Z_]*SERVICE' -e 'NEXT_PUBLIC_[A-Z_]*SECRET' \
        $SRC_DIRS 2>/dev/null || true)
  [ -n "$hits" ] && { fail "a secret is exposed through a NEXT_PUBLIC_ variable:"; echo "$hits"; } || echo "  ok"
else
  echo "  skipped (no application code yet)"
fi

echo "== 'use client' files must not touch server-only modules =="
if [ -n "$SRC_DIRS" ]; then
  for f in $(cd "$ROOT" && grep -rIl --include='*.tsx' --include='*.ts' "'use client'" $SRC_DIRS 2>/dev/null || true); do
    if grep -qE "supabase/service|lib/supabase/server|server/actions/.*service" "$ROOT/$f"; then
      fail "client component imports a server-only module: $f"
    fi
  done
  echo "  checked"
else
  echo "  skipped (no application code yet)"
fi

echo "== every server action is permission-wrapped =="
ACTION_DIR=""
[ -d "$ROOT/server/actions" ] && ACTION_DIR="server/actions"
[ -d "$ROOT/src/server/actions" ] && ACTION_DIR="src/server/actions"
if [ -n "$ACTION_DIR" ]; then
  for f in $(cd "$ROOT" && grep -rIl "'use server'" "$ACTION_DIR" 2>/dev/null || true); do
    # A file may opt out only with an explicit, visible marker (pre-auth entry
    # points such as sign-in have no session to check a permission against).
    if grep -q 'PRE-AUTH ENTRY POINT' "$ROOT/$f"; then
      echo "  exempt (pre-auth): $f"
      continue
    fi
    grep -q 'withPermission\|requirePermission' "$ROOT/$f" || fail "server action without a permission wrapper: $f"
  done
  echo "  checked"
else
  echo "  skipped (no server actions yet)"
fi

exit $status
