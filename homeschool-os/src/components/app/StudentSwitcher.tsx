'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cx } from '@/components/ui/primitives';

export type StudentOption = { id: string; name: string };

/**
 * Changing child changes the whole dashboard context. The router refresh is
 * deliberate: it discards any server-rendered state from the previous child so
 * nothing carries over into forms or, later, AI context.
 */
export function StudentSwitcher({
  students,
  activeId,
  allowAll,
}: {
  students: StudentOption[];
  activeId: string | null;
  allowAll?: boolean;
}) {
  const t = useTranslations('students');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const active = students.find((s) => s.id === activeId);
  const activeLabel = activeId === 'all' ? t('allChildren') : (active?.name ?? '—');

  function select(id: string) {
    setOpen(false);
    document.cookie = `hos-student=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  if (students.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('switcher')}
        className={cx(
          'inline-flex min-h-11 items-center gap-2 rounded-pill bg-surface px-3.5',
          'text-[0.9375rem] font-medium text-ink ring-1 ring-inset ring-hairline',
          'transition-colors hover:bg-surface-sunken',
        )}
      >
        <span className="max-w-[9rem] truncate">{activeLabel}</span>
        <span aria-hidden className="text-ink-subtle">
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-card bg-surface py-1.5 shadow-pop ring-1 ring-inset ring-hairline"
        >
          {students.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              onClick={() => select(s.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[0.9375rem] text-ink hover:bg-surface-sunken"
            >
              <span className="truncate">{s.name}</span>
              {s.id === activeId ? (
                <span aria-hidden className="text-primary">
                  ✓
                </span>
              ) : null}
            </button>
          ))}

          {allowAll && students.length > 1 ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => select('all')}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[0.9375rem] text-ink hover:bg-surface-sunken"
            >
              <span>{t('allChildren')}</span>
              {activeId === 'all' ? (
                <span aria-hidden className="text-primary">
                  ✓
                </span>
              ) : null}
            </button>
          ) : null}

          <div className="my-1 border-t border-hairline" />
          <a
            href="/app/children/new"
            role="menuitem"
            className="flex min-h-11 items-center gap-2 px-4 py-2.5 text-[0.9375rem] font-medium text-primary hover:bg-surface-sunken"
          >
            <span aria-hidden>+</span>
            {t('addChild')}
          </a>
        </div>
      ) : null}
    </div>
  );
}
