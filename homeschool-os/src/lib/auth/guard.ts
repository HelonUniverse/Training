import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireUser, type SessionUser } from './session';
import { getActiveContext } from './context';
/**
 * The permission wrapper every authenticated Server Action goes through.
 *
 * It is NOT a second authorization system. RLS remains the authority: every
 * query these actions make is still evaluated against the policies, and an
 * action that slipped past this guard would still be refused by the database.
 * What this adds is a single, explicit place where an action states the
 * authority it believes it needs, so that:
 *
 *   - an action can never accidentally run for an anonymous caller;
 *   - a student-scoped action asks the SAME function the policies use
 *     (app.can_student_action) rather than re-implementing the rule in
 *     TypeScript, which is how the two would drift apart;
 *   - scripts/check-service-role.sh can mechanically prove that every
 *     'use server' file is wrapped.
 *
 * The check is delegated to the database on purpose. A client- or server-side
 * reimplementation of the capability matrix would be a second source of truth,
 * which STEP 2.5 explicitly rules out.
 */
export async function requirePermission(options?: {
  student?: string;
  resource?: string;
  action?: string;
  organization?: string;
}): Promise<SessionUser> {
  const user = await requireUser();

  // Student-scoped: ask app.can_student_action, the same predicate the RLS
  // policies call. Never a local guess.
  if (options?.student && options.resource && options.action) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('can_student_action', {
      p_student: options.student,
      p_resource: options.resource,
      p_action: options.action,
    });
    if (error || data !== true) {
      throw new Error('not permitted');
    }
  }

  // Organization-scoped: the caller must actually hold this context, and the
  // context list is itself RLS-derived.
  if (options?.organization) {
    const context = await getActiveContext();
    if (context?.kind !== 'organization' || context.organizationId !== options.organization) {
      throw new Error('not permitted');
    }
  }

  return user;
}
