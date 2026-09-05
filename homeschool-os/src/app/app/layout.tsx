import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { parseOnboardingState, resumePath } from '@/lib/onboarding';

/**
 * The gate into the product. An account that has not finished onboarding is
 * sent back to where it stopped rather than shown an empty dashboard.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/app');
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('onboarding_state')
    .eq('id', user.id)
    .maybeSingle();

  const state = parseOnboardingState(data?.onboarding_state);
  if (!state.completed) redirect(resumePath(state));

  return <>{children}</>;
}
