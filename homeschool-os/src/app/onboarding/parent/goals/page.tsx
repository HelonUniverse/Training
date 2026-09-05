import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { GoalsForm } from './GoalsForm';

export default async function GoalsStep() {
  const t = await getTranslations('onboarding');
  return (
    <>
      <OnboardingProgress current={5} total={5} label={t('progress', { current: 5, total: 5 })} />
      <GoalsForm />
    </>
  );
}
