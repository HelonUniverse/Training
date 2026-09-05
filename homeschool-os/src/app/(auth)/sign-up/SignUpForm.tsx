'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { signUp, type ActionState } from '@/server/actions/auth';
import { Button, Field, Input, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function SignUpForm() {
  const t = useTranslations('auth.signUp');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(signUp, undefined);

  return (
    <form action={action} className="mt-7 space-y-5">
      {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}

      <Field label={t('name')} htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>

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

      <Field label={t('password')} hint={t('passwordHint')} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-hint"
        />
      </Field>

      <Submit label={t('submit')} />
    </form>
  );
}
