import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Button } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

export default async function Page() {
  const t = await getTranslations('empty.learning');
  const tn = await getTranslations('nav');

  return (
    <ParentShell>
      <PageHeader title={tn('learning')} />
      <EmptyState icon="✎" title={t('title')} body={t('body')}
        action={<Button size="lg">{t('cta')}</Button>} />
    </ParentShell>
  );
}
