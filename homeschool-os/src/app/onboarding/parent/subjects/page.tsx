import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { SubjectsForm } from './SubjectsForm';

export default async function SubjectsStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={4} total={5} label={t('progress', { current: 4, total: 5 })} />
      <SubjectsForm draft={draft} />
    </>
  );
}
