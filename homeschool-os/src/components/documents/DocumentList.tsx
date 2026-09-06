import Link from 'next/link';
import { getTranslations, getFormatter } from 'next-intl/server';
import { StatusBadge } from '@/components/ui/primitives';
import { DocumentPreview } from '@/components/portfolio/DocumentPreview';
import { SCAN_LABEL, type ScanStatus } from '@/lib/documents/visibility';
import { humanSize } from '@/lib/upload/validation';

export type DocumentRow = {
  id: string;
  title: string | null;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  scan_status: string;
  category: string;
  document_date: string | null;
  created_at: string;
  student_id: string | null;
};

/**
 * Documents ARE a filing cabinet, and this screen is allowed to look like one.
 * The portfolio is the story; this is where a parent goes when the county asks
 * for the immunization form. What it still owes them is a truthful state for
 * every row - a file that has not been scanned says so, rather than looking
 * available and failing when tapped.
 */
export async function DocumentList({
  documents,
  studentNames,
}: {
  documents: DocumentRow[];
  studentNames: Map<string, string>;
}) {
  const t = await getTranslations('documents');
  const ts = await getTranslations('scan');
  const tv = await getTranslations('vocab');
  const format = await getFormatter();
  const showChild = studentNames.size > 1;

  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-hairline/70">
      {documents.map((doc) => {
        const scan = SCAN_LABEL[doc.scan_status as ScanStatus];
        const when = doc.document_date ?? doc.created_at.slice(0, 10);

        return (
          <li key={doc.id}>
            <Link
              href={`/app/documents/${doc.id}`}
              className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken"
            >
              <DocumentPreview
                documentId={doc.id}
                alt=""
                scanStatus={doc.scan_status}
                className="h-12 w-12 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {doc.title ?? doc.original_filename}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {tv(`documentCategory.${doc.category}`)}
                  {' · '}
                  {format.dateTime(new Date(`${when}T12:00:00`), { dateStyle: 'medium' })}
                  {showChild && doc.student_id
                    ? ` · ${studentNames.get(doc.student_id) ?? ''}`
                    : ''}
                  {' · '}
                  {humanSize(doc.byte_size)}
                </p>
              </div>

              {doc.scan_status === 'clean' ? (
                <span aria-hidden className="text-ink-subtle">
                  ›
                </span>
              ) : (
                <StatusBadge tone={scan.tone}>{ts(scan.key.replace('scan.', ''))}</StatusBadge>
              )}
            </Link>
          </li>
        );
      })}
      {documents.length === 0 ? (
        <li className="px-4 py-10 text-center text-ink-muted">{t('noMatches')}</li>
      ) : null}
    </ul>
  );
}
