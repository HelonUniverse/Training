import { getTranslations } from 'next-intl/server';
import { Card, StatusBadge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { invitationStatus, STATUS_TONE } from '@/lib/invitations';

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

  if (rows.length === 0) {
    return <EmptyState compact icon="✉" title={t('noneTitle')} body={t('noneBody')} />;
  }

  return (
    <Card className="p-0">
      <h2 className="border-b border-hairline px-5 py-4 text-heading text-ink">{t('listTitle')}</h2>
      <ul className="divide-y divide-hairline">
        {rows.map((r) => {
          const status = invitationStatus(r);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{r.email}</p>
                {r.role ? (
                  <p className="mt-0.5 text-sm capitalize text-ink-subtle">
                    {r.role.replace('_', ' ')}
                  </p>
                ) : null}
              </div>
              <StatusBadge tone={STATUS_TONE[status]}>{t(status)}</StatusBadge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
