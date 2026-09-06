import { redirect } from 'next/navigation';
import { requireUser, getContexts } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { parseOnboardingState, resumePath } from '@/lib/onboarding';

/**
 * The gate into the product. An account that has not finished onboarding is
 * sent back to where it stopped rather than shown an empty dashboard.
 *
 * ONBOARDING IS FOR CREATING A WORKSPACE, not for having one. Someone who was
 * INVITED into a family or a program already has one - it was set up by
 * whoever invited them - and they have no onboarding of their own to finish.
 *
 * Until STEP 4 this gate looked only at onboarding_state, so an invited
 * teacher who accepted their invitation was bounced straight into "What best
 * describes you?" and asked to create a family or a program of their own.
 * Neither is what they came for, and there was no way past it. Found by
 * journey 4 in tests/e2e/capture.spec.ts.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/app');
  const supabase = await createClient();

  const [{ data }, contexts] = await Promise.all([
    supabase.from('profiles').select('onboarding_state').eq('id', user.id).maybeSingle(),
    // RLS-derived: this is membership the database already grants, not a claim.
    getContexts(),
  ]);

  const state = parseOnboardingState(data?.onboarding_state);
  if (!state.completed && contexts.length === 0) redirect(resumePath(state));

  return <>{children}</>;
}
