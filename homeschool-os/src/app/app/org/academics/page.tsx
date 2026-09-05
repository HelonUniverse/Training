import { getTranslations } from 'next-intl/server';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

export default async function Page() {
  const t = await getTranslations('empty.progress');
  const tn = await getTranslations('nav');
  return (
    <OrgShell>
      <PageHeader title={tn('academics')} />
      <EmptyState icon="◈" title={t('title')} body={t('body')} />
    </OrgShell>
  );
}
