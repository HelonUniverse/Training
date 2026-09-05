import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { Button } from '@/components/ui/primitives';

/**
 * The transition screen. Deliberately says what we will help ORGANIZE - never
 * that the family is compliant, and never a guarantee.
 */
export default async function CompletePage() {
  const t = await getTranslations('onboarding.parent.complete');
  const user = await requireUser();
  const supabase = await createClient();

  const { data: family } = await supabase
    .from('families')
    .select('state_code')
    .limit(1)
    .maybeSingle();

  void user;
  const isFlorida = family?.state_code === 'FL';

  const items = [t('learning'), t('portfolio'), t('records'), t('calendar'), t('progress')];
  if (isFlorida) items.push(t('florida'));

  return (
    <div className="animate-fade-up pt-6 text-center">
      <div
        aria-hidden
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-3xl"
      >
        ✓
      </div>
      <h1 className="text-display text-balance text-ink">{t('title')}</h1>
      <p className="mx-auto mt-3 max-w-prose text-pretty text-ink-muted">{t('subtitle')}</p>

      <ul className="mx-auto mt-9 max-w-sm space-y-2.5 text-left">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-3 rounded-field bg-surface px-4 py-3 ring-1 ring-inset ring-hairline/70"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-positive-soft text-xs text-positive-ink"
            >
              ✓
            </span>
            <span className="text-[0.9375rem] text-ink">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-9">
        <Link href="/app/home" className="block">
          <Button size="lg" full>
            {t('cta')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
