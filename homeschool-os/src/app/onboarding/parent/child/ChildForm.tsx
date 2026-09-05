'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, Field, Input } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';

export function ChildForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.parent.child');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const [first, setFirst] = useState(String(draft.childFirstName ?? ''));
  const [last, setLast] = useState(String(draft.childLastName ?? ''));
  const [preferred, setPreferred] = useState(String(draft.childPreferredName ?? ''));
  const [dob, setDob] = useState(String(draft.childDob ?? ''));

  const valid = first.trim() && last.trim() && dob;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(() =>
      void saveStep(
        'location',
        {
          childFirstName: first.trim(),
          childLastName: last.trim(),
          childPreferredName: preferred.trim(),
          childDob: dob,
        },
        '/onboarding/parent/location',
      ),
    );
  }

  return (
    <form onSubmit={submit}>
      <FormStep
        title={t('title')}
        subtitle={t('subtitle')}
        footer={
          <Button type="submit" size="lg" full disabled={!valid || pending}>
            {tc('continue')}
          </Button>
        }
      >
        <Field label={t('firstName')} htmlFor="firstName">
          <Input
            id="firstName"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="off"
            required
          />
        </Field>
        <Field label={t('lastName')} htmlFor="lastName">
          <Input
            id="lastName"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            autoComplete="off"
            required
          />
        </Field>
        <Field
          label={t('preferredName')}
          hint={t('preferredHint')}
          htmlFor="preferredName"
          optional={tc('optional')}
        >
          <Input
            id="preferredName"
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label={t('dob')} htmlFor="dob">
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
      </FormStep>
    </form>
  );
}
