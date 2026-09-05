import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { StartForm } from './StartForm';

export default async function StartStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={3} total={5} label={t('progress', { current: 3, total: 5 })} />
      <StartForm draft={draft} />
    </>
  );
}
