import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { LocationForm } from './LocationForm';

export default async function LocationStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={2} total={5} label={t('progress', { current: 2, total: 5 })} />
      <LocationForm draft={draft} />
    </>
  );
}
