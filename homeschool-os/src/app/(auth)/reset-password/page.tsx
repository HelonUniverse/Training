import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/primitives';
import { ResetForm } from './ResetForm';

export default async function ResetPasswordPage() {
  const t = await getTranslations('auth.reset');
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-title text-ink">{t('title')}</h1>
      <p className="mt-1.5 text-ink-muted">{t('subtitle')}</p>
      <ResetForm />
    </Card>
  );
}
