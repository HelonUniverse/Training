import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth/session';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/onboarding/role');
  const t = await getTranslations('common');

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-5 py-5 sm:px-8">
        <p className="text-sm font-semibold tracking-tight text-primary">{t('appName')}</p>
      </header>
      <main id="main" className="flex flex-1 justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-form pt-4 sm:max-w-xl sm:pt-10">{children}</div>
      </main>
    </div>
  );
}
