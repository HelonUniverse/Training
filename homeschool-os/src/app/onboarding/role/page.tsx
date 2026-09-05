import { getTranslations } from 'next-intl/server';
import { RoleChoice } from './RoleChoice';

export default async function RolePage() {
  const t = await getTranslations('onboarding.role');
  return (
    <div className="animate-fade-up">
      <h1 className="text-title text-balance text-ink sm:text-display">{t('title')}</h1>
      <p className="mt-3 text-pretty text-ink-muted">{t('subtitle')}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RoleChoice
          role="parent"
          title={t('parent')}
          body={t('parentBody')}
          icon="🏡"
        />
        <RoleChoice
          role="organization"
          title={t('organization')}
          body={t('organizationBody')}
          icon="🎓"
        />
      </div>
    </div>
  );
}
