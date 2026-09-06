'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, FormError } from '@/components/ui/primitives';
import { acceptInvitation } from '@/server/actions/invitations';

export function AcceptInvitation({ token }: { token: string }) {
  const t = useTranslations('invitations');
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onAccept() {
    setPending(true);
    setError(null);
    const result = await acceptInvitation(token);

    if (result?.error) {
      setError(t(result.error.replace('invitations.', '')));
      setPending(false);
      return;
    }
    router.push('/app');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button size="lg" full onClick={onAccept} disabled={pending}>
        {pending ? t('accepting') : t('accept')}
      </Button>
      {error ? <FormError>{error}</FormError> : null}
    </div>
  );
}
