'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, Field, Input, cx } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { ORG_TYPES } from '@/lib/reference';

export function OrgProfileForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.organization.profile');
  const tt = useTranslations('orgType');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const [name, setName] = useState(String(draft.orgName ?? ''));
  const [type, setType] = useState(String(draft.orgType ?? ''));
  const valid = Boolean(name.trim() && type);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(() =>
      void saveStep(
        'location',
        { orgName: name.trim(), orgType: type },
        '/onboarding/organization/location',
      ),
    );
  }

  return (
    <form onSubmit={submit}>
      <FormStep
        title={t('title')}
        subtitle={t('subtitle')}
        footer={
          <Button type="submit" size="lg" full disabled={!valid || pending}>
            {tc('continue')}
          </Button>
        }
      >
        <Field label={t('name')} htmlFor="orgName">
          <Input
            id="orgName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            autoComplete="organization"
            required
          />
        </Field>

        <fieldset>
          <legend className="mb-3 block text-sm font-medium text-ink">{t('type')}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ORG_TYPES.map((o) => (
              <label
                key={o}
                className={cx(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-card px-4 py-3',
                  'ring-1 ring-inset transition-colors',
                  type === o
                    ? 'bg-primary-soft ring-2 ring-primary'
                    : 'bg-surface ring-hairline hover:bg-surface-sunken',
                )}
              >
                <input
                  type="radio"
                  name="orgType"
                  value={o}
                  checked={type === o}
                  onChange={() => setType(o)}
                  className="h-5 w-5 shrink-0 accent-[rgb(var(--primary))]"
                />
                <span className="text-[0.9375rem] font-medium text-ink">{tt(o)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormStep>
    </form>
  );
}
