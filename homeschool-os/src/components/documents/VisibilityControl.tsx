'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Field, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/interactive';
import { setDocumentVisibility } from '@/server/actions/documents';
import type { DocumentVisibility } from '@/lib/documents/visibility';

/**
 * Who can see this, chosen in words.
 *
 * The options are the ones the server said this person can actually grant, and
 * the labels are sentences - never the enum value. `academic_shared` is a
 * precise thing to store and a meaningless thing to read; what a parent needs
 * to see is "My child's teachers at the program".
 */
export function VisibilityControl({
  documentId,
  studentId,
  current,
  options,
}: {
  documentId: string;
  studentId: string;
  current: DocumentVisibility;
  options: Array<{ value: DocumentVisibility; label: string; help: string }>;
}) {
  const t = useTranslations('visibility');
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = React.useState(current);
  const [pending, setPending] = React.useState(false);

  const help = options.find((o) => o.value === value)?.help;

  async function onChange(next: DocumentVisibility) {
    const previous = value;
    setValue(next);
    setPending(true);

    const result = await setDocumentVisibility(documentId, studentId, next);
    setPending(false);

    if (result?.error) {
      setValue(previous);
      toast(t('changeFailed'), 'critical');
      return;
    }
    toast(t('changed'), 'positive');
    router.refresh();
  }

  return (
    <Field label={t('label')} hint={help} htmlFor="doc-visibility">
      <Select
        id="doc-visibility"
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as DocumentVisibility)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
