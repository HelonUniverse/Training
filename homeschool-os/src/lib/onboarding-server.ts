import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { parseOnboardingState, type OnboardingState } from '@/lib/onboarding';

/** The saved draft for the current user, used to prefill a resumed step. */
export async function getDraft(): Promise<Record<string, string | string[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_state')
    .eq('id', user.id)
    .maybeSingle();
  const state: OnboardingState = parseOnboardingState(data?.onboarding_state);
  return (state.draft ?? {}) as Record<string, string | string[]>;
}
