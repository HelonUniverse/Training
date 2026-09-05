'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { completeParentOnboarding, type ActionState } from '@/server/actions/onboarding';
import { Button, FormError, cx } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { PARENT_GOALS } from '@/lib/reference';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" full disabled={pending}>
      {label}
    </Button>
  );
}

export function GoalsForm() {
  const t = useTranslations('onboarding.parent.goals');
  const tg = useTranslations('goals');
  const tc = useTranslations('common');
  const tErr = useTranslations();
  const [state, action] = useActionState<ActionState, FormData>(
    completeParentOnboarding,
    undefined,
  );
  const [selected, setSelected] = useState<string[]>([]);

  const all = selected.length === PARENT_GOALS.length;

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
            <Submit label={tc('continue')} />
          </div>
        }
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PARENT_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={selected.includes(g)}
              onClick={() => toggle(g)}
              className={cx(
                'flex min-h-14 items-center gap-3 rounded-card px-4 py-3 text-left',
                'ring-1 ring-inset transition-colors',
                selected.includes(g)
                  ? 'bg-primary-soft ring-2 ring-primary'
                  : 'bg-surface ring-hairline hover:bg-surface-sunken',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs',
                  selected.includes(g)
                    ? 'bg-primary text-ink-inverse'
                    : 'ring-1 ring-inset ring-hairline',
                )}
              >
                {selected.includes(g) ? '✓' : ''}
              </span>
              <span className="text-[0.9375rem] font-medium text-ink">{tg(g)}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSelected(all ? [] : [...PARENT_GOALS])}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('allOfTheAbove')}
        </button>
      </FormStep>
    </form>
  );
}
