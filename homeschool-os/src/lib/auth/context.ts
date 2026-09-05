import { cookies } from 'next/headers';
import { cache } from 'react';
import { getContexts, getStudents, type AppContext } from './session';

export const CONTEXT_COOKIE = 'hos-context';
export const STUDENT_COOKIE = 'hos-student';

/**
 * Resolve the active workspace.
 *
 * The cookie is a *preference*, never an authorization input: the candidate
 * list comes from getContexts(), which is itself RLS-scoped, and a cookie that
 * does not match one of those is ignored. So a forged cookie can at most pick a
 * workspace the user already belongs to.
 */
export const getActiveContext = cache(async (): Promise<AppContext | null> => {
  const contexts = await getContexts();
  if (contexts.length === 0) return null;

  const store = await cookies();
  const raw = store.get(CONTEXT_COOKIE)?.value;

  if (raw) {
    const [kind, id] = raw.split(':');
    const match = contexts.find((c) =>
      kind === 'parent'
        ? c.kind === 'parent' && c.familyId === id
        : c.kind === 'organization' && c.organizationId === id,
    );
    if (match) return match;
  }

  return contexts[0] ?? null;
});

/** The child currently in focus, or 'all'. */
export const getActiveStudent = cache(async () => {
  const students = await getStudents();
  if (students.length === 0) return { students, activeId: null as string | null };

  const store = await cookies();
  const raw = store.get(STUDENT_COOKIE)?.value;

  if (raw === 'all' && students.length > 1) return { students, activeId: 'all' };
  if (raw && students.some((s) => s.id === raw)) return { students, activeId: raw };

  return { students, activeId: students[0]?.id ?? null };
});

export function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
