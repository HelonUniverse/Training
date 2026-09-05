'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveStep } from '@/server/actions/onboarding';
import { Button, Field, Input } from '@/components/ui/primitives';
import { FormStep } from '@/components/ui/patterns';
import { SearchSelect } from '@/components/ui/interactive';
import { stateOptions, countyOptions, hasCountyList } from '@/lib/reference';

export function OrgLocationForm({ draft }: { draft: Record<string, string | string[]> }) {
  const t = useTranslations('onboarding.organization.location');
  const tc = useTranslations('common');
  const [pending, start] = useTransition();

  const [stateCode, setStateCode] = useState(String(draft.orgStateCode ?? ''));
  const [county, setCounty] = useState(String(draft.orgCounty ?? ''));
  const [locationName, setLocationName] = useState(String(draft.orgLocationName ?? ''));

  const valid = Boolean(stateCode);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    start(() =>
      void saveStep(
        'size',
        { orgStateCode: stateCode, orgCounty: county, orgLocationName: locationName.trim() },
        '/onboarding/organization/size',
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
        <Field label={t('state')} htmlFor="orgState">
          <SearchSelect
            id="orgState"
            options={stateOptions}
            value={stateCode}
            onChange={(v) => {
              setStateCode(v);
              setCounty('');
            }}
          />
        </Field>

        {hasCountyList(stateCode) ? (
          <Field label={t('county')} htmlFor="orgCounty">
            <SearchSelect
              id="orgCounty"
              options={countyOptions(stateCode)}
              value={county}
              onChange={setCounty}
            />
          </Field>
        ) : stateCode ? (
          <Field label={t('county')} htmlFor="orgCountyText" optional={tc('optional')}>
            <Input
              id="orgCountyText"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
            />
          </Field>
        ) : null}

        <Field
          label={t('locationName')}
          hint={t('locationHint')}
          htmlFor="orgLocationName"
          optional={tc('optional')}
        >
          <Input
            id="orgLocationName"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
        </Field>
      </FormStep>
    </form>
  );
}
