'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cx } from '@/components/ui/primitives';

/** The prominent universal "+" available from every screen. */
export function UniversalAction({
  label,
  actions,
}: {
  label: string;
  actions: Array<{ key: string; href: string }>;
}) {
  const t = useTranslations('actions');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        // The label is visually hidden below `sm`, and the "+" is aria-hidden,
        // so without this the button has no accessible name on a phone.
        aria-label={label}
        className={cx(
          'inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary px-4',
          'text-[0.9375rem] font-medium text-ink-inverse shadow-card',
          'transition-colors hover:bg-primary-hover',
        )}
      >
        <span aria-hidden className="text-lg leading-none">
          +
        </span>
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-card bg-surface py-1.5 shadow-pop ring-1 ring-inset ring-hairline"
        >
          {actions.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center px-4 py-2 text-[0.9375rem] text-ink hover:bg-surface-sunken"
            >
              {t(a.key)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
