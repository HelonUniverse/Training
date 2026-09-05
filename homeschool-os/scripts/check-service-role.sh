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

# Paths permitted to import the service-role client.
ALLOWED='^(supabase/functions/|app/api/cron/|app/api/webhooks/|lib/supabase/service\.ts|scripts/)'

echo "== service-role import boundary =="
if [ -d "$ROOT/app" ] || [ -d "$ROOT/lib" ]; then
  hits=$(cd "$ROOT" && grep -rIl --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
        -e 'supabase/service' -e 'createServiceClient' -e 'SERVICE_ROLE' \
        app lib components server config 2>/dev/null | grep -Ev "$ALLOWED" || true)
  if [ -n "$hits" ]; then
    fail "service-role usage outside the allowed entry points:"; echo "$hits"
  else
    echo "  ok"
  fi
else
  echo "  skipped (no application code yet)"
fi

echo "== service-role key never in a client bundle =="
if [ -d "$ROOT/app" ]; then
  hits=$(cd "$ROOT" && grep -rIn --include='*.ts' --include='*.tsx' \
        -e 'NEXT_PUBLIC_[A-Z_]*SERVICE' -e 'NEXT_PUBLIC_[A-Z_]*SECRET' \
        app lib components 2>/dev/null || true)
  [ -n "$hits" ] && { fail "a secret is exposed through a NEXT_PUBLIC_ variable:"; echo "$hits"; } || echo "  ok"
else
  echo "  skipped (no application code yet)"
fi

echo "== 'use client' files must not touch server-only modules =="
if [ -d "$ROOT/components" ] || [ -d "$ROOT/app" ]; then
  for f in $(cd "$ROOT" && grep -rIl --include='*.tsx' --include='*.ts' "'use client'" app components 2>/dev/null || true); do
    if grep -qE "supabase/service|lib/supabase/server|server/actions/.*service" "$ROOT/$f"; then
      fail "client component imports a server-only module: $f"
    fi
  done
  echo "  checked"
else
  echo "  skipped (no application code yet)"
fi

echo "== every server action is permission-wrapped =="
if [ -d "$ROOT/server/actions" ]; then
  for f in $(cd "$ROOT" && grep -rIl "'use server'" server/actions 2>/dev/null || true); do
    grep -q 'withPermission\|requirePermission' "$ROOT/$f" || fail "server action without a permission wrapper: $f"
  done
  echo "  checked"
else
  echo "  skipped (no server actions yet)"
fi

exit $status
