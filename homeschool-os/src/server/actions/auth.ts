'use server';

// PRE-AUTH ENTRY POINT - exempt from requirePermission by design.
//
// Sign-in, sign-up and password-reset necessarily run for a caller who has no
// session yet, so there is no permission to check. The two actions here that DO
// carry a session (updatePassword, resendVerification) are authenticated by
// GoTrue itself: supabase.auth.updateUser() and .resend() act on the caller's
// own session and cannot touch another account.
//
// scripts/check-service-role.sh recognises this marker. It is deliberately a
// visible, greppable exemption rather than a silent gap - adding it to a new
// file should show up in review.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type ActionState = { error?: string; success?: string } | undefined;

function messageFor(raw: string): string {
  const m = raw.toLowerCase();
  // Never surface Supabase/GoTrue wording to a parent.
  if (m.includes('invalid login credentials')) return 'auth.errors.invalidCredentials';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'auth.errors.emailInUse';
  if (m.includes('password should be at least') || m.includes('weak password'))
    return 'auth.errors.weakPassword';
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return 'auth.errors.invalidEmail';
  if (m.includes('expired') || m.includes('invalid token')) return 'auth.errors.expiredLink';
  return 'auth.errors.generic';
}

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!fullName) return { error: 'auth.errors.nameRequired' };
  if (!email.includes('@')) return { error: 'auth.errors.invalidEmail' };
  if (password.length < 8) return { error: 'auth.errors.weakPassword' };

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding/role`,
    },
  });

  if (error) return { error: messageFor(error.message) };

  // With email confirmation off, Supabase returns a session and we can go
  // straight to onboarding. With it on, the user must open the link first.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/onboarding/role');

  redirect(`/sign-up/check-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) return { error: 'auth.errors.invalidCredentials' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: messageFor(error.message) };

  revalidatePath('/', 'layout');
  // Only ever redirect to an in-app path - never to an attacker-supplied host.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/app');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email.includes('@')) return { error: 'auth.errors.invalidEmail' };

  const supabase = await createClient();
  const origin = await siteOrigin();

  // Deliberately ignore the error: telling a caller whether an account exists
  // is an account-enumeration oracle. The UI always says "if an account exists".
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return { success: 'sent' };
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'auth.errors.weakPassword' };
  if (password !== confirm) return { error: 'auth.errors.passwordMismatch' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: messageFor(error.message) };

  redirect('/app');
}

export async function resendVerification(): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'auth.errors.generic' };

  const origin = await siteOrigin();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: messageFor(error.message) };
  return { success: 'sent' };
}
