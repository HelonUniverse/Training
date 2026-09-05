import { getTranslations } from 'next-intl/server';

/** Calm, centred, single-column. No product chrome before you're signed in. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-form">
          <div className="mb-8 text-center">
            <p className="text-heading tracking-tight text-primary">{t('appName')}</p>
            <p className="mt-1 text-sm text-ink-subtle">{t('tagline')}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
