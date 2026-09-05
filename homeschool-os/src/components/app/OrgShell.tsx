import { getContexts } from '@/lib/auth/session';
import { getActiveContext } from '@/lib/auth/context';
import { Shell } from './Shell';

export async function OrgShell({ children }: { children: React.ReactNode }) {
  const [contexts, active] = await Promise.all([getContexts(), getActiveContext()]);
  return (
    <Shell variant="organization" contexts={contexts} activeContext={active}>
      {children}
    </Shell>
  );
}
