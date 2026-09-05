'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { addChild, type ActionState } from '@/server/actions/onboarding';
import { Button, Field, Input, FormError } from '@/components/ui/primitives';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function AddChildForm({ familyId }: { familyId: string }) {
  const t = useTranslations('onboarding.parent.child');
  const tc = useTranslations('common');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(addChild, undefined);

  return (
    <form action={action} className="mt-7 space-y-5">
      <input type="hidden" name="familyId" value={familyId} />
      {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}

      <Field label={t('firstName')} htmlFor="firstName">
        <Input id="firstName" name="firstName" required autoComplete="off" />
      </Field>
      <Field label={t('lastName')} htmlFor="lastName">
        <Input id="lastName" name="lastName" required autoComplete="off" />
      </Field>
      <Field
        label={t('preferredName')}
        hint={t('preferredHint')}
        htmlFor="preferredName"
        optional={tc('optional')}
      >
        <Input id="preferredName" name="preferredName" autoComplete="off" />
      </Field>
      <Field label={t('dob')} htmlFor="dob">
        <Input id="dob" name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} />
      </Field>

      <Submit label={tc('add')} />
    </form>
  );
}
