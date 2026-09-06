import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, ButtonLink } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { PreviewProvider } from '@/components/portfolio/DocumentPreview';
import { DocumentList, type DocumentRow } from '@/components/documents/DocumentList';
import { DocumentSearch } from '@/components/documents/DocumentSearch';
import { createClient } from '@/lib/supabase/server';
import { getCaptureStudents } from '@/lib/capture/data';
import { getActiveStudent } from '@/lib/auth/context';

export default async function Page({ searchParams }: PageProps<'/app/documents'>) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  const t = await getTranslations('documents');
  const te = await getTranslations('empty.documents');
  const tn = await getTranslations('nav');

  const { activeId } = await getActiveStudent();
  const supabase = await createClient();

  let request = supabase
    .from('documents')
    .select('id, title, original_filename, mime_type, byte_size, scan_status, category, document_date, created_at, student_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (activeId && activeId !== 'all') request = request.eq('student_id', activeId);

  if (query.length >= 2) {
    // Commas and parentheses are PostgREST filter syntax, so they are stripped
    // rather than passed through into the `or` expression.
    const safe = query.replace(/[,()*\\]/g, ' ').trim();
    if (safe) request = request.or(`title.ilike.%${safe}%,original_filename.ilike.%${safe}%`);
  }

  const [{ data }, students] = await Promise.all([request, getCaptureStudents()]);
  const documents = (data ?? []) as DocumentRow[];
  const studentNames = new Map(students.map((s) => [s.id, s.name]));

  const nothingAtAll = documents.length === 0 && query.length === 0;

  return (
    <ParentShell allowAll>
      <PageHeader
        title={tn('documents')}
        subtitle={nothingAtAll ? undefined : t('subtitle', { count: documents.length })}
        action={
          <ButtonLink href="/app/add/document">{t('add')}</ButtonLink>
        }
      />

      {nothingAtAll ? (
        <EmptyState
          icon="❐"
          title={te('title')}
          body={te('body')}
          action={
            <ButtonLink href="/app/add/document" size="lg">
              {te('cta')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <DocumentSearch />
          <PreviewProvider>
            <DocumentList documents={documents} studentNames={studentNames} />
          </PreviewProvider>
        </>
      )}
    </ParentShell>
  );
}
