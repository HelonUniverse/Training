import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getFormatter } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Card, StatusBadge, Button } from '@/components/ui/primitives';
import { PreviewProvider, DocumentPreview } from '@/components/portfolio/DocumentPreview';
import { getPortfolioItem, getDocuments } from '@/lib/portfolio/queries';
import { getCaptureStudents, getSubjects } from '@/lib/capture/data';
import { SCAN_LABEL, type ScanStatus } from '@/lib/documents/visibility';

export default async function Page({ params }: PageProps<'/app/portfolio/[id]'>) {
  const { id } = await params;

  const item = await getPortfolioItem(id);
  if (!item) notFound();

  const t = await getTranslations('portfolio');
  const tv = await getTranslations('vocab');
  const ts = await getTranslations('scan');
  const tvis = await getTranslations('visibility');
  const format = await getFormatter();

  const [documents, students, subjects] = await Promise.all([
    getDocuments(item.document_ids ?? []),
    getCaptureStudents(),
    getSubjects(),
  ]);

  const child = students.find((s) => s.id === item.student_id);
  const subject = subjects.find((s) => s.id === item.subject_id);

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader
        eyebrow={
          <Link href="/app/portfolio" className="hover:underline">
            ← {t('backToPortfolio')}
          </Link>
        }
        title={item.title}
        subtitle={[
          format.dateTime(new Date(`${item.occurred_on}T12:00:00`), { dateStyle: 'long' }),
          child?.name,
          subject?.name,
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <Link href={`/app/portfolio/${id}/edit`}>
            <Button variant="secondary">{t('edit')}</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="space-y-6">
          {item.description ? (
            <Card>
              <p className="whitespace-pre-line text-pretty text-ink">{item.description}</p>
            </Card>
          ) : null}

          {documents.length > 0 ? (
            <PreviewProvider>
              <section aria-labelledby="evidence">
                <h2 id="evidence" className="mb-3 text-heading text-ink">
                  {t('evidence', { count: documents.length })}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {documents.map((doc) => {
                    const scan = SCAN_LABEL[doc.scan_status as ScanStatus];
                    return (
                      <li key={doc.id}>
                        <Link
                          href={`/app/documents/${doc.id}`}
                          className="block overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-inset ring-hairline/70 transition-all hover:shadow-raised hover:ring-primary/40"
                        >
                          <DocumentPreview
                            documentId={doc.id}
                            alt={doc.title ?? doc.original_filename}
                            scanStatus={doc.scan_status}
                            className="aspect-[4/3] w-full"
                            rounded={false}
                          />
                          <div className="flex items-center justify-between gap-3 p-3">
                            <span className="min-w-0 truncate text-sm text-ink">
                              {doc.title ?? doc.original_filename}
                            </span>
                            {doc.scan_status !== 'clean' ? (
                              <StatusBadge tone={scan.tone}>
                                {ts(scan.key.replace('scan.', ''))}
                              </StatusBadge>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </PreviewProvider>
          ) : null}
        </div>

        {/* ------------------------------------------------------ provenance */}
        <Card as="section" aria-labelledby="provenance" className="h-fit">
          <h2 id="provenance" className="text-heading text-ink">
            {t('provenance.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('provenance.help')}</p>

          <dl className="mt-4 space-y-3 text-sm">
            <Row label={t('provenance.recordedBy')}>
              {t(`provenance.source.${item.source_type}`)}
            </Row>
            <Row label={t('provenance.recordedOn')}>
              {format.dateTime(new Date(item.created_at), { dateStyle: 'medium', timeStyle: 'short' })}
            </Row>
            {item.updated_at && item.updated_at !== item.created_at ? (
              <Row label={t('provenance.lastEdited')}>
                {format.dateTime(new Date(item.updated_at), { dateStyle: 'medium', timeStyle: 'short' })}
              </Row>
            ) : null}
            <Row label={t('provenance.kind')}>{tv(`activityType.${item.activity_type}`)}</Row>
            <Row label={t('provenance.evidenceKind')}>
              {tv(`evidenceCategory.${item.evidence_category}`)}
            </Row>
            <Row label={t('provenance.visibility')}>
              {tvis(`item.${item.visibility}`)}
            </Row>
            <Row label={t('provenance.aiInvolved')}>
              {item.ai_generated ? t('provenance.aiYes') : t('provenance.aiNo')}
            </Row>
          </dl>
        </Card>
      </div>
    </ParentShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
