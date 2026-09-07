'use client';

import { useTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { setStandardsVisibility } from '@/server/actions/settings';

/**
 * "How much of this do you want to see?"
 *
 * Three choices, and the copy for each says what the family will SEE, not what
 * the child will be measured against. `hidden` is offered first and without
 * apology: a homeschool that never looks at a state's map is not a homeschool
 * missing something, and a control whose off switch reads like a warning is a
 * control that pressures people into leaving it on.
 */
const OPTIONS = ['hidden', 'simple', 'detailed'] as const;

export function StandardsVisibility({ current }: { current: 'hidden' | 'simple' | 'detailed' }) {
  const t = useTranslations('standards');
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const data = new FormData();
                data.set('visibility', option);
                await setStandardsVisibility(data);
                setValue(option);
              })
            }
            className={`min-h-[44px] rounded-button px-4 text-sm font-medium disabled:opacity-50 ${
              selected
                ? 'bg-ink text-surface'
                : 'border border-hairline text-ink'
            }`}
          >
            {t(`visibility.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
