import { getTranslations } from 'next-intl/server';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader, Button } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

export default async function Page() {
  const t = await getTranslations('empty.orgStudents');
  const tn = await getTranslations('nav');
  return (
    <OrgShell>
      <PageHeader title={tn('students')} />
      <EmptyState icon="◍" title={t('title')} body={t('body')}
        action={<Button size="lg">{t('cta')}</Button>} />
    </OrgShell>
  );
}
