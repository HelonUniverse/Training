'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { updatePassword, type ActionState } from '@/server/actions/auth';
import { Button, Field, Input, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function ResetForm() {
  const t = useTranslations('auth.reset');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}
      <Field label={t('password')} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label={t('confirm')} htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Submit label={t('submit')} />
    </form>
  );
}
