import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';

/**
 * The service-role client. It bypasses RLS entirely.
 *
 * This file is one of a handful scripts/check-service-role.sh permits to name
 * the key at all, and importing it from anywhere else fails CI. It exists for
 * trusted background work only - today, the malware-scanning worker, which runs
 * from a cron route and never inside a user request.
 *
 * Two things follow from that and are worth stating:
 *
 *   1. auth.uid() is NULL under this client. Several functions rely on that -
 *      app.record_scan_result refuses to run when auth.uid() is set, so a user
 *      session can never reach it even by accident.
 *   2. Anything read through here is unfiltered. Never return its rows to a
 *      user response without re-deriving what that user may see.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) {
    throw new Error('the service client needs SUPABASE_SERVICE_ROLE_KEY and a project URL');
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
