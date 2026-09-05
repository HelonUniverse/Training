import { getTranslations } from 'next-intl/server';
import { OnboardingProgress } from '@/components/ui/patterns';
import { getDraft } from '@/lib/onboarding-server';
import { ChildForm } from './ChildForm';

export default async function ChildStep() {
  const t = await getTranslations('onboarding');
  const draft = await getDraft();
  return (
    <>
      <OnboardingProgress current={1} total={5} label={t('progress', { current: 1, total: 5 })} />
      <ChildForm draft={draft} />
    </>
  );
}
