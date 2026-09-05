import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Button } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

export default async function Page() {
  const t = await getTranslations('empty.reports');
  const tn = await getTranslations('nav');

  return (
    <ParentShell>
      <PageHeader title={tn('reports')} />
      <EmptyState icon="▤" title={t('title')} body={t('body')} />
    </ParentShell>
  );
}
