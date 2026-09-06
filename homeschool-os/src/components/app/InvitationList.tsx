import { getTranslations } from 'next-intl/server';
import { Card, StatusBadge, Button } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { invitationStatus, STATUS_TONE } from '@/lib/invitations';
import { resendInvitationForm, cancelInvitation } from '@/server/actions/invitations';

type Row = {
  id: string;
  email: string;
  role: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};

export async function InvitationList({ rows }: { rows: Row[] }) {
  const t = await getTranslations('org.invite');
  const tr = await getTranslations('invitations.role');

  if (rows.length === 0) {
    return <EmptyState compact icon="✉" title={t('noneTitle')} body={t('noneBody')} />;
  }

  return (
    <Card className="p-0">
      <h2 className="border-b border-hairline px-5 py-4 text-heading text-ink">{t('listTitle')}</h2>
      <ul className="divide-y divide-hairline">
        {rows.map((r) => {
          const status = invitationStatus(r);
          const open = status === 'pending' || status === 'expired';

          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{r.email}</p>
                {r.role ? (
                  // The stored value is an enum. What an admin reads is a word.
                  <p className="mt-0.5 text-sm text-ink-subtle">{tr(r.role)}</p>
                ) : null}
              </div>

              <StatusBadge tone={STATUS_TONE[status]}>{t(status)}</StatusBadge>

              {open ? (
                <div className="flex items-center gap-1">
                  {/* A resend issues a NEW token, which is also what stops a
                      link that went astray from being useful. */}
                  <form action={resendInvitationForm}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="sm" title={t('resendHelp')}>
                      {t('resend')}
                    </Button>
                  </form>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t('cancel')}
                    </Button>
                  </form>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
