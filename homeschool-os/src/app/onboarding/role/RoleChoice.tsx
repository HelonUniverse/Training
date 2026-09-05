'use client';

import { useTransition } from 'react';
import { chooseRole } from '@/server/actions/onboarding';
import { ActionCard } from '@/components/ui/patterns';
import type { OnboardingRole } from '@/lib/onboarding';

export function RoleChoice({
  role,
  title,
  body,
  icon,
}: {
  role: OnboardingRole;
  title: string;
  body: string;
  icon: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className={pending ? 'h-full opacity-60' : 'h-full'}>
      <ActionCard
        as="button"
        title={title}
        body={body}
        icon={icon}
        onClick={() => start(() => void chooseRole(role))}
      />
    </div>
  );
}
