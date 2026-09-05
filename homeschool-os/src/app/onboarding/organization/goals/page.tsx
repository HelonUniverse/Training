import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { OrgGoalsForm } from './OrgGoalsForm';

export default async function OrgGoalsStep() {
  const t = await getTranslations('onboarding');
  return (
    <>
      <OnboardingProgress current={4} total={4} label={t('progress', { current: 4, total: 4 })} />
      <OrgGoalsForm />
    </>
  );
}
