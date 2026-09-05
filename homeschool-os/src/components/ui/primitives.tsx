import * as React from 'react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-field font-medium ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover shadow-card',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-hairline hover:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-critical text-white hover:opacity-90',
};

const buttonSizes: Record<ButtonSize, string> = {
  // min-h-11 == 44px, the iOS touch-target minimum.
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[0.9375rem]',
  lg: 'min-h-12 px-5 text-base',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], full && 'w-full', className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Card */

type CardTag = 'div' | 'section' | 'article' | 'li';

export function Card({
  className,
  as: Tag = 'div',
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: CardTag }) {
  return React.createElement(
    Tag,
    {
      ...props,
      className: cx(
        'rounded-card bg-surface p-5 shadow-card ring-1 ring-inset ring-hairline/70',
        className,
      ),
    },
    children,
  );
}

/* --------------------------------------------------------------- PageHeader */

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-sm font-medium text-ink-subtle">{eyebrow}</p>
        ) : null}
        <h1 className="text-title text-balance text-ink sm:text-display">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-prose text-pretty text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/* --------------------------------------------------------------- StatusBadge */

type Tone = 'neutral' | 'positive' | 'attention' | 'critical' | 'info' | 'primary';

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted ring-hairline',
  positive: 'bg-positive-soft text-positive-ink ring-positive/25',
  attention: 'bg-attention-soft text-attention-ink ring-attention/25',
  critical: 'bg-critical-soft text-critical-ink ring-critical/25',
  info: 'bg-info-soft text-info-ink ring-info/25',
  primary: 'bg-primary-soft text-primary-ink ring-primary/20',
};

/**
 * Status is always carried by the text itself, never by colour alone - the
 * label is required. That satisfies "no meaning communicated by color alone".
 */
export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('relative overflow-hidden rounded-field bg-surface-sunken', className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-black/[0.04] to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------- Fields */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
  optional?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-ink-subtle">({optional})</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-critical-ink">
          <span aria-hidden className="mt-px">⚠</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-field border-0 bg-surface px-3.5 py-2.5 text-ink ' +
  'shadow-sm ring-1 ring-inset ring-hairline placeholder:text-ink-subtle ' +
  'focus:ring-2 focus:ring-inset focus:ring-primary min-h-11 text-base';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputClass, className)} {...props} />;
  },
);

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cx(inputClass, 'pr-10', className)} {...props} />;
});

/* --------------------------------------------------------------- FormError */

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-field bg-critical-soft px-3.5 py-3 text-sm text-critical-ink ring-1 ring-inset ring-critical/20"
    >
      <span aria-hidden className="mt-px">⚠</span>
      <span>{children}</span>
    </div>
  );
}
