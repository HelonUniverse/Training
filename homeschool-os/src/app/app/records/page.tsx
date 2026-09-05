import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Button, StatusBadge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';

/**
 * Florida is RECOGNISED, not activated. The compliance pack ships draft and
 * inactive, so this page never shows a due date, a district contact, or the
 * word "compliant". It only offers to help organize.
 */
export default async function RecordsPage() {
  const t = await getTranslations('empty.records');
  const tn = await getTranslations('nav');

  const supabase = await createClient();
  const { data: family } = await supabase
    .from('families')
    .select('state_code, county')
    .limit(1)
    .maybeSingle();

  const isFlorida = family?.state_code === 'FL';

  return (
    <ParentShell>
      <PageHeader
        title={tn('records')}
        eyebrow={
          isFlorida ? (
            <StatusBadge tone="info">
              Florida{family?.county ? ` · ${family.county} County` : ''}
            </StatusBadge>
          ) : null
        }
      />
      <EmptyState
        icon="▥"
        title={isFlorida ? t('title') : tn('records')}
        body={t('body')}
        action={<Button size="lg">{t('cta')}</Button>}
      />
    </ParentShell>
  );
}
