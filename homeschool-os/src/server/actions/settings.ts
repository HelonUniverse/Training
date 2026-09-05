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
