import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Button } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { Timeline } from '@/components/portfolio/Timeline';
import { PreviewProvider } from '@/components/portfolio/DocumentPreview';
import { getTimeline, groupByMonth } from '@/lib/portfolio/queries';
import { getCaptureStudents, getSubjects } from '@/lib/capture/data';
import { getActiveStudent } from '@/lib/auth/context';

export default async function Page() {
  const t = await getTranslations('portfolio');
  const te = await getTranslations('empty.portfolio');
  const tn = await getTranslations('nav');

  const { activeId } = await getActiveStudent();
  const [entries, students, subjects] = await Promise.all([
    getTimeline({ studentId: activeId }),
    getCaptureStudents(),
    getSubjects(),
  ]);

  const studentNames = new Map(students.map((s) => [s.id, s.name]));
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));

  return (
    <ParentShell allowAll>
      <PageHeader
        title={tn('portfolio')}
        subtitle={entries.length > 0 ? t('subtitle', { count: entries.length }) : undefined}
        action={
          <Link href="/app/add">
            <Button size="md">{t('add')}</Button>
          </Link>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon="✦"
          title={te('title')}
          body={te('body')}
          action={
            <Link href="/app/add">
              <Button size="lg">{te('cta')}</Button>
            </Link>
          }
        />
      ) : (
        <PreviewProvider>
          <Timeline
            months={groupByMonth(entries)}
            studentNames={studentNames}
            subjectNames={subjectNames}
          />
        </PreviewProvider>
      )}
    </ParentShell>
  );
}
