'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cx } from '@/components/ui/primitives';
import type { AppContext } from '@/lib/auth/session';

/**
 * Switching context changes navigation, dashboard and data scope. Parent-owned
 * family records and organization administration are never merged into one
 * ambiguous view - you are always in exactly one of them.
 */
export function ContextSwitcher({
  contexts,
  active,
}: {
  contexts: AppContext[];
  active: AppContext | null;
}) {
  const t = useTranslations('context');
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

  function label(c: AppContext) {
    return c.kind === 'parent' ? t('personal') : c.organizationName;
  }
  function sub(c: AppContext) {
    return c.kind === 'parent' ? t('parentRole') : c.role.replace('_', ' ');
  }

  function go(c: AppContext) {
    setOpen(false);
    // The cookie is a UI preference only. Every query is still RLS-scoped, so a
    // forged value cannot widen access - it can only pick a workspace you have.
    document.cookie = `hos-context=${
      c.kind === 'parent' ? `parent:${c.familyId}` : `org:${c.organizationId}`
    }; path=/; max-age=31536000; samesite=lax`;
    router.push(c.kind === 'parent' ? '/app/home' : '/app/org/home');
    router.refresh();
  }

  if (contexts.length === 0) return null;

  const single = contexts.length === 1;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !single && setOpen((o) => !o)}
        aria-expanded={single ? undefined : open}
        aria-haspopup={single ? undefined : 'menu'}
        disabled={single}
        className={cx(
          'flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left transition-colors',
          single ? 'cursor-default' : 'hover:bg-surface-sunken',
        )}
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-semibold text-primary-ink"
        >
          {active ? label(active).slice(0, 1).toUpperCase() : '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {active ? label(active) : '—'}
          </span>
          <span className="block truncate text-xs capitalize text-ink-subtle">
            {active ? sub(active) : ''}
          </span>
        </span>
        {!single ? (
          <span aria-hidden className="text-ink-subtle">
            ⇅
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-card bg-surface py-1.5 shadow-pop ring-1 ring-inset ring-hairline"
        >
          <p className="px-3 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            {t('yourWorkspaces')}
          </p>
          {contexts.map((c) => {
            const key = c.kind === 'parent' ? c.familyId : c.organizationId;
            const isActive =
              active &&
              active.kind === c.kind &&
              (c.kind === 'parent'
                ? active.kind === 'parent' && active.familyId === c.familyId
                : active.kind === 'organization' && active.organizationId === c.organizationId);
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => go(c)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-sunken"
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-xs font-semibold text-ink-muted"
                >
                  {label(c).slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{label(c)}</span>
                  <span className="block truncate text-xs capitalize text-ink-subtle">{sub(c)}</span>
                </span>
                {isActive ? (
                  <span aria-hidden className="text-primary">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
