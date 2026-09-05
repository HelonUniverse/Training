export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export function invitationStatus(row: {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): InvitationStatus {
  if (row.revoked_at) return 'cancelled';
  if (row.accepted_at) return 'accepted';
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  return 'pending';
}

export const STATUS_TONE: Record<InvitationStatus, 'neutral' | 'positive' | 'attention'> = {
  pending: 'attention',
  accepted: 'positive',
  expired: 'neutral',
  cancelled: 'neutral',
};
