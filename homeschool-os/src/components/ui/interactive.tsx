'use client';

import * as React from 'react';
import { cx, Button, inputClass } from './primitives';

/* --------------------------------------------------------------- SearchSelect */

export type SearchOption = { value: string; label: string };

/**
 * Searchable single-select. Used for state and county so a long administrative
 * list never feels like a government form. Implements the listbox keyboard
 * contract: Up/Down move, Enter selects, Escape closes.
 */
export function SearchSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  name,
  disabled,
}: {
  id: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = `${id}-listbox`;

  const selected = options.find((o) => o.value === value);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function commit(option: SearchOption) {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const option = filtered[active];
      if (open && option) {
        e.preventDefault();
        commit(option);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        className={inputClass}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle">
        ▾
      </span>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-field bg-surface py-1 shadow-pop ring-1 ring-inset ring-hairline"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-ink-subtle">No matches</li>
          ) : (
            filtered.map((option, i) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(option)}
                  className={cx(
                    'flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[0.9375rem]',
                    i === active ? 'bg-primary-soft text-primary-ink' : 'text-ink',
                  )}
                >
                  {option.label}
                  {option.value === value ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------- Toast */

type Toast = { id: number; message: string; tone: 'default' | 'positive' | 'critical' };
const ToastContext = React.createContext<((message: string, tone?: Toast['tone']) => void) | null>(
  null,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto max-w-sm animate-fade-up rounded-field px-4 py-3 text-sm shadow-pop ring-1 ring-inset',
              t.tone === 'critical'
                ? 'bg-critical-soft text-critical-ink ring-critical/20'
                : t.tone === 'positive'
                  ? 'bg-positive-soft text-positive-ink ring-positive/20'
                  : 'bg-surface text-ink ring-hairline',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  return ctx ?? (() => undefined);
}

/* ------------------------------------------------------------- ConfirmDialog */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm animate-fade-up rounded-card bg-surface p-6 shadow-pop"
      >
        <h2 className="text-heading text-ink">{title}</h2>
        {body ? <p className="mt-2 text-sm text-ink-muted">{body}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- FileDropzone (stub) */

/**
 * Placeholder only. Real upload lands in STEP 8 with the quarantine bucket and
 * the malware-scan hook; this exists so the empty states can show the shape.
 */
export function FileDropzone({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="rounded-card border-2 border-dashed border-hairline bg-surface-sunken/50 px-6 py-10 text-center">
      <span aria-hidden className="text-3xl text-ink-subtle">
        ⬆
      </span>
      <p className="mt-3 font-medium text-ink">{label}</p>
      {hint ? <p className="mt-1 text-sm text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------ AIInsightCard (stub) */

/**
 * Placeholder for STEP 6+. Deliberately framed as a suggestion the human
 * confirms - the AI proposes, never mutates.
 */
export function AIInsightCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-primary-soft p-5 ring-1 ring-inset ring-primary/15">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-ink"
        >
          ✦
        </span>
        <div className="min-w-0">
          <h3 className="text-heading text-primary-ink">{title}</h3>
          <p className="mt-1.5 text-pretty text-sm text-primary-ink/80">{body}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
