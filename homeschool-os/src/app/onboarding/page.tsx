import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { parseOnboardingState, resumePath } from '@/lib/onboarding';

/** Resume where the user stopped. */
export default async function OnboardingIndex() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_state')
    .eq('id', user.id)
    .maybeSingle();

  redirect(resumePath(parseOnboardingState(data?.onboarding_state)));
}
