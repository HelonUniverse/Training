import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { OrgProfileForm } from './OrgProfileForm';

export default async function OrgProfileStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={1} total={4} label={t('progress', { current: 1, total: 4 })} />
      <OrgProfileForm draft={draft} />
    </>
  );
}
