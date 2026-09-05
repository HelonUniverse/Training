import * as React from 'react';
import Link from 'next/link';
import { Card, StatusBadge, cx } from './primitives';

/* --------------------------------------------------------------- EmptyState */

/**
 * Empty states are a core part of the product, not a fallback. Every one
 * answers: what is this, why would I use it, what should I do next.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-card bg-surface text-center ring-1 ring-inset ring-hairline/70',
        compact ? 'px-6 py-10' : 'px-6 py-14 sm:px-10',
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl text-primary-ink"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-heading text-balance text-ink">{title}</h2>
      {body ? <p className="mt-2 max-w-prose text-pretty text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- StatCard */

/**
 * A stat with no meaningful number shows a human state, never "0%".
 * `value` is for real counts; `state` is for "Getting started" etc.
 */
export function StatCard({
  label,
  value,
  state,
  tone = 'neutral',
  action,
  icon,
}: {
  label: string;
  value?: number | string;
  state?: string;
  tone?: 'neutral' | 'positive' | 'attention' | 'primary';
  action?: { href: string; label: string };
  icon?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          {icon ? (
            <span aria-hidden className="text-lg text-ink-subtle">
              {icon}
            </span>
          ) : null}
        </div>
        <div className="mt-2">
          {value !== undefined ? (
            <p className="text-display tabular-nums text-ink">{value}</p>
          ) : (
            <StatusBadge tone={tone === 'neutral' ? 'neutral' : tone}>{state}</StatusBadge>
          )}
        </div>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:text-primary-hover hover:underline"
        >
          {action.label}
          <span aria-hidden className="ml-1">
            →
          </span>
        </Link>
      ) : null}
    </Card>
  );
}

/* --------------------------------------------------------------- ActionCard */

export function ActionCard({
  title,
  body,
  href,
  icon,
  selected,
  onClick,
  as = 'link',
}: {
  title: string;
  body?: string;
  href?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  as?: 'link' | 'button';
}) {
  const inner = (
    <>
      {icon ? (
        <span
          aria-hidden
          className={cx(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-colors',
            selected ? 'bg-primary text-ink-inverse' : 'bg-primary-soft text-primary-ink',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="block text-heading text-ink">{title}</span>
      {body ? <span className="mt-1.5 block text-pretty text-sm text-ink-muted">{body}</span> : null}
    </>
  );

  const className = cx(
    'group flex h-full w-full flex-col rounded-card bg-surface p-5 text-left shadow-card',
    'ring-1 ring-inset transition-all duration-150',
    'hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2',
    selected ? 'ring-2 ring-primary' : 'ring-hairline/70 hover:ring-primary/40',
  );

  if (as === 'button' || onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href ?? '#'} className={className}>
      {inner}
    </Link>
  );
}

/* -------------------------------------------------------------- ProgressCard */

export function ProgressCard({
  label,
  done,
  total,
  children,
}: {
  label: string;
  done: number;
  total: number;
  children?: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-sm tabular-nums text-ink-muted">{`${done} / ${total}`}</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
        className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-sunken"
      >
        <div
          className="h-full rounded-pill bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}

/* -------------------------------------------------- OnboardingProgress bar */

export function OnboardingProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-medium text-ink-subtle">{label}</p>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cx(
              'h-1.5 flex-1 rounded-pill transition-colors duration-300',
              i < current ? 'bg-primary' : 'bg-hairline',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ FormStep */

export function FormStep({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h1 className="text-title text-balance text-ink sm:text-display">{title}</h1>
      {subtitle ? <p className="mt-3 max-w-prose text-pretty text-ink-muted">{subtitle}</p> : null}
      <div className="mt-8 space-y-5">{children}</div>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- SelectPill */

/** Multi-select chip used for subjects and goals. */
export function SelectPill({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cx(
        'inline-flex min-h-11 items-center gap-2 rounded-pill px-4 py-2 text-[0.9375rem] font-medium',
        'ring-1 ring-inset transition-colors duration-150',
        selected
          ? 'bg-primary text-ink-inverse ring-primary'
          : 'bg-surface text-ink ring-hairline hover:bg-surface-sunken hover:ring-primary/40',
      )}
    >
      <span
        aria-hidden
        className={cx('text-sm transition-opacity', selected ? 'opacity-100' : 'opacity-0')}
      >
        ✓
      </span>
      {label}
    </button>
  );
}
