import { getTranslations } from 'next-intl/server';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

export default async function Page() {
  const t = await getTranslations('empty.documents');
  const tn = await getTranslations('nav');
  return (
    <OrgShell>
      <PageHeader title={tn('documents')} />
      <EmptyState icon="❐" title={t('title')} body={t('body')} />
    </OrgShell>
  );
}
