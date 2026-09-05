'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, Field, Input, cx } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { currentSchoolYearStart, previousSchoolYearStart } from '@/lib/reference';

type Choice = 'this' | 'previous' | 'custom';

export function StartForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.parent.start');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const thisYear = currentSchoolYearStart();
  const lastYear = previousSchoolYearStart();

  const saved = String(draft.startDate ?? '');
  const initial: Choice =
    saved === thisYear ? 'this' : saved === lastYear ? 'previous' : saved ? 'custom' : 'this';

  const [choice, setChoice] = useState<Choice>(initial);
  const [custom, setCustom] = useState(initial === 'custom' ? saved : '');

  const startDate = choice === 'this' ? thisYear : choice === 'previous' ? lastYear : custom;
  const valid = Boolean(startDate);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(() => void saveStep('subjects', { startDate }, '/onboarding/parent/subjects'));
  }

  const options: Array<{ key: Choice; label: string }> = [
    { key: 'this', label: t('thisYear') },
    { key: 'previous', label: t('lastYear') },
    { key: 'custom', label: t('custom') },
  ];

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
        <fieldset>
          <legend className="sr-only">{t('title')}</legend>
          <div className="space-y-3">
            {options.map((o) => (
              <label
                key={o.key}
                className={cx(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-card px-4 py-3',
                  'ring-1 ring-inset transition-colors',
                  choice === o.key
                    ? 'bg-primary-soft ring-2 ring-primary'
                    : 'bg-surface ring-hairline hover:bg-surface-sunken',
                )}
              >
                <input
                  type="radio"
                  name="when"
                  value={o.key}
                  checked={choice === o.key}
                  onChange={() => setChoice(o.key)}
                  className="h-5 w-5 accent-[rgb(var(--primary))]"
                />
                <span className="text-[0.9375rem] font-medium text-ink">{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {choice === 'custom' ? (
          <Field label={t('customLabel')} htmlFor="customDate">
            <Input
              id="customDate"
              type="date"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
        ) : null}
      </FormStep>
    </form>
  );
}
