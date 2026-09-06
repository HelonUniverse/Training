'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';
import type { Database } from '@/types/database.generated';

type Rpc = Database['public']['Functions'];
type DocumentCategory = NonNullable<Rpc['register_document']['Args']['p_category']>;
type ReadingType = NonNullable<Rpc['log_reading']['Args']['p_reading_type']>;
type ActivityKind = NonNullable<Rpc['log_activity']['Args']['p_kind']>;

/**
 * Capture: the one thing this product has to make effortless.
 *
 * WHERE THE BYTES GO. The file itself never passes through a Server Action -
 * action requests are capped at 1MB, and a photo of a worksheet is routinely
 * larger. The browser uploads straight to the quarantine bucket using the
 * user's OWN session, so the storage insert policy ("first path segment must be
 * a family or organization you belong to") is what authorises the write. Then
 * these actions record what was uploaded.
 *
 * WHAT IS CLASSIFIED, AND BY WHOM. Every category, subject and date below comes
 * from the person capturing. Nothing here infers, guesses, or labels anything
 * on their behalf. Smart Intake arrives later; until it does, the UI says so
 * rather than implying an analysis happened.
 *
 * AUTHORIZATION. requirePermission asks app.can_student_action - the same
 * predicate the RLS policies call - and then every statement runs again under
 * RLS as the user. The check here exists to produce a clear error, not to be
 * the authority.
 */

export type CaptureKind = 'schoolwork' | 'project' | 'activity' | 'book' | 'document';

/** One file the browser has already written to the quarantine bucket. */
export type UploadedFile = {
  path: string;
  filename: string;
  mime: string;
  bytes: number;
  sha256: string;
};

export type CaptureInput = {
  kind: CaptureKind;
  studentId: string;
  title: string;
  occurredOn: string;
  subjectId?: string | null;
  description?: string | null;
  minutes?: number | null;
  /** Book flow only. */
  author?: string | null;
  pages?: number | null;
  readingType?: ReadingType | null;
  /** Activity flow only. */
  activityKind?: ActivityKind | null;
  /** Document flow only. */
  category?: DocumentCategory | null;
  files: UploadedFile[];
};

export type CaptureResult =
  | { ok: true; itemId: string | null; documentIds: string[]; duplicates: number }
  | { ok: false; error: string };

/** Which capability each flow needs. Stated once, so it cannot drift per-branch. */
const REQUIRED: Record<CaptureKind, { resource: string; action: string }> = {
  schoolwork: { resource: 'portfolio', action: 'create' },
  project: { resource: 'portfolio', action: 'create' },
  activity: { resource: 'activity_log', action: 'create' },
  book: { resource: 'reading_log', action: 'create' },
  document: { resource: 'document', action: 'create' },
};

const BUCKET = 'uploads-quarantine';

/**
 * Has this exact file already been saved?
 *
 * Scoped to what the caller can already read (find_duplicate_document is
 * SECURITY INVOKER), so a hash held by another household matches nothing. The
 * answer can only ever be about the caller's own records.
 */
export async function checkDuplicate(
  sha256: string,
): Promise<{ id: string; title: string | null; filename: string; date: string | null } | null> {
  await requirePermission();
  if (!/^[0-9a-f]{64}$/i.test(sha256)) return null;

  const supabase = await createClient();
  const { data } = await supabase.rpc('find_duplicate_document', { p_sha256: sha256.toLowerCase() });
  const row = data?.[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    filename: row.original_filename,
    date: row.document_date,
  };
}

/**
 * Record one capture: the uploaded files, then the thing they are evidence of.
 *
 * Several files produce ONE entry. A field trip photographed six times is one
 * afternoon, not six portfolio items, and the timeline would be unreadable if
 * it were otherwise.
 */
export async function saveCapture(input: CaptureInput): Promise<CaptureResult> {
  const need = REQUIRED[input.kind];
  if (!need) return { ok: false, error: 'capture.errors.unknownKind' };

  try {
    await requirePermission({
      student: input.studentId,
      resource: need.resource,
      action: need.action,
    });
  } catch {
    return { ok: false, error: 'capture.errors.notPermitted' };
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'capture.errors.titleRequired' };

  const supabase = await createClient();

  // The student's family scopes the document rows. Read through RLS, so this
  // fails closed for a student the caller cannot see.
  const { data: student } = await supabase
    .from('students')
    .select('family_id')
    .eq('id', input.studentId)
    .maybeSingle();

  if (!student?.family_id) return { ok: false, error: 'capture.errors.notPermitted' };

  const documentIds: string[] = [];
  let duplicates = 0;

  for (const file of input.files) {
    const { data, error } = await supabase.rpc('register_document', {
      p_student: input.studentId,
      p_family: student.family_id,
      p_bucket: BUCKET,
      p_path: file.path,
      p_filename: file.filename,
      p_mime: file.mime,
      p_bytes: file.bytes,
      p_sha256: file.sha256,
      p_title: title,
      p_category: input.category ?? categoryFor(input.kind),
      // Nothing an upload creates is visible outside the family by default.
      // Sharing is a separate, deliberate act.
      p_visibility: 'family_private',
      p_document_date: input.occurredOn,
    });

    if (error || !data) return { ok: false, error: 'capture.errors.saveFailed' };

    const result = data as unknown as { id: string | null; duplicate: boolean };
    if (result.duplicate) {
      duplicates += 1;
      // The bytes we just uploaded are redundant; the family already has them.
      // Remove the orphan so quarantine does not accumulate identical objects.
      await supabase.storage.from(BUCKET).remove([file.path]);
    }
    if (result.id) documentIds.push(result.id);
  }

  try {
    const itemId = await createEntry(supabase, input, title, documentIds);
    revalidatePath('/app', 'layout');
    return { ok: true, itemId, documentIds, duplicates };
  } catch {
    return { ok: false, error: 'capture.errors.saveFailed' };
  }
}

/**
 * A starting category, taken from the flow the person chose - which is still
 * their classification, not an inference about the file. Every capture screen
 * shows it and lets them change it before saving.
 */
function categoryFor(kind: CaptureKind): DocumentCategory {
  switch (kind) {
    case 'schoolwork':
      return 'worksheet';
    case 'project':
      return 'student_work';
    default:
      return 'unclassified';
  }
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function createEntry(
  supabase: Client,
  input: CaptureInput,
  title: string,
  documentIds: string[],
): Promise<string | null> {
  const occurredOn = input.occurredOn;

  // Optional arguments are OMITTED rather than passed as null: every RPC
  // parameter that may be absent carries `default null` in SQL, and the
  // generated types model a parameter's type but not its nullability.
  const subject = input.subjectId ? { p_subject: input.subjectId } : {};
  const description = input.description?.trim()
    ? { p_description: input.description.trim() }
    : {};
  const minutes = typeof input.minutes === 'number' ? { p_minutes: input.minutes } : {};

  if (input.kind === 'book') {
    const { data, error } = await supabase.rpc('log_reading', {
      p_student: input.studentId,
      p_book_title: title,
      p_reading_type: input.readingType ?? 'independent',
      p_started_on: occurredOn,
      ...minutes,
      ...(input.author?.trim() ? { p_author: input.author.trim() } : {}),
      ...(typeof input.pages === 'number' ? { p_pages: input.pages } : {}),
      ...(input.description?.trim() ? { p_notes: input.description.trim() } : {}),
      ...(documentIds[0] ? { p_cover_doc: documentIds[0] } : {}),
    });
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  if (input.kind === 'activity') {
    const { data, error } = await supabase.rpc('log_activity', {
      p_student: input.studentId,
      p_title: title,
      p_kind: input.activityKind ?? 'other',
      p_date: occurredOn,
      p_document_ids: documentIds,
      ...subject,
      ...description,
      ...minutes,
    });
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  if (input.kind === 'document') {
    // A document filed on its own is evidence in the Documents view. It does
    // not invent a portfolio story the parent did not write.
    return null;
  }

  const { data, error } = await supabase.rpc('create_portfolio_item', {
    p_student: input.studentId,
    p_title: title,
    p_occurred_on: occurredOn,
    p_activity_type: input.kind === 'project' ? 'project' : 'worksheet',
    p_category: 'work_sample',
    p_document_ids: documentIds,
    p_visibility: 'family',
    ...subject,
    ...description,
  });
  if (error) throw new Error(error.message);
  return data ?? null;
}
