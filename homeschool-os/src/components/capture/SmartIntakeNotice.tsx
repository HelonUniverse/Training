import { getTranslations } from 'next-intl/server';

/**
 * The Smart Intake placeholder.
 *
 * Deliberately written as a promise about the future, in the future tense, with
 * no claim about the present. It does not say "analyzing", it does not show a
 * spinner, and it does not sit next to a fake confidence score. Nothing about
 * this upload was read by a model, and a parent who assumed otherwise - and
 * therefore skipped labelling their own records - would be worse off for having
 * trusted us.
 */
export async function SmartIntakeNotice() {
  const t = await getTranslations('smartIntake');

  return (
    <aside className="rounded-card bg-surface-sunken/60 p-4 ring-1 ring-inset ring-hairline/70">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 text-lg text-ink-subtle">
          ✦
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{t('title')}</p>
          <p className="mt-1 text-pretty text-sm text-ink-muted">{t('body')}</p>
        </div>
      </div>
    </aside>
  );
}
