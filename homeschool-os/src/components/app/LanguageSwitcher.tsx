'use client';

import { useTransition } from 'react';
import { setLocale } from '@/server/actions/settings';
import { cx } from '@/components/ui/primitives';
import { locales, localeNames } from '@/i18n/routing';

export function LanguageSwitcher({ current }: { current: string }) {
  const [pending, start] = useTransition();

  return (
    <div role="group" aria-label="Language" className={cx('flex gap-2', pending && 'opacity-60')}>
      {locales.map((l) => (
        <form
          key={l}
          action={(fd) => start(() => void setLocale(fd))}
        >
          <input type="hidden" name="locale" value={l} />
          <button
            type="submit"
            aria-pressed={current === l}
            className={cx(
              'min-h-11 rounded-pill px-4 text-[0.9375rem] font-medium ring-1 ring-inset transition-colors',
              current === l
                ? 'bg-primary text-ink-inverse ring-primary'
                : 'bg-surface text-ink ring-hairline hover:bg-surface-sunken',
            )}
          >
            {localeNames[l]}
          </button>
        </form>
      ))}
    </div>
  );
}
