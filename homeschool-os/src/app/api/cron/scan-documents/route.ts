import { createServiceClient } from '@/lib/supabase/service';
import { getScanner } from '@/server/scanner';

/**
 * The malware-scanning worker.
 *
 * This is the only place in the application that holds service-role
 * credentials, and it is not reachable from a user request: it authenticates
 * against CRON_SECRET, which no browser has. With no CRON_SECRET configured it
 * refuses to run at all rather than defaulting open.
 *
 * It reads pending documents, asks the configured scanner, and records the
 * verdict through app.record_scan_result - the only path out of `pending`.
 * Until that happens the file's bytes are unreadable by everyone, including
 * the person who uploaded them.
 */

export const dynamic = 'force-dynamic';

const BATCH = 25;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Constant-time-ish: compare full length, never short-circuit on the prefix.
  if (offered.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) {
    diff |= offered.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scanner = getScanner();
  if (scanner.name === 'none') {
    // Deliberately not an error, and deliberately not a no-op that pretends to
    // have worked: nothing is marked clean, and the response says so.
    return Response.json({ scanner: 'none', scanned: 0, note: 'no scanner configured' });
  }

  const service = createServiceClient();

  const { data: pending, error } = await service
    .from('documents')
    .select('id, storage_bucket, storage_path, mime_type')
    .eq('scan_status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (error) {
    return Response.json({ error: 'could not list pending documents' }, { status: 500 });
  }

  const counts: Record<string, number> = { clean: 0, infected: 0, error: 0 };

  for (const doc of pending ?? []) {
    const verdict = await scanOne(service, scanner, doc);
    counts[verdict] = (counts[verdict] ?? 0) + 1;
  }

  return Response.json({ scanner: scanner.name, scanned: pending?.length ?? 0, counts });
}

type PendingDoc = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
};

async function scanOne(
  service: ReturnType<typeof createServiceClient>,
  scanner: ReturnType<typeof getScanner>,
  doc: PendingDoc,
): Promise<'clean' | 'infected' | 'error'> {
  const download = await service.storage.from(doc.storage_bucket).download(doc.storage_path);

  if (download.error || !download.data) {
    // The row exists but the object does not. Record it rather than leave the
    // document pending forever, which would look like "still processing".
    await service.rpc('record_scan_result', {
      p_document: doc.id,
      p_result: 'error',
      p_detail: 'the stored object could not be read',
    });
    return 'error';
  }

  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const verdict = await scanner.scan(bytes, doc.mime_type);

  // 'skipped' cannot reach here (we returned early for the null scanner), but
  // a future adapter could return it; treat it as "no result to record".
  if (verdict.result === 'skipped') return 'error';

  await service.rpc('record_scan_result', {
    p_document: doc.id,
    p_result: verdict.result,
    ...(verdict.detail ? { p_detail: verdict.detail } : {}),
  });

  return verdict.result;
}
