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

    // THE HANDOFF. A document that has just been cleared is the first moment
    // Smart Intake is allowed to look at it, so this is where analysis is
    // queued - after the gate, never before, and never for anything else.
    //
    // Queued here rather than at upload because at upload the answer to "is
    // this safe" is not yet known, and a job created then would be a job
    // waiting for permission it might never get.
    if (verdict === 'clean') await queueAnalysis(service, doc.id);
  }

  return Response.json({ scanner: scanner.name, scanned: pending?.length ?? 0, counts });
}

/**
 * Create the analysis row for a freshly cleared document.
 *
 * Written directly rather than through public.queue_document_analysis because
 * that function is deliberately user-facing: it demands auth.uid(), and the
 * worker has no user. The scan gate it enforces has already been satisfied here
 * by construction - this line is only reached when the scanner said clean.
 *
 * The unique index on (document, version, analysis_version) does the rest: a
 * re-run of this worker, or a parent who also pressed Analyze, collides
 * harmlessly instead of paying twice.
 */
async function queueAnalysis(
  service: ReturnType<typeof createServiceClient>,
  documentId: string,
): Promise<void> {
  const { data: doc } = await service
    .from('documents')
    .select('id, family_id, owner_organization_id, scan_status')
    .eq('id', documentId)
    .maybeSingle();

  // Re-read rather than trust the local variable: between the scan result and
  // here the row could have moved, and this is the last check before a job
  // exists that will hand bytes to a provider.
  if (!doc || doc.scan_status !== 'clean') return;

  const { data: version } = await service
    .from('document_versions')
    .select('id')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  await service.from('document_ai_analysis').insert({
    document_id: documentId,
    document_version_id: version?.id ?? null,
    analysis_version: 1,
    analysis_status: 'queued',
    family_id: doc.family_id,
    organization_id: doc.owner_organization_id,
    provider: 'pending',
    model: 'pending',
    prompt_version: 'smart_intake.v1',
    schema_version: 'document_analysis.v1',
  });
  // A duplicate is expected and is not an error worth reporting: the unique
  // index refusing a second row is the cost control doing its job.
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
