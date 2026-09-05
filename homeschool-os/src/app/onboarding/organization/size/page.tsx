import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { OrgSizeForm } from './OrgSizeForm';

export default async function OrgSizeStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={3} total={4} label={t('progress', { current: 3, total: 4 })} />
      <OrgSizeForm draft={draft} />
    </>
  );
}
