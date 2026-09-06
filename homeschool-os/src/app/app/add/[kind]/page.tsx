import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, ButtonLink } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { CaptureFlow } from '@/components/capture/CaptureFlow';
import { SmartIntakeNotice } from '@/components/capture/SmartIntakeNotice';
import { getCaptureStudents, getSubjects } from '@/lib/capture/data';
import { getActiveStudent } from '@/lib/auth/context';
import { isCaptureKind } from '@/lib/capture/kinds';

export default async function Page({ params }: PageProps<'/app/add/[kind]'>) {
  const { kind } = await params;
  if (!isCaptureKind(kind)) notFound();

  const t = await getTranslations('capture');
  const te = await getTranslations('empty');

  const [students, subjects, { activeId }] = await Promise.all([
    getCaptureStudents(),
    getSubjects(),
    getActiveStudent(),
  ]);

  if (students.length === 0) {
    return (
      <ParentShell showStudentSwitcher={false}>
        <PageHeader title={t(`kind.${kind}`)} />
        <EmptyState
          icon="◍"
          title={te('noChildren.title')}
          body={te('noChildren.body')}
          action={
            <ButtonLink href="/app/children/new" size="lg">
              {te('noChildren.cta')}
            </ButtonLink>
          }
        />
      </ParentShell>
    );
  }

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader
        eyebrow={
          <Link href="/app/add" className="inline-flex min-h-11 items-center hover:underline">
            ← {t('addSomething')}
          </Link>
        }
        title={t(`kind.${kind}`)}
        subtitle={t(`kindHelp.${kind}`)}
      />

      <div className="max-w-2xl">
        <CaptureFlow
          kind={kind}
          students={students}
          subjects={subjects}
          activeStudentId={activeId === 'all' ? null : activeId}
        />
        <div className="mt-8">
          <SmartIntakeNotice />
        </div>
      </div>
    </ParentShell>
  );
}
