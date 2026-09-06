'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Field, FormError, Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/interactive';
import { shareDocument, revokeShare, type ShareRecipients } from '@/server/actions/documents';

/**
 * Sharing one document with one named person or program.
 *
 * WHAT IS NOT HERE. No "anyone with the link", no email box for an arbitrary
 * address, no "share with all teachers". Every option in the menu came back
 * from the server as a relationship this child already has, so there is nothing
 * to type that could reach a stranger.
 *
 * WHAT THE WORDS SAY. Recipients are named, the expiry is a date, and download
 * is a separate choice. A parent should be able to read the sentence back and
 * know exactly what they just did.
 */
export function ShareDialog({
  documentId,
  studentId,
  recipients,
  activeShares,
  nameFor,
}: {
  documentId: string;
  studentId: string;
  recipients: ShareRecipients;
  activeShares: Array<{
    id: string;
    expires_at: string | null;
    can_download: boolean;
    shared_with_user_id: string | null;
    shared_with_organization_id: string | null;
    shared_with_grant_id: string | null;
  }>;
  nameFor: Record<string, string>;
}) {
  const t = useTranslations('sharing');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const options = [
    ...recipients.people.map((p) => ({ value: `user:${p.userId}`, label: p.name, group: t('groups.staff') })),
    ...recipients.organizations.map((o) => ({
      value: `org:${o.organizationId}`,
      label: o.name,
      group: t('groups.programs'),
    })),
    ...recipients.evaluators.map((e) => ({
      value: `grant:${e.grantId}`,
      label: e.name,
      group: t('groups.evaluators'),
    })),
  ];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const [type, id] = String(form.get('recipient') ?? '').split(':');
    if (!type || !id) {
      setError(t('errors.chooseRecipient'));
      setPending(false);
      return;
    }

    const result = await shareDocument(
      documentId,
      studentId,
      type === 'user' ? { userId: id } : type === 'org' ? { organizationId: id } : { grantId: id },
      {
        expiresAt: String(form.get('expiresAt') ?? '') || null,
        canDownload: form.get('canDownload') === 'on',
        reason: String(form.get('reason') ?? ''),
      },
    );

    if (result?.error) {
      setError(t(result.error.replace('documents.errors.', 'errors.')));
      setPending(false);
      return;
    }

    toast(t('shared'), 'positive');
    setOpen(false);
    setPending(false);
    router.refresh();
  }

  async function onRevoke(shareId: string) {
    const result = await revokeShare(shareId);
    if (result?.error) {
      toast(t('errors.revokeFailed'), 'critical');
      return;
    }
    toast(t('revoked'), 'positive');
    router.refresh();
  }

  // No relationships means nothing to share with, so no controls at all.
  if (options.length === 0 && activeShares.length === 0) {
    return <p className="text-sm text-ink-muted">{t('noRecipients')}</p>;
  }

  return (
    <div className="space-y-4">
      {activeShares.length > 0 ? (
        <ul className="space-y-2">
          {activeShares.map((share) => {
            const key =
              share.shared_with_user_id ??
              share.shared_with_organization_id ??
              share.shared_with_grant_id ??
              '';
            return (
              <li
                key={share.id}
                className="flex items-center justify-between gap-3 rounded-field bg-surface-sunken px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {nameFor[key] ?? t('someone')}
                  </p>
                  <p className="text-sm text-ink-subtle">
                    {share.expires_at
                      ? t('untilDate', { date: share.expires_at.slice(0, 10) })
                      : t('untilRevoked')}
                    {share.can_download ? '' : ` · ${t('viewOnly')}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRevoke(share.id)}>
                  {t('revoke')}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {options.length === 0 ? null : !open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t('shareWith')}
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-field bg-surface-sunken p-4">
          <Field label={t('recipient')} htmlFor="share-recipient">
            <Select id="share-recipient" name="recipient" defaultValue="">
              <option value="" disabled>
                {t('chooseRecipient')}
              </option>
              {Array.from(new Set(options.map((o) => o.group))).map((group) => (
                <optgroup key={group} label={group}>
                  {options
                    .filter((o) => o.group === group)
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label={t('until')} hint={t('untilHint')} htmlFor="share-expires" optional={tc('optional')}>
            <Input
              id="share-expires"
              name="expiresAt"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="canDownload"
              defaultChecked
              className="mt-0.5 h-5 w-5 rounded border-hairline text-primary focus:ring-primary"
            />
            <span>
              {t('allowDownload')}
              <span className="block text-ink-subtle">{t('allowDownloadHint')}</span>
            </span>
          </label>

          <Field label={t('reason')} htmlFor="share-reason" optional={tc('optional')}>
            <Input id="share-reason" name="reason" maxLength={200} placeholder={t('reasonPlaceholder')} />
          </Field>

          {error ? <FormError>{error}</FormError> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tc('saving') : t('share')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
