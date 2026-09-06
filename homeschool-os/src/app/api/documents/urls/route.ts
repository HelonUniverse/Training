import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';

/**
 * Signed URLs for a page of documents, in one request.
 *
 * The portfolio timeline shows a family's own photographs, so a page needs many
 * previews at once. Doing that one round trip at a time is what makes a
 * scrapbook feel like a file manager loading.
 *
 * The authorization is identical to the single-document route: no service role,
 * the caller's own session, and the storage policy from migration 0060 decides.
 * Ids the caller may not read simply do not come back - the response says
 * nothing about whether they exist.
 */

const MAX_IDS = 24;
const EXPIRY_SECONDS = 300;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let ids: unknown;
  try {
    ({ ids } = (await request.json()) as { ids?: unknown });
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }

  const wanted = Array.isArray(ids)
    ? ids.filter((v): v is string => typeof v === 'string').slice(0, MAX_IDS)
    : [];

  if (wanted.length === 0) return Response.json({ urls: {} });

  const supabase = await createClient();

  const { data: documents } = await supabase
    .from('documents')
    .select('id, storage_bucket, storage_path, mime_type')
    .in('id', wanted)
    .eq('scan_status', 'clean')
    .is('deleted_at', null);

  const urls: Record<string, { url: string; mimeType: string }> = {};

  // Grouped by bucket so each bucket needs one signing call, not one per file.
  const byBucket = new Map<string, typeof documents>();
  for (const doc of documents ?? []) {
    const list = byBucket.get(doc.storage_bucket) ?? [];
    list.push(doc);
    byBucket.set(doc.storage_bucket, list);
  }

  for (const [bucket, docs] of byBucket) {
    if (!docs) continue;
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrls(docs.map((d) => d.storage_path), EXPIRY_SECONDS);

    for (const signed of data ?? []) {
      const match = docs.find((d) => signed.path === d.storage_path);
      if (match && signed.signedUrl) {
        urls[match.id] = { url: signed.signedUrl, mimeType: match.mime_type };
      }
    }
  }

  // One audit row per document actually handed over.
  const delivered = Object.keys(urls);
  if (delivered.length > 0) {
    await supabase.rpc('record_document_views', { p_documents: delivered });
  }

  return Response.json(
    { urls, expiresIn: EXPIRY_SECONDS },
    { headers: { 'cache-control': 'no-store, private' } },
  );
}
