'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/primitives';
import { addCurriculum } from '@/server/actions/learning';

/**
 * Adding a curriculum.
 *
 * The form asks for a name and nothing else that matters. Everything below the
 * name is optional, because the point is that a family can record what they
 * actually use in ten seconds - including a curriculum we have never heard of,
 * including one that is a stack of books with no website at all.
 *
 * IT NEVER ASKS FOR A PROVIDER PASSWORD. There is no field for one, the schema
 * has no column for one, and if a family ever offers we do not want it. When
 * real syncing exists it will be OAuth through the provider, not credentials
 * held here.
 */
export function AddCurriculumForm({
  familyId,
  studentId,
  studentName,
  providers,
  subjects,
}: {
  familyId: string;
  studentId: string;
  studentName: string;
  providers: { slug: string; name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const t = useTranslations('learn');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [providerSlug, setProviderSlug] = useState('');

  // "Another curriculum" is chosen, so the parent names the provider themselves.
  const isOther = providerSlug === '' || providerSlug === 'other';

  return (
    <Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await addCurriculum({
              familyId,
              studentId,
              courseName: String(form.get('courseName') ?? ''),
              providerSlug: isOther ? null : providerSlug,
              providerName: isOther ? String(form.get('providerName') ?? '') || null : null,
              subjectId: String(form.get('subjectId') ?? '') || null,
              externalUrl: String(form.get('externalUrl') ?? '') || null,
            });
            if (result?.error) {
              setError(
                result.error === 'learn.errors.badUrl' ? t('errors.badUrl')
                : result.error === 'learn.errors.nameRequired' ? t('errors.nameRequired')
                : t('errors.couldNotAdd'),
              );
              return;
            }
            router.push('/app/learning');
          });
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-ink">
            {t('provider')}
          </label>
          <select
            id="provider"
            value={providerSlug}
            onChange={(event) => setProviderSlug(event.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-input border border-hairline bg-surface px-3 text-base"
          >
            <option value="">{t('anotherCurriculum')}</option>
            {providers
              .filter((p) => p.slug !== 'other')
              .map((provider) => (
                <option key={provider.slug} value={provider.slug}>
                  {provider.name}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-ink-subtle">{t('providerHelp')}</p>
        </div>

        {isOther ? (
          <div>
            <label htmlFor="providerName" className="block text-sm font-medium text-ink">
              {t('providerName')}
            </label>
            <input
              id="providerName"
              name="providerName"
              className="mt-1 min-h-[44px] w-full rounded-input border border-hairline px-3 text-base"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="courseName" className="block text-sm font-medium text-ink">
            {t('courseName')}
          </label>
          <input
            id="courseName"
            name="courseName"
            required
            className="mt-1 min-h-[44px] w-full rounded-input border border-hairline px-3 text-base"
          />
        </div>

        <div>
          <label htmlFor="subjectId" className="block text-sm font-medium text-ink">
            {t('subject')}
          </label>
          <select
            id="subjectId"
            name="subjectId"
            className="mt-1 min-h-[44px] w-full rounded-input border border-hairline bg-surface px-3 text-base"
          >
            <option value="">{t('noSubject')}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="externalUrl" className="block text-sm font-medium text-ink">
            {t('website')}
          </label>
          <input
            id="externalUrl"
            name="externalUrl"
            type="url"
            placeholder="https://"
            className="mt-1 min-h-[44px] w-full rounded-input border border-hairline px-3 text-base"
          />
          {/* Says exactly what a link does and does not do. A family who expects
              their scores to appear here should find that out now, from us. */}
          <p className="mt-1 text-xs text-ink-subtle">{t('websiteHelp')}</p>
        </div>

        {studentName ? (
          <p className="text-sm text-ink-muted">{t('willBeAddedFor', { name: studentName })}</p>
        ) : null}

        {error ? <p className="text-sm text-critical-ink">{error}</p> : null}

        <button
          type="submit"
          disabled={pending || !familyId || !studentId}
          className="min-h-[44px] w-full rounded-button bg-ink px-5 text-sm font-medium text-surface disabled:opacity-50 sm:w-auto"
        >
          {t('save')}
        </button>
      </form>
    </Card>
  );
}
