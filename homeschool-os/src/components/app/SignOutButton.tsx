'use client';

import { useTransition } from 'react';
import { signOut } from '@/server/actions/auth';
import { Button } from '@/components/ui/primitives';

export function SignOutButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" full disabled={pending} onClick={() => start(() => void signOut())}>
      {label}
    </Button>
  );
}
