import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getFormatter } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Card, StatusBadge } from '@/components/ui/primitives';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { VisibilityControl } from '@/components/documents/VisibilityControl';
import { ShareDialog } from '@/components/documents/ShareDialog';
import { createClient } from '@/lib/supabase/server';
import { getActiveShares, getShareRecipients, getSharingContext } from '@/server/actions/documents';
import {
  SCAN_LABEL,
  VISIBILITY_DESCRIPTION,
  VISIBILITY_LABEL,
  availableVisibilities,
  type DocumentVisibility,
  type ScanStatus,
} from '@/lib/documents/visibility';
import { humanSize } from '@/lib/upload/validation';
import { calendarDate } from '@/lib/dates';

export default async function Page({ params }: PageProps<'/app/documents/[id]'>) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, original_filename, mime_type, byte_size, sha256, scan_status, scanned_at, category, document_date, visibility, student_id, created_at, source')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!doc) notFound();

  const t = await getTranslations('documents');
  const ts = await getTranslations('scan');
  const tv = await getTranslations('vocab');
  const tvis = await getTranslations('visibility');
  const format = await getFormatter();

  const scan = SCAN_LABEL[doc.scan_status as ScanStatus];
  const documentDate = calendarDate(doc.document_date);

  // A document with no student is family or organization paperwork; there is
  // nobody to share it with under the student capability model, so the sharing
  // section simply does not render.
  const [context, recipients, shares] = doc.student_id
    ? await Promise.all([
        getSharingContext(doc.student_id),
        getShareRecipients(doc.student_id),
        getActiveShares(doc.id),
      ])
    : [null, null, []];

  const options = context
    ? availableVisibilities(context).map((value) => ({
        value,
        label: tvis(VISIBILITY_LABEL[value].replace('visibility.', '')),
        help: tvis(VISIBILITY_DESCRIPTION[value].replace('visibility.', '')),
      }))
    : [];

  const nameFor: Record<string, string> = {};
  for (const person of recipients?.people ?? []) nameFor[person.userId] = person.name;
  for (const org of recipients?.organizations ?? []) nameFor[org.organizationId] = org.name;
  for (const ev of recipients?.evaluators ?? []) nameFor[ev.grantId] = ev.name;

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader
        eyebrow={
          <Link href="/app/documents" className="inline-flex min-h-11 items-center hover:underline">
            ← {t('backToDocuments')}
          </Link>
        }
        title={doc.title ?? doc.original_filename}
        subtitle={tv(`documentCategory.${doc.category}`)}
        action={
          doc.scan_status === 'clean' ? null : (
            <StatusBadge tone={scan.tone}>{ts(scan.key.replace('scan.', ''))}</StatusBadge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <DocumentViewer
          documentId={doc.id}
          scanStatus={doc.scan_status}
          filename={doc.original_filename}
        />

        <div className="space-y-6">
          <Card as="section" aria-labelledby="file-facts">
            <h2 id="file-facts" className="text-heading text-ink">
              {t('facts.title')}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label={t('facts.filename')}>
                <span className="break-all">{doc.original_filename}</span>
              </Row>
              <Row label={t('facts.size')}>{humanSize(doc.byte_size)}</Row>
              <Row label={t('facts.added')}>
                {format.dateTime(new Date(doc.created_at), { dateStyle: 'medium' })}
              </Row>
              {documentDate ? (
                <Row label={t('facts.dated')}>
                  {format.dateTime(documentDate, { dateStyle: 'medium' })}
                </Row>
              ) : null}
              <Row label={t('facts.checked')}>
                {doc.scanned_at
                  ? format.dateTime(new Date(doc.scanned_at), { dateStyle: 'medium' })
                  : ts('pending')}
              </Row>
              <Row label={t('facts.fingerprint')}>
                {/* Enough to compare two copies by eye; the full digest is in
                    the record, not on the screen. */}
                <code className="font-mono text-xs text-ink-muted">{doc.sha256.slice(0, 12)}</code>
              </Row>
            </dl>
            <p className="mt-4 text-sm text-ink-subtle">{t('facts.immutable')}</p>
          </Card>

          {doc.student_id && context ? (
            <Card as="section" aria-labelledby="who-sees">
              <h2 id="who-sees" className="text-heading text-ink">
                {tvis('sectionTitle')}
              </h2>
              <div className="mt-4 space-y-5">
                <VisibilityControl
                  documentId={doc.id}
                  studentId={doc.student_id}
                  current={doc.visibility as DocumentVisibility}
                  options={options}
                />
                {context.canShare && recipients ? (
                  <ShareDialog
                    documentId={doc.id}
                    studentId={doc.student_id}
                    recipients={recipients}
                    activeShares={shares}
                    nameFor={nameFor}
                  />
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </ParentShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}
