import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { OrgLocationForm } from './OrgLocationForm';

export default async function OrgLocationStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={2} total={4} label={t('progress', { current: 2, total: 4 })} />
      <OrgLocationForm draft={draft} />
    </>
  );
}
