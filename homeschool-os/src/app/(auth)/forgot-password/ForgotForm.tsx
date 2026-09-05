'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { requestPasswordReset, type ActionState } from '@/server/actions/auth';
import { Button, Field, Input, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function ForgotForm() {
  const t = useTranslations('auth.forgot');
  const tErr = useTranslations();
  const [email, setEmail] = useState('');
  const [state, action] = useActionState<ActionState, FormData>(requestPasswordReset, undefined);

  if (state?.success) {
    return (
      <div className="mt-7 text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-xl"
        >
          ✉
        </div>
        <p className="font-medium text-ink">{t('sent')}</p>
        <p className="mt-1.5 text-pretty text-sm text-ink-muted">{t('sentBody', { email })}</p>
        <Link
          href="/sign-in"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t('backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Submit label={t('submit')} />
      <p className="text-center">
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center px-2 text-sm text-ink-muted hover:text-ink hover:underline"
        >
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  );
}
