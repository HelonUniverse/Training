'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, cx } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { ORG_SIZES } from '@/lib/reference';

export function OrgSizeForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.organization.size');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();
  const [size, setSize] = useState(String(draft.orgSize ?? ''));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!size) return;
    start(() => void saveStep('goals', { orgSize: size }, '/onboarding/organization/goals'));
  }

  return (
    <form onSubmit={submit}>
      <FormStep
        title={t('title')}
        subtitle={t('subtitle')}
        footer={
          <Button type="submit" size="lg" full disabled={!size || pending}>
            {tc('continue')}
          </Button>
        }
      >
        <fieldset>
          <legend className="sr-only">{t('title')}</legend>
          <div className="space-y-2.5">
            {ORG_SIZES.map((s) => (
              <label
                key={s}
                className={cx(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-card px-4 py-3',
                  'ring-1 ring-inset transition-colors',
                  size === s
                    ? 'bg-primary-soft ring-2 ring-primary'
                    : 'bg-surface ring-hairline hover:bg-surface-sunken',
                )}
              >
                <input
                  type="radio"
                  name="orgSize"
                  value={s}
                  checked={size === s}
                  onChange={() => setSize(s)}
                  className="h-5 w-5 accent-[rgb(var(--primary))]"
                />
                <span className="text-[0.9375rem] font-medium tabular-nums text-ink">
                  {s} {s === '100+' ? '' : ''}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormStep>
    </form>
  );
}
