'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { markComplete } from '@/server/actions/learning';

/**
 * Manual completion.
 *
 * This is a real integration mode, not a consolation prize for providers we do
 * not sync with. Most homeschool curricula are books; a family telling us they
 * finished today's lesson is the most accurate progress signal that exists for
 * those, and treating it as second-class would be treating most families as
 * second-class.
 */
export function MarkComplete({
  enrollmentId,
  studentId,
  lessonId,
}: {
  enrollmentId: string;
  studentId: string;
  lessonId?: string;
}) {
  const t = useTranslations('learn');
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          const result = await markComplete(enrollmentId, studentId, lessonId);
          if (!result?.error) setDone(true);
        })
      }
      className="inline-flex min-h-11 items-center rounded-button border border-hairline px-4 text-sm font-medium text-ink disabled:opacity-50"
    >
      {done ? t('recorded') : t('markComplete')}
    </button>
  );
}
