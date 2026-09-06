import Link from 'next/link';
import { getTranslations, getFormatter } from 'next-intl/server';
import { getUser } from '@/lib/auth/session';
import { previewInvitation } from '@/server/actions/invitations';
import { AcceptInvitation } from '@/components/app/AcceptInvitation';
import { Card } from '@/components/ui/primitives';

/**
 * Accepting an invitation.
 *
 * The link alone grants nothing. It is a lookup key for an invitation that
 * still has to be pending, and the signed-in account's own email must be the
 * invited one - so a forwarded link, a link found in a shared inbox, or a link
 * pasted into a chat is useless to anyone but its recipient.
 *
 * WHAT THIS PAGE REFUSES TO SAY. A token that is wrong, expired, revoked or
 * already used produces exactly the same screen, because distinguishing them
 * would turn this URL into a way to test whether an invitation exists. It also
 * never says whether the invited address already has an account: someone who
 * finds a link learns nothing about who else is on this platform.
 */
export default async function Page({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params;

  const t = await getTranslations('invitations');
  const format = await getFormatter();

  const user = await getUser();

  // Nothing is looked up for a signed-out visitor. preview_invitation is
  // granted to authenticated only, so asking anyway would return nothing and
  // this page would tell a legitimate recipient their link was invalid.
  if (!user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
        <Card className="text-center">
          <h1 className="text-title text-balance text-ink">{t('signedOut.title')}</h1>
          <p className="mt-3 text-pretty text-ink-muted">{t('signedOut.body')}</p>
          <p className="mt-6">
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-field bg-primary px-5 font-medium text-ink-inverse"
            >
              {t('signInToAccept')}
            </Link>
          </p>
          <p className="mt-4 text-sm text-ink-subtle">{t('signedOut.noAccount')}</p>
        </Card>
      </main>
    );
  }

  const invitation = await previewInvitation(token);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      {!invitation ? (
        <Card className="text-center">
          <h1 className="text-title text-balance text-ink">{t('invalid.title')}</h1>
          <p className="mt-3 text-pretty text-ink-muted">{t('invalid.body')}</p>
          <p className="mt-6">
            <Link href="/" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              {t('invalid.cta')}
            </Link>
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm font-medium text-ink-subtle">{t('eyebrow')}</p>
          <h1 className="mt-1 text-title text-balance text-ink">
            {t('heading', { organization: invitation.organizationName })}
          </h1>
          <p className="mt-3 text-pretty text-ink-muted">
            {t('body', {
              inviter: invitation.invitedBy,
              organization: invitation.organizationName,
            })}
          </p>

          <dl className="mt-6 space-y-2 rounded-field bg-surface-sunken p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t('roleLabel')}</dt>
              <dd className="text-ink">{t(`role.${invitation.role}`)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t('sentToLabel')}</dt>
              <dd className="break-all text-right text-ink">{invitation.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{t('expiresLabel')}</dt>
              <dd className="text-ink">
                {format.dateTime(new Date(invitation.expiresAt), { dateStyle: 'long' })}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            {invitation.emailMatches ? (
              <AcceptInvitation token={token} />
            ) : (
              <div className="rounded-field bg-attention-soft px-4 py-3 text-sm text-attention-ink ring-1 ring-inset ring-attention/20">
                <p className="font-medium">{t('wrongAccount.title')}</p>
                <p className="mt-1">
                  {t('wrongAccount.body', { invited: invitation.email, signedIn: user.email })}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </main>
  );
}
