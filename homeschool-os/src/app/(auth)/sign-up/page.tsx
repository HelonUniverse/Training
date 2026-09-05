import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card } from '@/components/ui/primitives';
import { SignUpForm } from './SignUpForm';

export default async function SignUpPage() {
  const t = await getTranslations('auth.signUp');
  return (
    <>
      <Card className="p-6 sm:p-8">
        <h1 className="text-title text-ink">{t('title')}</h1>
        <p className="mt-1.5 text-ink-muted">{t('subtitle')}</p>
        <SignUpForm />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t('haveAccount')}{' '}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          {t('signInLink')}
        </Link>
      </p>
    </>
  );
}
