'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { inputClass } from '@/components/ui/primitives';

/**
 * Search across what has been filed.
 *
 * METADATA ONLY - titles, filenames, categories, dates. There is no extracted
 * text behind this and no embeddings, so the hint says exactly that. Someone
 * who searched for a phrase they remember seeing inside a PDF, found nothing,
 * and concluded the document was never uploaded would have been misled by a
 * search box that stayed quiet about its own scope.
 */
export function DocumentSearch() {
  const t = useTranslations('documents');
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get('q') ?? '');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (value.trim()) next.set('q', value.trim());
      else next.delete('q');
      router.replace(`/app/documents?${next.toString()}`, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="mb-4">
      <label htmlFor="doc-search" className="sr-only">
        {t('searchLabel')}
      </label>
      <input
        id="doc-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className={inputClass}
        aria-describedby="doc-search-scope"
      />
      <p id="doc-search-scope" className="mt-1.5 text-sm text-ink-subtle">
        {t('searchScope')}
      </p>
    </div>
  );
}
