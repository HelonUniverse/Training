'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button } from '@/components/ui/primitives';
import { FormStep, SelectPill } from '@/components/ui/patterns';
import { CORE_SUBJECTS, OPTIONAL_SUBJECTS } from '@/lib/reference';

export function SubjectsForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.parent.subjects');
  const ts = useTranslations('subjects');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const saved = Array.isArray(draft.subjects) ? draft.subjects : [...CORE_SUBJECTS];
  const [selected, setSelected] = useState<string[]>(saved);

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(() => void saveStep('goals', { subjects: selected }, '/onboarding/parent/goals'));
  }

  return (
    <form onSubmit={submit}>
      <FormStep
        title={t('title')}
        subtitle={t('subtitle')}
        footer={
          <Button type="submit" size="lg" full disabled={pending}>
            {tc('continue')}
          </Button>
        }
      >
        <div>
          <p className="mb-3 text-sm font-medium text-ink-subtle">{t('core')}</p>
          <div className="flex flex-wrap gap-2">
            {CORE_SUBJECTS.map((s) => (
              <SelectPill
                key={s}
                label={ts(s)}
                selected={selected.includes(s)}
                onToggle={() => toggle(s)}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-ink-subtle">{t('more')}</p>
          <div className="flex flex-wrap gap-2">
            {OPTIONAL_SUBJECTS.map((s) => (
              <SelectPill
                key={s}
                label={ts(s)}
                selected={selected.includes(s)}
                onToggle={() => toggle(s)}
              />
            ))}
          </div>
        </div>
      </FormStep>
    </form>
  );
}
