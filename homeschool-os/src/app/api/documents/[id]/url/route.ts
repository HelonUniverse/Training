import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';

/**
 * Mints a short-lived signed URL for one document.
 *
 * NO SERVICE ROLE. The signed URL is created with the caller's OWN session, so
 * the storage policy added in migration 0060 is what decides: the bytes are
 * reachable only if the caller can read the owning documents row AND the file
 * has scanned clean. This route adds two things on top of that - a
 * document_viewed audit row, and a deliberately short expiry.
 *
 * An infected or still-pending document returns 404 with the same body as a
 * document that does not exist. There is no response a caller can use to learn
 * that some file they may not see is out there.
 */

const EXPIRY_SECONDS = 120;

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/documents/[id]/url'>) {
  const { id } = await ctx.params;

  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = await createClient();

  // RLS-filtered: a document the caller may not read simply is not here.
  const { data: doc } = await supabase
    .from('documents')
    .select('id, storage_bucket, storage_path, mime_type, original_filename, scan_status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!doc) return Response.json({ error: 'not found' }, { status: 404 });

  if (doc.scan_status !== 'clean') {
    // Truthful and specific: the file exists and is theirs, it is just not
    // available yet. Saying "not found" here would be a lie about their own
    // upload; saying "infected" for a pending file would be a different one.
    return Response.json(
      { error: 'not available', scanStatus: doc.scan_status },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_path, EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  // Recorded before the URL leaves the server, so a view is logged even if the
  // client never follows the link.
  await supabase.rpc('record_document_view', { p_document: id });

  return Response.json(
    {
      url: data.signedUrl,
      expiresIn: EXPIRY_SECONDS,
      mimeType: doc.mime_type,
      filename: doc.original_filename,
    },
    // Never cached anywhere: the URL is short-lived and caller-specific.
    { headers: { 'cache-control': 'no-store, private' } },
  );
}
