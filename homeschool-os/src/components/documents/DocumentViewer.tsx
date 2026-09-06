'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/primitives';

/**
 * Opening a file.
 *
 * The URL is fetched when the viewer mounts, is valid for two minutes, and is
 * never rendered as a link the browser can keep. There is no permanent URL for
 * any stored file in this product; a link copied out of here stops working
 * before it can be forwarded usefully.
 *
 * A file that has not come back clean has no URL to fetch at all - the storage
 * policy refuses it - so this says what is happening rather than showing a
 * broken frame.
 */
export function DocumentViewer({
  documentId,
  scanStatus,
  filename,
}: {
  documentId: string;
  scanStatus: string;
  filename: string;
}) {
  const t = useTranslations('documents');
  const ts = useTranslations('scan');

  const [state, setState] = React.useState<
    { kind: 'loading' } | { kind: 'ready'; url: string; mimeType: string } | { kind: 'failed' }
  >({ kind: 'loading' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch(`/api/documents/${documentId}/url`, { cache: 'no-store' });
      if (!response.ok) {
        setState({ kind: 'failed' });
        return;
      }
      const body = (await response.json()) as { url: string; mimeType: string };
      setState({ kind: 'ready', url: body.url, mimeType: body.mimeType });
    } catch {
      setState({ kind: 'failed' });
    }
  }, [documentId]);

  React.useEffect(() => {
    if (scanStatus === 'clean') void load();
  }, [load, scanStatus]);

  if (scanStatus !== 'clean') {
    return (
      <div className="rounded-card bg-surface-sunken px-6 py-14 text-center ring-1 ring-inset ring-hairline/70">
        <span aria-hidden className="text-3xl text-ink-subtle">
          {scanStatus === 'infected' ? '⚠' : '◷'}
        </span>
        <p className="mt-3 font-medium text-ink">{ts(`${scanStatus}Title`)}</p>
        <p className="mx-auto mt-1 max-w-prose text-pretty text-sm text-ink-muted">
          {ts(`${scanStatus}Body`)}
        </p>
      </div>
    );
  }

  if (state.kind === 'loading') {
    return <div className="h-96 animate-pulse rounded-card bg-surface-sunken" aria-hidden />;
  }

  if (state.kind === 'failed') {
    return (
      <div className="rounded-card bg-surface-sunken px-6 py-14 text-center ring-1 ring-inset ring-hairline/70">
        <p className="font-medium text-ink">{t('viewer.failed')}</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={load}>
            {t('viewer.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (state.mimeType === 'application/pdf') {
    return (
      <object
        data={state.url}
        type="application/pdf"
        aria-label={filename}
        className="h-[70vh] w-full rounded-card bg-surface-sunken ring-1 ring-inset ring-hairline/70"
      >
        {/* Some mobile browsers will not embed a PDF. Opening it is the fallback. */}
        <div className="px-6 py-14 text-center">
          <p className="text-ink">{t('viewer.pdfFallback')}</p>
          <p className="mt-4">
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center rounded-pill bg-primary px-5 font-medium text-ink-inverse"
            >
              {t('viewer.open')}
            </a>
          </p>
        </div>
      </object>
    );
  }

  return (
    <div className="overflow-hidden rounded-card bg-surface-sunken ring-1 ring-inset ring-hairline/70">
      {/* Signed and expiring, so next/image's optimizer would cache a dead link. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={state.url} alt={filename} className="mx-auto max-h-[70vh] w-auto object-contain" />
    </div>
  );
}
