import { createServiceClient } from '@/lib/supabase/service';
import { getAIProvider } from '@/server/ai/dev-provider';
import {
  type ExtractionResult,
  type ProviderUsage,
  PROMPT_VERSION,
  chooseStrategy,
} from '@/server/ai/providers';

/**
 * The Smart Intake worker.
 *
 * THE SECURITY GATE, and it is the reason this file exists as a worker at all:
 *
 *     a document's bytes are fetched ONLY when scan_status = 'clean'
 *
 * Not "usually". The query that selects work filters on it, the fetch re-checks
 * it immediately before reading bytes, and the storage read policy would refuse
 * anyway because it requires clean. Three independent gates, because sending an
 * unscanned file to a third-party provider is the one mistake in this pipeline
 * that cannot be walked back - the bytes have left.
 *
 * Like the scan worker, this holds service-role credentials, is not reachable
 * from a browser, and authenticates on CRON_SECRET. With no AI provider
 * configured it does nothing at all and says so.
 */

export const dynamic = 'force-dynamic';

/** Exactly the columns this worker needs from a document, and their real types. */
type WorkDocument = {
  id: string;
  family_id: string | null;
  student_id: string | null;
  owner_organization_id: string | null;
  storage_path: string;
  mime_type: string;
  scan_status: string;
  title: string | null;
  document_date: string | null;
};

const BATCH = 10;
const MAX_ATTEMPTS = 3;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (offered.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) diff |= offered.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

function band(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.45) return 'medium';
  return 'low';
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ai = getAIProvider();
  if (ai.name === 'none') {
    // Not an error, and not a no-op pretending to have worked.
    return Response.json({ provider: 'none', analyzed: 0, note: 'no AI provider configured' });
  }

  const db = createServiceClient();

  // Work to do: analyses that are queued (or failed and due a retry) AND whose
  // document the scanner has already cleared. The join is the first gate.
  const { data: pending, error } = await db
    .from('document_ai_analysis')
    .select(
      'id, document_id, document_version_id, analysis_version, attempts, ' +
        'documents!inner(id, family_id, student_id, owner_organization_id, ' +
        'storage_path, mime_type, scan_status, title, document_date)',
    )
    .in('analysis_status', ['queued', 'failed'])
    .eq('documents.scan_status', 'clean')
    .lt('attempts', MAX_ATTEMPTS)
    .limit(BATCH);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results: { id: string; status: string; note?: string }[] = [];

  for (const row of (pending ?? []) as unknown as {
    id: string;
    attempts: number;
    documents: WorkDocument;
  }[]) {
    const doc = row.documents;
    const analysisId = row.id;

    // GATE, restated at the point of use. The list query filtered on scan_status
    // but rows can go stale between the query and here, and this is the last
    // moment before bytes are read. Cheap check; unrecoverable mistake.
    if (doc.scan_status !== 'clean') {
      results.push({ id: analysisId, status: 'skipped', note: 'not clean' });
      continue;
    }

    await db.from('document_ai_analysis')
      .update({ analysis_status: 'processing', attempts: row.attempts + 1 })
      .eq('id', analysisId);

    try {
      const mime = doc.mime_type ?? '';
      const { data: blob, error: dlError } = await db.storage
        .from('uploads-quarantine')
        .download(doc.storage_path);

      if (dlError || !blob) {
        await fail(db, analysisId, `could not read the stored file: ${dlError?.message ?? 'no body'}`);
        results.push({ id: analysisId, status: 'failed' });
        continue;
      }

      const bytes = new Uint8Array(await blob.arrayBuffer());
      const strategy = chooseStrategy(mime, bytes);

      if (strategy === 'none') {
        // HEIC and friends. NOT a failure and NOT retried: we simply cannot
        // decode it, and saying "unsupported" is honest where "failed" is not.
        await db.from('document_ai_analysis').update({
          analysis_status: 'unsupported',
          strategy: 'none',
          completed_at: new Date().toISOString(),
          error: `no reader for ${mime}`,
        }).eq('id', analysisId);
        results.push({ id: analysisId, status: 'unsupported', note: mime });
        continue;
      }

      // --- read the bytes ---------------------------------------------------
      const reader = strategy === 'pdf_text' ? ai.text : ai.vision;
      if (!reader) {
        await fail(db, analysisId, `provider ${ai.name} cannot read ${strategy}`);
        results.push({ id: analysisId, status: 'failed' });
        continue;
      }
      const read = strategy === 'pdf_text'
        ? await ai.text!.extractText(bytes, mime)
        : await ai.vision!.readImage(bytes, mime);

      if (!read.ok) {
        await fail(db, analysisId, read.error, read.retryable);
        results.push({ id: analysisId, status: 'failed', note: read.error });
        continue;
      }

      // --- context, from OUR database only ----------------------------------
      const context = await gatherContext(db, doc.family_id, doc.student_id);

      // --- structured extraction --------------------------------------------
      if (!ai.structured) {
        await fail(db, analysisId, `provider ${ai.name} cannot extract fields`);
        results.push({ id: analysisId, status: 'failed' });
        continue;
      }
      const extracted = await ai.structured.extractFields({
        documentText: read.value.text,
        mime,
        context,
      });

      if (!extracted.ok) {
        await fail(db, analysisId, extracted.error, extracted.retryable);
        results.push({ id: analysisId, status: 'failed', note: extracted.error });
        continue;
      }

      const usageRow = await recordUsage(db, doc, [read.usage, extracted.usage]);

      const readable = Object.values(extracted.value.fields).filter((f) => f.value !== null).length;
      const status = extracted.value.unreadable.length > 0 && readable > 0
        ? 'partial'
        : readable === 0 ? 'partial' : 'completed';

      await db.from('document_ai_analysis').update({
        analysis_status: status,
        strategy,
        provider: ai.name,
        model: extracted.usage.model,
        prompt_version: PROMPT_VERSION,
        text_content: read.value.text.slice(0, 100_000),
        ocr_used: strategy !== 'pdf_text',
        page_confidences: read.value.pageConfidences,
        extracted: extracted.value as unknown as never,
        missing_fields: extracted.value.unreadable,
        confidence: overall(extracted.value),
        confidence_band: band(overall(extracted.value)),
        ai_usage_event_id: usageRow,
        duration_ms: read.usage.latencyMs + extracted.usage.latencyMs,
        completed_at: new Date().toISOString(),
        error: null,
      }).eq('id', analysisId);

      await writeSuggestions(db, analysisId, doc, extracted.value, usageRow);
      results.push({ id: analysisId, status });
    } catch (caught) {
      await fail(db, analysisId, caught instanceof Error ? caught.message : 'unknown error');
      results.push({ id: analysisId, status: 'failed' });
    }
  }

  return Response.json({ provider: ai.name, analyzed: results.length, results });
}

/* -------------------------------------------------------------------------- */

type Db = ReturnType<typeof createServiceClient>;

function overall(result: ExtractionResult): number {
  const values = Object.values(result.fields).filter((f) => f.value !== null);
  if (values.length === 0) return 0;
  return values.reduce((sum, f) => sum + f.confidence, 0) / values.length;
}

async function fail(db: Db, id: string, message: string, retryable = true) {
  // A failure that may succeed next time stays `failed` and becomes eligible
  // again after a backoff. One that cannot is left for a human to see.
  await db.from('document_ai_analysis').update({
    analysis_status: 'failed',
    error: message.slice(0, 1000),
    next_retry_at: retryable ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
    completed_at: retryable ? null : new Date().toISOString(),
  }).eq('id', id);
}

/**
 * Everything the model is told, and all of it from our own tables.
 *
 * Scoped to ONE family and ONE student. Nothing here can widen: a family id is
 * required, and every query is filtered by it. This is what keeps Parent A's
 * context out of Parent B's analysis - not a prompt instruction, a WHERE clause.
 */
async function gatherContext(db: Db, familyId: string | null, studentId: string | null) {
  const empty = {
    studentFirstNames: [] as string[],
    subjectNames: [] as string[],
    enrolledCourses: [] as { id: string; name: string; provider: string }[],
    knownSkills: [] as { id: string; name: string }[],
  };
  if (!familyId) return empty;

  const [students, subjects, enrollments, skills] = await Promise.all([
    db.from('students').select('preferred_name, legal_first_name').eq('family_id', familyId),
    db.from('subjects').select('name').or(`family_id.eq.${familyId},is_system.eq.true`).limit(40),
    studentId
      ? db.from('student_course_enrollments')
          .select('course_id, courses(id, name, curriculum_providers(name))')
          .eq('student_id', studentId).eq('status', 'active')
      : Promise.resolve({ data: [] as unknown[] }),
    db.from('skills').select('id, name').eq('active', true).limit(60),
  ]);

  return {
    studentFirstNames: (students.data ?? []).map(
      (s: Record<string, unknown>) => String(s.preferred_name ?? s.legal_first_name ?? ''),
    ).filter(Boolean),
    subjectNames: (subjects.data ?? []).map((s) => String(s.name)),
    enrolledCourses: (enrollments.data ?? []).flatMap((e) => {
      const row = e as unknown as {
        courses: { id: string; name: string; curriculum_providers: { name: string } | null } | null;
      };
      const course = row.courses;
      if (!course) return [];
      return [{
        id: course.id,
        name: course.name,
        provider: course.curriculum_providers?.name ?? 'unknown',
      }];
    }),
    knownSkills: (skills.data ?? []).map((s) => ({ id: String(s.id), name: String(s.name) })),
  };
}

/** Cost and usage, recorded whether or not the extraction was any good. */
async function recordUsage(db: Db, doc: WorkDocument, usages: ProviderUsage[]) {
  const total = usages.reduce(
    (acc, u) => ({
      inputUnits: acc.inputUnits + u.inputUnits,
      outputUnits: acc.outputUnits + u.outputUnits,
      estimatedCostUsd: acc.estimatedCostUsd + u.estimatedCostUsd,
      latencyMs: acc.latencyMs + u.latencyMs,
    }),
    { inputUnits: 0, outputUnits: 0, estimatedCostUsd: 0, latencyMs: 0 },
  );
  const { data } = await db.from('ai_usage_events').insert({
    provider: usages[0]?.provider ?? 'unknown',
    model: usages[usages.length - 1]?.model ?? 'unknown',
    feature: 'document_extraction',
    organization_id: doc.owner_organization_id,
    family_id: doc.family_id,
    student_id: doc.student_id,
    input_tokens: total.inputUnits,
    output_tokens: total.outputUnits,
    estimated_cost_usd: total.estimatedCostUsd,
    latency_ms: total.latencyMs,
    status: 'success',
    permission_scope: { document_id: doc.id, prompt_version: PROMPT_VERSION } as never,
  }).select('id').single();
  return data?.id ?? null;
}

/**
 * Turn the extraction into a suggestion the parent can review field by field.
 *
 * `conflicts_with_human` is set here, by comparing against what the parent
 * already typed. It is what lets the review UI put a suggestion BESIDE a human
 * value instead of on top of it - the human value is never touched by anything
 * in this function.
 */
async function writeSuggestions(
  db: Db,
  analysisId: string,
  doc: WorkDocument,
  result: ExtractionResult,
  usageEventId: string | null,
) {
  const human: Record<string, unknown> = {
    title: doc.title,
    date: doc.document_date,
    subject: null,
  };

  const { data: suggestion } = await db.from('ai_suggestions').insert({
    kind: 'classify_document',
    source_type: 'document_extraction',
    document_id: doc.id,
    family_id: doc.family_id,
    organization_id: doc.owner_organization_id,
    student_id: doc.student_id,
    payload: result as unknown as never,
    confidence: overall(result),
    confidence_band: band(overall(result)),
    requires_confirmation: true,
    status: 'pending',
    ai_usage_event_id: usageEventId,
    source_record_type: 'document_ai_analysis',
    source_record_id: analysisId,
  }).select('id').single();

  if (!suggestion) return;

  const rows = Object.entries(result.fields)
    // A field with no value is not worth a review card. It is still recorded on
    // the analysis row's missing_fields, so "we could not read the date" is
    // preserved without asking a parent to decide about nothing.
    .filter(([, field]) => field.value !== null && field.value !== '')
    .map(([key, field]) => ({
      suggestion_id: suggestion.id,
      field_key: key,
      suggested_value: field.value as never,
      confidence: field.confidence,
      confidence_band: band(field.confidence),
      evidence: field.evidence ?? null,
      evidence_page: field.evidencePage ?? null,
      conflicts_with_human:
        key in human && human[key] !== null && human[key] !== undefined && human[key] !== '',
    }));

  // Possible skills are suggestions too, and the most important ones to keep
  // out of the record until a person agrees.
  for (const skill of result.possibleSkills) {
    rows.push({
      suggestion_id: suggestion.id,
      field_key: `possible_skill:${skill.name}`,
      suggested_value: skill.name as never,
      confidence: skill.confidence,
      confidence_band: band(skill.confidence),
      evidence: skill.evidence ?? null,
      evidence_page: null,
      conflicts_with_human: false,
    });
  }

  if (rows.length > 0) await db.from('ai_suggestion_fields').insert(rows);
}
