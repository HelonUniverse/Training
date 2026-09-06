import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader } from '@/components/ui/primitives';
import { EditItemForm } from '@/components/portfolio/EditItemForm';
import { getPortfolioItem } from '@/lib/portfolio/queries';
import { getSubjects } from '@/lib/capture/data';

export default async function Page({ params }: PageProps<'/app/portfolio/[id]/edit'>) {
  const { id } = await params;

  const [item, subjects] = await Promise.all([getPortfolioItem(id), getSubjects()]);
  if (!item) notFound();

  const t = await getTranslations('portfolio');

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader
        eyebrow={
          <Link href={`/app/portfolio/${id}`} className="hover:underline">
            ← {item.title}
          </Link>
        }
        title={t('editTitle')}
        subtitle={t('editSubtitle')}
      />

      <EditItemForm
        itemId={id}
        studentId={item.student_id}
        subjects={subjects}
        initial={{
          title: item.title,
          description: item.description,
          occurredOn: item.occurred_on,
          subjectId: item.subject_id,
        }}
      />
    </ParentShell>
  );
}
