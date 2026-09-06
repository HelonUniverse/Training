'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';
import { availableVisibilities, type DocumentVisibility, type SharingContext } from '@/lib/documents/visibility';
import type { Database } from '@/types/database.generated';

/**
 * Documents: filing, correcting, and sharing what has been captured.
 *
 * THE ORIGINAL IS NEVER TOUCHED. app.protect_document_identity() makes the
 * stored file immutable at the database level - path, bucket, hash, size and
 * original filename cannot change after insert - so "editing" here means
 * editing the description of a record, never the evidence itself. A parent can
 * correct a title they mistyped without the photo their child took becoming a
 * different photo.
 */

export type ActionState = { error?: string; success?: string } | undefined;

type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
type DocumentCategory = NonNullable<DocumentUpdate['category']>;
type DocumentPatch = Pick<DocumentUpdate, 'title' | 'category' | 'document_date'>;

/**
 * What sharing options this person can actually grant for this student.
 *
 * Derived, not assumed: the capability comes from app.can_student_action, and
 * the recipients come from RLS-filtered reads. If the answer is "none", the UI
 * shows no sharing controls rather than controls that fail on click.
 */
export async function getSharingContext(studentId: string): Promise<SharingContext> {
  await requirePermission();
  const supabase = await createClient();

  const [{ data: canShare }, { data: enrolments }, { data: grants }] = await Promise.all([
    supabase.rpc('can_student_action', {
      p_student: studentId,
      p_resource: 'document',
      p_action: 'share',
    }),
    supabase
      .from('student_organization_memberships')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .limit(1),
    supabase
      .from('student_access_grants')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .limit(1),
  ]);

  return {
    canShare: canShare === true,
    hasOrganization: (enrolments ?? []).length > 0,
    hasEvaluator: (grants ?? []).length > 0,
  };
}

/**
 * Change who can see a document.
 *
 * The requested visibility is checked against what this caller may actually
 * grant for this student, so a value posted directly at the action - rather
 * than picked from the menu we rendered - is refused here as well as by RLS.
 */
export async function setDocumentVisibility(
  documentId: string,
  studentId: string,
  visibility: DocumentVisibility,
): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'document', action: 'update' });
  } catch {
    return { error: 'documents.errors.notPermitted' };
  }

  const context = await getSharingContext(studentId);
  if (!availableVisibilities(context).includes(visibility)) {
    return { error: 'documents.errors.notPermitted' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('documents')
    .update({ visibility })
    .eq('id', documentId);

  if (error) return { error: 'documents.errors.saveFailed' };

  revalidatePath('/app/documents');
  revalidatePath('/app/portfolio');
  return { success: 'documents.success.visibilityChanged' };
}

/** Correct the description of a record. The file itself is immutable. */
export async function updateDocumentDetails(
  documentId: string,
  studentId: string,
  fields: { title?: string; category?: DocumentCategory; documentDate?: string | null },
): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'document', action: 'update' });
  } catch {
    return { error: 'documents.errors.notPermitted' };
  }

  const patch: DocumentPatch = {};
  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (!title) return { error: 'documents.errors.titleRequired' };
    patch.title = title;
  }
  if (fields.category) patch.category = fields.category;
  if (fields.documentDate !== undefined) patch.document_date = fields.documentDate || null;

  if (Object.keys(patch).length === 0) return undefined;

  const supabase = await createClient();
  const { error } = await supabase.from('documents').update(patch).eq('id', documentId);
  if (error) return { error: 'documents.errors.saveFailed' };

  revalidatePath('/app/documents');
  return { success: 'documents.success.saved' };
}

/** Share one document with one named recipient, optionally until a date. */
export async function shareDocument(
  documentId: string,
  studentId: string,
  recipient: { userId?: string; organizationId?: string; grantId?: string },
  options?: { expiresAt?: string | null; canDownload?: boolean; reason?: string },
): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'document', action: 'share' });
  } catch {
    return { error: 'documents.errors.notPermitted' };
  }

  const named = [recipient.userId, recipient.organizationId, recipient.grantId].filter(Boolean);
  if (named.length !== 1) return { error: 'documents.errors.oneRecipient' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('share_document', {
    p_document: documentId,
    ...(recipient.userId ? { p_with_user: recipient.userId } : {}),
    ...(recipient.organizationId ? { p_with_org: recipient.organizationId } : {}),
    ...(recipient.grantId ? { p_with_grant: recipient.grantId } : {}),
    ...(options?.expiresAt ? { p_expires_at: options.expiresAt } : {}),
    ...(options?.canDownload === false ? { p_can_download: false } : {}),
    ...(options?.reason?.trim() ? { p_reason: options.reason.trim() } : {}),
  });

  if (error) return { error: 'documents.errors.shareFailed' };

  revalidatePath('/app/documents');
  return { success: 'documents.success.shared' };
}

export async function revokeShare(shareId: string): Promise<ActionState> {
  await requirePermission();
  const supabase = await createClient();
  const { error } = await supabase.rpc('revoke_document_share', { p_share: shareId });
  if (error) return { error: 'documents.errors.saveFailed' };

  revalidatePath('/app/documents');
  return { success: 'documents.success.revoked' };
}

/**
 * Search across what the person has captured.
 *
 * METADATA ONLY - titles, filenames, categories, dates. There is no extracted
 * text and no embedding behind this, so it does not pretend to search inside a
 * PDF. The UI says the same thing rather than leaving someone to conclude that
 * their document does not exist because a word inside it was not found.
 */
export async function searchDocuments(query: string, studentId?: string) {
  await requirePermission();

  const term = query.trim();
  if (term.length < 2) return [];

  // PostgREST `or` takes a comma-separated filter list; commas, parentheses and
  // asterisks inside the term would otherwise be read as filter syntax.
  const safe = term.replace(/[,()*\\]/g, ' ').trim();
  if (!safe) return [];

  const supabase = await createClient();
  let request = supabase
    .from('documents')
    .select('id, title, original_filename, category, document_date, created_at, scan_status, student_id')
    .is('deleted_at', null)
    .or(`title.ilike.%${safe}%,original_filename.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (studentId) request = request.eq('student_id', studentId);

  const { data } = await request;
  return data ?? [];
}
