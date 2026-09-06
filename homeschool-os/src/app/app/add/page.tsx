import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader } from '@/components/ui/primitives';
import { CAPTURE_KINDS, KIND_SPEC } from '@/lib/capture/kinds';

/**
 * "Add something" as a page as well as a menu.
 *
 * The header button opens a sheet, but the same chooser has to exist at a URL:
 * it is what the bottom-nav "+" links to, what a bookmark lands on, and what
 * works when the menu's JavaScript has not arrived yet.
 */
export default async function Page() {
  const t = await getTranslations('capture');

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader title={t('addSomething')} subtitle={t('addSomethingSubtitle')} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {CAPTURE_KINDS.map((kind) => (
          <li key={kind}>
            <Link
              href={`/app/add/${kind}`}
              className="flex min-h-[4.5rem] items-center gap-4 rounded-card bg-surface p-4 text-left shadow-card ring-1 ring-inset ring-hairline/70 transition-all hover:shadow-raised hover:ring-primary/40"
            >
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl text-primary-ink"
              >
                {KIND_SPEC[kind].icon}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{t(`kind.${kind}`)}</span>
                <span className="mt-0.5 block text-pretty text-sm text-ink-muted">
                  {t(`kindHelp.${kind}`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ParentShell>
  );
}
