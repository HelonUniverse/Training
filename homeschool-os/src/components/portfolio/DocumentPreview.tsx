'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cx } from '@/components/ui/primitives';

/**
 * A family's own photographs, shown as photographs.
 *
 * Every URL here is short-lived and minted per request; there are no permanent
 * public links anywhere in this product. The provider batches the whole page
 * into one call so a timeline of twenty items is one request, not twenty.
 *
 * A file that has not been scanned yet has no URL to fetch - the storage policy
 * will not release its bytes - so those tiles say what is happening instead of
 * showing a broken image.
 */

type Entry = { url: string; mimeType: string };
type Store = Record<string, Entry>;

const PreviewContext = React.createContext<{
  urls: Store;
  request: (id: string) => void;
} | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [urls, setUrls] = React.useState<Store>({});
  const pending = React.useRef<Set<string>>(new Set());
  const asked = React.useRef<Set<string>>(new Set());
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = React.useCallback(async () => {
    const ids = Array.from(pending.current);
    pending.current.clear();
    if (ids.length === 0) return;

    try {
      const response = await fetch('/api/documents/urls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { urls: Store };
      setUrls((current) => ({ ...current, ...body.urls }));
    } catch {
      // A preview that will not load is a missing picture, not a failed page.
    }
  }, []);

  const request = React.useCallback(
    (id: string) => {
      if (asked.current.has(id)) return;
      asked.current.add(id);
      pending.current.add(id);
      if (timer.current) clearTimeout(timer.current);
      // One microtask-ish window to collect the whole page's ids.
      timer.current = setTimeout(flush, 30);
    },
    [flush],
  );

  return (
    <PreviewContext.Provider value={{ urls, request }}>{children}</PreviewContext.Provider>
  );
}

export function DocumentPreview({
  documentId,
  alt,
  scanStatus,
  className,
  rounded = true,
}: {
  documentId: string;
  alt: string;
  scanStatus?: string;
  className?: string;
  rounded?: boolean;
}) {
  const t = useTranslations('scan');
  const context = React.useContext(PreviewContext);
  const entry = context?.urls[documentId];
  const deliverable = !scanStatus || scanStatus === 'clean';

  React.useEffect(() => {
    if (deliverable) context?.request(documentId);
  }, [context, documentId, deliverable]);

  const frame = cx(
    'flex items-center justify-center overflow-hidden bg-surface-sunken',
    rounded && 'rounded-field',
    className,
  );

  if (!deliverable) {
    return (
      <div className={frame} role="img" aria-label={`${alt} — ${t(scanStatus ?? 'pending')}`}>
        <span aria-hidden className="text-lg text-ink-subtle">
          ◷
        </span>
      </div>
    );
  }

  if (!entry) {
    return <div className={cx(frame, 'animate-pulse')} aria-hidden />;
  }

  if (entry.mimeType === 'application/pdf') {
    return (
      <div className={frame} role="img" aria-label={alt}>
        <span aria-hidden className="text-lg text-ink-subtle">
          ❐
        </span>
      </div>
    );
  }

  return (
    <div className={frame}>
      {/* Not next/image: these are signed, expiring URLs on a storage host, so
          the optimizer would cache a link that is about to stop working. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entry.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}
