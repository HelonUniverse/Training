'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';

/**
 * Smart Intake review, and the curriculum a family already uses.
 *
 * THE RULE THAT SHAPES THIS FILE: deciding a suggestion and applying it are two
 * separate writes, and the second one only ever touches a field the human has
 * just agreed to. There is no code path here that copies an AI value over
 * something a parent typed. That is not a convention to remember - `applyField`
 * reads the decision back out of the database and refuses anything that is not
 * `accepted` or `edited`.
 */

export type ActionState = { error?: string; success?: string } | undefined;

/** Queue Smart Intake for a document. Idempotent; safe to call after a capture. */
export async function requestAnalysis(documentId: string, force = false): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('queue_document_analysis', {
    p_document: documentId,
    p_force: force,
  });

  if (error) {
    // The database says "this file has not been checked yet" for a document the
    // scanner has not cleared. That is a normal state a few seconds after an
    // upload, not a fault, and it should not read like one.
    if (error.message.includes('has not been checked')) {
      return { error: 'intake.errors.notScannedYet' };
    }
    return { error: 'intake.errors.couldNotQueue' };
  }

  revalidatePath('/app/documents');
  const created = (data as { created?: boolean } | null)?.created === true;
  return { success: created ? 'intake.queued' : 'intake.alreadyDone' };
}

/**
 * Accept, edit or reject one suggested field.
 *
 * Nothing is applied to the document here. The decision is recorded; applying
 * it is `applyAcceptedFields`, below, and only after this has said yes.
 */
export async function decideField(
  fieldId: string,
  decision: 'accepted' | 'edited' | 'rejected',
  value?: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('decide_suggestion_field', {
    p_field: fieldId,
    p_status: decision,
    p_value: value === undefined ? undefined : (JSON.stringify(value) as never),
  });
  if (error) return { error: 'intake.errors.couldNotDecide' };
  revalidatePath('/app/documents');
  return { success: 'intake.saved' };
}

/**
 * Write the accepted values onto the document.
 *
 * Reads every decision back from the database rather than trusting what the
 * browser posted, and writes ONLY the fields whose decision is accepted or
 * edited. A pending or rejected field contributes nothing, so "the parent left
 * it undecided" and "the parent said no" both leave the record alone.
 */
export async function applyAcceptedFields(
  suggestionId: string,
  documentId: string,
): Promise<ActionState> {
  const supabase = await createClient();

  const { data: fields, error } = await supabase
    .from('ai_suggestion_fields')
    .select('field_key, status, accepted_value')
    .eq('suggestion_id', suggestionId)
    .in('status', ['accepted', 'edited']);

  if (error) return { error: 'intake.errors.couldNotApply' };
  if (!fields || fields.length === 0) return { success: 'intake.nothingToApply' };

  const patch: { title?: string; document_date?: string } = {};
  for (const field of fields) {
    const value = field.accepted_value;
    if (value === null || value === undefined) continue;
    const text = typeof value === 'string' ? value : String(value);
    // Only these two reach the document. `subject`, `topic` and the rest are
    // recorded as decisions and surfaced in the UI, but STEP 5 does not invent
    // new columns on documents to hold them.
    if (field.field_key === 'title') patch.title = text.slice(0, 200);
    if (field.field_key === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(text)) patch.document_date = text;
  }

  if (Object.keys(patch).length > 0) {
    // Through RLS as the caller: documents_update requires uploaded_by =
    // auth.uid(), and protect_scan_state refuses any attempt to touch the scan
    // columns from here even if this patch ever grew one by accident.
    const { error: writeError } = await supabase
      .from('documents')
      .update(patch)
      .eq('id', documentId);
    if (writeError) return { error: 'intake.errors.couldNotApply' };
  }

  // `accepted` is the suggestion-level status for "the human acted on this".
  // There is no separate `applied`: whether each field was used, edited or
  // discarded is recorded per field, which is the finer and truer record.
  await supabase
    .from('ai_suggestions')
    .update({ status: 'accepted', decided_at: new Date().toISOString() })
    .eq('id', suggestionId);

  revalidatePath('/app/documents');
  return { success: 'intake.applied' };
}

/**
 * "Yes, this work shows that skill."
 *
 * The bridge from Smart Intake into the learning record - and the point where
 * it would be easy, and wrong, to also record mastery. It does not.
 */
export async function confirmSkillEvidence(
  studentId: string,
  skillId: string,
  options: { documentId?: string; portfolioItemId?: string; suggestionId?: string } = {},
): Promise<ActionState> {
  try {
    await requirePermission({
      student: studentId,
      resource: 'learning_evidence',
      action: 'create',
    });
  } catch {
    return { error: 'learn.errors.notPermitted' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('confirm_skill_evidence', {
    p_student: studentId,
    p_skill: skillId,
    p_relation: 'demonstrates',
    // `undefined` rather than `null`: these carry SQL defaults, and passing an
    // explicit null would override the default instead of omitting the argument.
    p_portfolio: options.portfolioItemId ?? undefined,
    p_document: options.documentId ?? undefined,
    p_suggestion: options.suggestionId ?? undefined,
  });
  if (error) return { error: 'learn.errors.couldNotConfirm' };

  revalidatePath('/app/learning');
  revalidatePath('/app/documents');
  return { success: 'learn.evidenceRecorded' };
}

/* ========================================================================== */
/*  Curriculum                                                                 */
/* ========================================================================== */

/**
 * Add a curriculum a family already uses.
 *
 * "Another curriculum" always works. A family whose program we have never heard
 * of is the ordinary case, not an edge case, and a product that only accepts
 * curricula from a list it approves of is telling those families they are using
 * the wrong one.
 */
export async function addCurriculum(fields: {
  familyId: string;
  studentId: string;
  courseName: string;
  providerSlug: string | null;
  providerName: string | null;
  subjectId: string | null;
  externalUrl: string | null;
}): Promise<ActionState> {
  try {
    await requirePermission({
      student: fields.studentId,
      resource: 'curriculum',
      action: 'create',
    });
  } catch {
    return { error: 'learn.errors.notPermitted' };
  }

  const name = fields.courseName.trim();
  if (!name) return { error: 'learn.errors.nameRequired' };

  const url = fields.externalUrl?.trim() ?? '';
  if (url && !/^https?:\/\//i.test(url)) return { error: 'learn.errors.badUrl' };

  const supabase = await createClient();
  const { data: courseId, error } = await supabase.rpc('add_family_course', {
    p_family: fields.familyId,
    p_course_name: name,
    p_provider_slug: fields.providerSlug ?? undefined,
    p_provider_name: fields.providerName ?? undefined,
    p_subject: fields.subjectId ?? undefined,
    p_external_url: url || undefined,
  });
  if (error || !courseId) return { error: 'learn.errors.couldNotAdd' };

  // The enrollment is what makes it THIS CHILD's curriculum. `linked` when we
  // have a URL to open, `manual` when we do not - and never `integrated`,
  // because no integration exists.
  const { error: enrollError } = await supabase.from('student_course_enrollments').insert({
    student_id: fields.studentId,
    course_id: courseId as string,
    family_id: fields.familyId,
    subject_id: fields.subjectId,
    integration_mode: url ? 'linked' : 'manual',
    status: 'active',
    started_on: new Date().toISOString().slice(0, 10),
  });
  if (enrollError) return { error: 'learn.errors.couldNotAdd' };

  revalidatePath('/app/learning');
  return { success: 'learn.curriculumAdded' };
}

/** Mark a lesson or a session of work done. The only progress a browser asserts. */
export async function markComplete(
  enrollmentId: string,
  studentId: string,
  lessonId?: string,
): Promise<ActionState> {
  try {
    await requirePermission({ student: studentId, resource: 'curriculum', action: 'update' });
  } catch {
    return { error: 'learn.errors.notPermitted' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('record_manual_completion', {
    p_enrollment: enrollmentId,
    p_lesson: lessonId ?? undefined,
  });
  if (error) return { error: 'learn.errors.couldNotRecord' };

  revalidatePath('/app/learning');
  return { success: 'learn.progressRecorded' };
}
