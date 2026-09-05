'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { completeOrganizationOnboarding, type ActionState } from '@/server/actions/onboarding';
import { Button, FormError } from '@/components/ui/primitives';
import { FormStep, SelectPill } from '@/components/ui/patterns';
import { ORG_GOALS } from '@/lib/reference';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function OrgGoalsForm() {
  const t = useTranslations('onboarding.organization.goals');
  const tg = useTranslations('orgGoals');
  const tcta = useTranslations('onboarding.organization');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(
    completeOrganizationOnboarding,
    undefined,
  );
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(g: string) {
    setSelected((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]));
  }

  return (
    <form action={action}>
      {selected.map((g) => (
        <input key={g} type="hidden" name="goals" value={g} />
      ))}
      <FormStep
        title={t('title')}
        subtitle={t('subtitle')}
        footer={
          <div className="space-y-4">
            {state?.error ? <FormError>{tErr(state.error)}</FormError> : null}
            <Submit label={tcta('cta')} />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {ORG_GOALS.map((g) => (
            <SelectPill
              key={g}
              label={tg(g)}
              selected={selected.includes(g)}
              onToggle={() => toggle(g)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSelected(selected.length === ORG_GOALS.length ? [] : [...ORG_GOALS])}
          className="text-sm font-medium text-primary hover:underline"
        >
          {selected.length === ORG_GOALS.length ? '—' : 'All'}
        </button>
      </FormStep>
    </form>
  );
}
