'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.generated';

/** Browser client. Anon key only - it is public by design and RLS-bound. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
