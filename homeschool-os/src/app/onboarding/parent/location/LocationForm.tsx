'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, Field, Input } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { SearchSelect } from '@/components/ui/interactive';
import { stateOptions, countyOptions, hasCountyList } from '@/lib/reference';

export function LocationForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.parent.location');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const [stateCode, setStateCode] = useState(String(draft.stateCode ?? ''));
  const [county, setCounty] = useState(String(draft.county ?? ''));

  const counties = countyOptions(stateCode);
  const showCountyPicker = hasCountyList(stateCode);
  const valid = Boolean(stateCode);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(() =>
      void saveStep('start', { stateCode, county }, '/onboarding/parent/start'),
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
        <Field label={t('country')} htmlFor="country">
          <Input id="country" value="United States" readOnly disabled />
        </Field>

        <Field label={t('state')} htmlFor="state">
          <SearchSelect
            id="state"
            options={stateOptions}
            value={stateCode}
            onChange={(v) => {
              setStateCode(v);
              setCounty('');
            }}
            placeholder={t('statePlaceholder')}
          />
        </Field>

        {showCountyPicker ? (
          <Field label={t('county')} htmlFor="county">
            <SearchSelect
              id="county"
              options={counties}
              value={county}
              onChange={setCounty}
              placeholder={t('countyPlaceholder')}
            />
          </Field>
        ) : stateCode ? (
          <Field label={t('county')} htmlFor="countyText" optional={tc('optional')}>
            <Input
              id="countyText"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              autoComplete="off"
            />
          </Field>
        ) : null}
      </FormStep>
    </form>
  );
}
