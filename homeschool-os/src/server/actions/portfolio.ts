'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';

/**
 * Editing an entry after the fact.
 *
 * PROVENANCE SURVIVES EDITING. Who entered a record, when, through which route,
 * and whether a human confirmed it are facts about how the record came to
 * exist. They stay true no matter how many times the title is corrected, so
 * this action can only ever write the descriptive fields - the provenance
 * columns are not in the patch and cannot be reached through it.
 *
 * That matters beyond tidiness. In an evaluation or an audit, "who recorded
 * this and when" is the question being asked, and an edit that silently
 * reassigned authorship to whoever last fixed a typo would make the whole
 * portfolio worth less as evidence.
 */

export type ActionState = { error?: string; success?: string } | undefined;

export async function updatePortfolioItem(
  itemId: string,
  studentId: string,
  fields: { title: string; description: string | null; occurredOn: string; subjectId: string | null },
): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'portfolio', action: 'update' });
  } catch {
    return { error: 'portfolio.errors.notPermitted' };
  }

  const title = fields.title.trim();
  if (!title) return { error: 'portfolio.errors.titleRequired' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update({
      title,
      description: fields.description?.trim() || null,
      occurred_on: fields.occurredOn,
      subject_id: fields.subjectId,
    })
    .eq('id', itemId);

  if (error) return { error: 'portfolio.errors.saveFailed' };

  revalidatePath('/app/portfolio');
  revalidatePath(`/app/portfolio/${itemId}`);
  return { success: 'portfolio.success.saved' };
}

/**
 * Removes an entry from the timeline.
 *
 * A soft delete: deleted_at is set, the row and its evidence stay. Nothing a
 * family recorded about a child is destroyed because a button was tapped on a
 * phone, and a record under legal hold or inside a retention window is refused
 * outright by the database.
 */
export async function deletePortfolioItem(itemId: string, studentId: string): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'portfolio', action: 'delete' });
  } catch {
    return { error: 'portfolio.errors.notPermitted' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) return { error: 'portfolio.errors.saveFailed' };

  revalidatePath('/app/portfolio');
  return { success: 'portfolio.success.deleted' };
}

/** Adds already-captured evidence to an existing entry, rather than a second entry. */
export async function attachToItem(itemId: string, documentIds: string[]): Promise<ActionState> {
  await requirePermission();
  if (documentIds.length === 0) return undefined;

  const supabase = await createClient();
  const { error } = await supabase.rpc('attach_documents', {
    p_item: itemId,
    p_document_ids: documentIds,
  });

  if (error) return { error: 'portfolio.errors.notPermitted' };

  revalidatePath(`/app/portfolio/${itemId}`);
  return { success: 'portfolio.success.saved' };
}
