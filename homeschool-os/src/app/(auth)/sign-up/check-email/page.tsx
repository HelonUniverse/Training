import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card } from '@/components/ui/primitives';

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const t = await getTranslations('auth.signUp');
  const tc = await getTranslations('auth.forgot');
  const { email } = await searchParams;

  return (
    <Card className="p-6 text-center sm:p-8">
      <div
        aria-hidden
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl"
      >
        ✉
      </div>
      <h1 className="text-title text-ink">{t('checkEmail')}</h1>
      <p className="mt-2 text-pretty text-ink-muted">
        {t('checkEmailBody', { email: email ?? '' })}
      </p>
      <Link
        href="/sign-in"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        {tc('backToSignIn')}
      </Link>
    </Card>
  );
}
