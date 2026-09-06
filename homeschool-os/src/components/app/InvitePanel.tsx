'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createInvitation, type InviteState } from '@/server/actions/invitations';
import { Button, Card, Field, Input, Select, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function InvitePanel({ kind }: { kind: 'family' | 'org_member' }) {
  const t = useTranslations('org.invite');
  const tErr = useTranslations();
  const [state, action] = useActionState<InviteState, FormData>(createInvitation, undefined);

  return (
    <Card>
      <h2 className="text-heading text-ink">{kind === 'family' ? t('family') : t('staff')}</h2>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="kind" value={kind} />
        {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}
        {/* What the outbox actually recorded, not what we hoped. With no email
            provider configured nothing is sent, and saying "sent" would leave
            an admin waiting for a reply to a message that never existed. */}
        {state?.success ? (
          <p
            role="status"
            className={
              state.delivery === 'sent'
                ? 'rounded-field bg-positive-soft px-3.5 py-3 text-sm text-positive-ink ring-1 ring-inset ring-positive/20'
                : 'rounded-field bg-attention-soft px-3.5 py-3 text-sm text-attention-ink ring-1 ring-inset ring-attention/20'
            }
          >
            {state.delivery === 'sent'
              ? t('sent', { email: state.success })
              : state.delivery === 'skipped'
                ? t('createdNotEmailed', { email: state.success })
                : t('createdSendFailed', { email: state.success })}
          </p>
        ) : null}

        <Field label={t('email')} htmlFor={`email-${kind}`}>
          <Input
            id={`email-${kind}`}
            name="email"
            type="email"
            required
            inputMode="email"
            autoCapitalize="none"
          />
        </Field>

        {kind === 'org_member' ? (
          <Field label={t('role')} htmlFor="role">
            <Select id="role" name="role" defaultValue="teacher">
              <option value="teacher">Teacher</option>
              <option value="tutor">Tutor</option>
              <option value="staff">Staff</option>
              <option value="org_admin">Administrator</option>
            </Select>
          </Field>
        ) : null}

        <Submit label={t('send')} />
      </form>
    </Card>
  );
}
