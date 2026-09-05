'use server';

import { randomBytes, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';
import { getActiveContext } from '@/lib/auth/context';

export type InviteState = { error?: string; success?: string } | undefined;

export type InviteKind = 'family' | 'org_member';
export type InviteRole = 'teacher' | 'staff' | 'tutor' | 'org_admin';

/**
 * Only the hash of the token is stored, so a database read can never yield a
 * usable invitation link. The plaintext token is what would be emailed; email
 * delivery itself lands in a later step.
 */
export async function createInvitation(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const context = await getActiveContext();
  if (context?.kind !== 'organization') return { error: 'auth.errors.generic' };
  // Must genuinely hold this organization context.
  await requirePermission({ organization: context.organizationId });

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const kind = String(formData.get('kind') ?? 'family') as InviteKind;
  const role = String(formData.get('role') ?? '') as InviteRole | '';

  if (!email.includes('@')) return { error: 'auth.errors.invalidEmail' };

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const supabase = await createClient();
  const { error } = await supabase.from('invitations').insert({
    organization_id: context.organizationId,
    email,
    invite_kind: kind,
    role: kind === 'org_member' && role ? role : null,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return { error: 'auth.errors.generic' };

  revalidatePath('/app/org', 'layout');
  return { success: email };
}

export async function cancelInvitation(formData: FormData): Promise<void> {
  await requirePermission();
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/app/org', 'layout');
}
