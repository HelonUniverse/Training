import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { SignInForm } from './SignInForm';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations('auth.signIn');
  const { next } = await searchParams;

  return (
    <>
      <Card className="p-6 sm:p-8">
        <h1 className="text-title text-ink">{t('title')}</h1>
        <p className="mt-1.5 text-ink-muted">{t('subtitle')}</p>
        <SignInForm next={next ?? ''} />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t('noAccount')}{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          {t('createAccount')}
        </Link>
      </p>
    </>
  );
}
