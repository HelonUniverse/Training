'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';
import { LOCALE_COOKIE } from '@/i18n/request';
import { isLocale } from '@/i18n/routing';

/**
 * Locale lives in two places on purpose: profiles.locale is the durable record
 * (and travels with the account), the cookie is the fast path so rendering a
 * Server Component needs no database read.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? '');
  if (!isLocale(locale)) return;

  const user = await requirePermission();
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const supabase = await createClient();
  await supabase.from('profiles').update({ locale }).eq('id', user.id);

  revalidatePath('/', 'layout');
}

/**
 * How much standards reference a family wants to see: hidden, simple, detailed.
 *
 * This changes DISPLAY and nothing else. There is deliberately no branch
 * anywhere that reads it and alters a child's skills, evidence, prerequisites
 * or learning path - a preference that quietly changed what a child is taught
 * would be a setting pretending to be a curriculum decision.
 */
export async function setStandardsVisibility(formData: FormData): Promise<void> {
  const visibility = String(formData.get('visibility') ?? '');
  if (!['hidden', 'simple', 'detailed'].includes(visibility)) return;

  await requirePermission();
  const supabase = await createClient();

  // No family id is passed in: RLS decides which family row this reaches, so a
  // posted id could only ever be a way to try somebody else's.
  const { data: families } = await supabase.from('families').select('id');
  for (const family of families ?? []) {
    await supabase
      .from('families')
      .update({ standards_visibility: visibility as 'hidden' | 'simple' | 'detailed' })
      .eq('id', family.id);
  }

  revalidatePath('/app/learning', 'layout');
  revalidatePath('/app/settings');
}
