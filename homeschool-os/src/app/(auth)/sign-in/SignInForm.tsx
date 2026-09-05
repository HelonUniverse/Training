'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { signIn, type ActionState } from '@/server/actions/auth';
import { Button, Field, Input, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations('auth.signIn');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(signIn, undefined);

  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="next" value={next} />
      {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}

      <Field label={t('email')} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          autoCapitalize="none"
        />
      </Field>

      <Field label={t('password')} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Submit label={t('submit')} />

      <p className="text-center">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center px-2 text-sm text-ink-muted hover:text-ink hover:underline"
        >
          {t('forgot')}
        </Link>
      </p>
    </form>
  );
}
