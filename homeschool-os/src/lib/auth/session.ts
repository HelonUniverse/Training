import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type AppContext =
  | { kind: 'parent'; familyId: string; familyName: string }
  | { kind: 'organization'; organizationId: string; organizationName: string; role: string };

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  locale: string;
};

/**
 * The signed-in user, or null. Uses getUser() so the token is verified with
 * the auth server rather than trusted from the cookie.
 *
 * `cache` dedupes this within a single render pass.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // profiles is RLS-protected and readable by the user themself.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, locale')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    locale: profile?.locale ?? 'en-US',
  };
});

/** Require a signed-in user or bounce to sign-in, preserving the destination. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) {
    const target = returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : '/sign-in';
    redirect(target);
  }
  return user;
}

/**
 * Every context this user can act in. Read through RLS: the queries below can
 * only return rows the user is actually a member of, so this list is not a
 * client-side guess - it is what the database already permits.
 */
export const getContexts = cache(async (): Promise<AppContext[]> => {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return [];

  const [{ data: families }, { data: memberships }] = await Promise.all([
    supabase
      .from('family_members')
      .select('family_id, families(id, name)')
      .eq('user_id', user.id),
    supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  const contexts: AppContext[] = [];

  for (const row of families ?? []) {
    const family = row.families as { id: string; name: string } | null;
    if (family) {
      contexts.push({ kind: 'parent', familyId: family.id, familyName: family.name });
    }
  }

  for (const row of memberships ?? []) {
    const org = row.organizations as { id: string; name: string } | null;
    if (org) {
      contexts.push({
        kind: 'organization',
        organizationId: org.id,
        organizationName: org.name,
        role: row.role,
      });
    }
  }

  return contexts;
});

/** The students visible in the current parent context, via RLS. */
export const getStudents = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('students')
    .select('id, preferred_name, legal_first_name, legal_last_name, grade_level, date_of_birth')
    .order('date_of_birth', { ascending: true });

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.preferred_name || s.legal_first_name,
    fullName: `${s.legal_first_name} ${s.legal_last_name}`,
    gradeLevel: s.grade_level,
  }));
});
