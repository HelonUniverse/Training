import { getLocale, getTranslations } from 'next-intl/server';
import { getUser } from '@/lib/auth/session';
import { getActiveContext } from '@/lib/auth/context';
import { ParentShell } from '@/components/app/ParentShell';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader, Card } from '@/components/ui/primitives';
import { LanguageSwitcher } from '@/components/app/LanguageSwitcher';
import { StandardsVisibility } from '@/components/learning/StandardsVisibility';
import { getStandardsVisibility } from '@/server/queries/standards';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/app/SignOutButton';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const tc = await getTranslations('common');
  const ts = await getTranslations('standards');
  const user = await getUser();
  const locale = await getLocale();
  const context = await getActiveContext();

  // RLS scopes this to the caller's own families, so no id is posted or trusted.
  const supabase = await createClient();
  const { data: families } = await supabase.from('families').select('id').limit(1);
  const standardsVisibility = await getStandardsVisibility(families?.[0]?.id ?? null);

  const body = (
    <>
      <PageHeader title={t('title')} />

      <div className="space-y-5">
        <Card>
          <h2 className="text-heading text-ink">{t('language')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('languageBody')}</p>
          <div className="mt-4">
            <LanguageSwitcher current={locale} />
          </div>
        </Card>

        {context?.kind === 'organization' ? null : (
          <Card>
            <h2 className="text-heading text-ink">{ts('settingsHeading')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{ts('settingsBody')}</p>
            <div className="mt-4">
              <StandardsVisibility current={standardsVisibility} />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-heading text-ink">{t('account')}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('accountBody')}</p>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-sm text-ink-muted">{t('name')}</dt>
              <dd className="text-sm font-medium text-ink">{user?.fullName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sm text-ink-muted">{t('email')}</dt>
              <dd className="truncate text-sm font-medium text-ink">{user?.email}</dd>
            </div>
          </dl>
        </Card>

        <SignOutButton label={tc('signOut')} />
      </div>
    </>
  );

  return context?.kind === 'organization' ? (
    <OrgShell>{body}</OrgShell>
  ) : (
    <ParentShell showStudentSwitcher={false}>{body}</ParentShell>
  );
}
