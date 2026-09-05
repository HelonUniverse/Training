import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContext } from '@/lib/auth/context';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader } from '@/components/ui/primitives';
import { InvitePanel } from '@/components/app/InvitePanel';
import { InvitationList } from '@/components/app/InvitationList';

export default async function Page() {
  const tn = await getTranslations('nav');
  const context = await getActiveContext();
  if (context?.kind !== 'organization') redirect('/app/home');

  const supabase = await createClient();
  const { data } = await supabase
    .from('invitations')
    .select('id, email, role, accepted_at, revoked_at, expires_at')
    .eq('organization_id', context.organizationId)
    .eq('invite_kind', 'org_member')
    .order('created_at', { ascending: false })
    .limit(25);

  return (
    <OrgShell>
      <PageHeader title={tn('staff')} />
      <div className="grid gap-5 lg:grid-cols-2">
        <InvitePanel kind="org_member" />
        <InvitationList rows={data ?? []} />
      </div>
    </OrgShell>
  );
}
