'use server';

import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/guard';
import { getActiveContext } from '@/lib/auth/context';
import { getUser } from '@/lib/auth/session';
import { getEmailProvider } from '@/server/email/provider';
import { invitationMessage, type Locale } from '@/server/email/templates';

/**
 * Invitations, and the email that carries them.
 *
 * THE TOKEN. Only its SHA-256 hash is stored. The plaintext exists for the few
 * milliseconds between generating it and handing it to the email provider, and
 * is deliberately absent from the outbox row: a live invitation token sitting
 * in a table is a credential at rest, and anyone with a database backup could
 * redeem it. That is also why a resend issues a NEW token rather than
 * re-sending the old one, which invalidates the previous link.
 *
 * WHAT THE LINK DOES AND DOES NOT GRANT. Possession of the URL is not enough.
 * accept_invitation additionally requires that the signed-in account's own
 * email match the invited address, so a forwarded link is useless to anyone
 * else, and the role granted is the one stored on the invitation - never a
 * parameter the client can influence.
 */

export type InviteState = { error?: string; success?: string; delivery?: string } | undefined;

export type InviteKind = 'family' | 'org_member';
export type InviteRole = 'teacher' | 'staff' | 'tutor' | 'org_admin';

const TOKEN_BYTES = 32;
const VALID_FOR_DAYS = 14;

async function baseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

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

  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  // Generated here rather than read back: an INSERT ... RETURNING applies the
  // SELECT policy, and a policy that has not yet seen this row returns nothing.
  const invitationId = randomUUID();
  const expiresAt = new Date(Date.now() + VALID_FOR_DAYS * 86400_000);

  const supabase = await createClient();
  const { error } = await supabase.from('invitations').insert({
    id: invitationId,
    organization_id: context.organizationId,
    email,
    invite_kind: kind,
    role: kind === 'org_member' && role ? role : null,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return { error: 'auth.errors.generic' };

  const outcome = await deliverInvitation(invitationId, token, email, expiresAt);

  revalidatePath('/app/org', 'layout');
  return { success: email, delivery: outcome };
}

/**
 * Issues a fresh token for an existing invitation and emails it again.
 *
 * The old link stops working the moment this succeeds, which is the point: a
 * resend is what someone does when the first link went astray.
 */
export async function resendInvitation(formData: FormData): Promise<InviteState> {
  const context = await getActiveContext();
  if (context?.kind !== 'organization') return { error: 'auth.errors.generic' };
  await requirePermission({ organization: context.organizationId });

  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'auth.errors.generic' };

  const supabase = await createClient();
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, email, accepted_at, revoked_at')
    .eq('id', id)
    .maybeSingle();

  if (!invitation || invitation.accepted_at || invitation.revoked_at) {
    return { error: 'invitations.errors.notResendable' };
  }

  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + VALID_FOR_DAYS * 86400_000);

  const { error } = await supabase
    .from('invitations')
    .update({
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', id);

  if (error) return { error: 'auth.errors.generic' };

  const outcome = await deliverInvitation(id, token, invitation.email, expiresAt);
  revalidatePath('/app/org', 'layout');
  return { success: invitation.email, delivery: outcome };
}

/**
 * Queue the outbox row, send, then record what actually happened.
 *
 * A failed send is not swallowed and is not reported as success. With no
 * provider configured the row records 'skipped', and the caller tells the admin
 * the invitation exists but no email went out - which is true, and is far
 * better than a family waiting for a message that was never sent.
 */
async function deliverInvitation(
  invitationId: string,
  token: string,
  email: string,
  expiresAt: Date,
): Promise<string> {
  const supabase = await createClient();
  const user = await getUser();

  const { data: deliveryId, error } = await supabase.rpc('queue_invitation_email', {
    p_invitation: invitationId,
  });
  if (error || !deliveryId) return 'failed';

  const { data: rows } = await supabase
    .from('email_deliveries')
    .select('payload')
    .eq('id', deliveryId)
    .maybeSingle();

  const payload = (rows?.payload ?? {}) as { organization?: string; invited_by?: string };
  const locale: Locale = user?.locale === 'es-US' ? 'es-US' : 'en-US';

  const message = invitationMessage({
    to: email,
    locale,
    organizationName: payload.organization ?? 'Homeschool OS',
    invitedBy: payload.invited_by ?? 'An administrator',
    acceptUrl: `${await baseUrl()}/invite/${token}`,
    expiresAt: expiresAt.toLocaleDateString(locale, { dateStyle: 'long' }),
  });

  const provider = getEmailProvider();
  const outcome = await provider.send(message);

  await supabase.rpc('record_email_result', {
    p_delivery: deliveryId,
    p_status: outcome.status,
    p_provider: outcome.provider,
    ...(outcome.status === 'sent' && outcome.providerId
      ? { p_provider_id: outcome.providerId }
      : {}),
    ...(outcome.status === 'failed' ? { p_error: outcome.error } : {}),
    ...(outcome.status === 'skipped' ? { p_error: outcome.reason } : {}),
  });

  return outcome.status;
}

/**
 * The <form action> form of resendInvitation.
 *
 * A form action must resolve to void; resendInvitation returns a result an
 * interactive caller wants. This wrapper exists so the list can post a plain
 * form (which works without JavaScript) without either function lying about
 * its shape.
 */
export async function resendInvitationForm(formData: FormData): Promise<void> {
  await resendInvitation(formData);
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

/**
 * What the acceptance screen shows before anyone commits to anything.
 *
 * Returns null for a token that is wrong, expired, revoked or already used -
 * all four look identical, so the page cannot be used to probe which
 * invitations exist.
 */
export async function previewInvitation(token: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('preview_invitation', { p_token: token });
  const row = data?.[0];
  if (!row) return null;

  return {
    organizationName: row.organization_name,
    invitedBy: row.invited_by,
    role: row.role,
    kind: row.invite_kind,
    email: row.email,
    expiresAt: row.expires_at,
    emailMatches: row.email_matches,
  };
}

export async function acceptInvitation(token: string): Promise<InviteState> {
  await requirePermission();

  const supabase = await createClient();
  const { error } = await supabase.rpc('accept_invitation', { p_token: token });

  if (error) {
    // The database distinguishes "wrong account" from "invalid link" because
    // the first is worth telling a signed-in person; it reveals nothing they
    // do not already hold, since they had the link.
    const wrongAccount = error.message.includes('different email address');
    return { error: wrongAccount ? 'invitations.errors.wrongAccount' : 'invitations.errors.invalid' };
  }

  revalidatePath('/app', 'layout');
  return { success: 'invitations.success.accepted' };
}
