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
 * The people and programs this document could actually be shared with.
 *
 * Never a directory of everyone on the platform. The list is exactly: staff
 * already assigned to this child, the program the child is enrolled in, and
 * evaluators who already hold an active grant - all read through RLS, so
 * someone with no such relationships gets an empty list and no sharing UI.
 *
 * Showing a recipient the caller cannot reach is worse than showing none: it
 * teaches people that our sharing controls are decorative, and the first time
 * one of them matters they will not read it.
 */
export async function getShareRecipients(studentId: string) {
  await requirePermission();
  const supabase = await createClient();

  const [{ data: staff }, { data: enrolments }, { data: grants }] = await Promise.all([
    supabase
      .from('student_staff_assignments')
      .select('user_id, role, profiles!student_staff_assignments_user_id_fkey(id, full_name, email)')
      .eq('student_id', studentId)
      .eq('active', true),
    supabase
      .from('student_organization_memberships')
      .select('organization_id, organizations(id, name)')
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('student_access_grants')
      .select('id, kind, expires_at, profiles!student_access_grants_grantee_user_id_fkey(id, full_name, email)')
      .eq('student_id', studentId)
      .eq('status', 'active'),
  ]);

  return {
    people: (staff ?? []).flatMap((row) => {
      const profile = row.profiles as { id: string; full_name: string | null; email: string } | null;
      return profile
        ? [{ userId: profile.id, name: profile.full_name ?? profile.email, role: row.role }]
        : [];
    }),
    organizations: (enrolments ?? []).flatMap((row) => {
      const org = row.organizations as { id: string; name: string } | null;
      return org ? [{ organizationId: org.id, name: org.name }] : [];
    }),
    evaluators: (grants ?? []).flatMap((row) => {
      const profile = row.profiles as { id: string; full_name: string | null; email: string } | null;
      return profile
        ? [
            {
              grantId: row.id,
              name: profile.full_name ?? profile.email,
              kind: row.kind,
              expiresAt: row.expires_at,
            },
          ]
        : [];
    }),
  };
}

export type ShareRecipients = Awaited<ReturnType<typeof getShareRecipients>>;

/** Shares currently in force for one document, so they can be seen and undone. */
export async function getActiveShares(documentId: string) {
  await requirePermission();
  const supabase = await createClient();

  const { data } = await supabase
    .from('document_shares')
    .select('id, shared_at, expires_at, can_download, reason, shared_with_user_id, shared_with_organization_id, shared_with_grant_id')
    .eq('document_id', documentId)
    .is('revoked_at', null)
    .order('shared_at', { ascending: false });

  return data ?? [];
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
