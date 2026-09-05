import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getActiveContext } from '@/lib/auth/context';
import { ParentShell } from '@/components/app/ParentShell';
import { Card } from '@/components/ui/primitives';
import { AddChildForm } from './AddChildForm';

export default async function AddChildPage() {
  const t = await getTranslations('students');
  const context = await getActiveContext();
  if (context?.kind !== 'parent') redirect('/app');

  return (
    <ParentShell showStudentSwitcher={false}>
      <div className="mx-auto max-w-form">
        <Card className="p-6 sm:p-8">
          <h1 className="text-title text-ink">{t('addTitle')}</h1>
          <p className="mt-1.5 text-ink-muted">{t('addSubtitle')}</p>
          <AddChildForm familyId={context.familyId} />
        </Card>
      </div>
    </ParentShell>
  );
}
