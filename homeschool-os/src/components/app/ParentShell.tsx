import { getContexts } from '@/lib/auth/session';
import { getActiveContext, getActiveStudent } from '@/lib/auth/context';
import { Shell } from './Shell';
import { StudentSwitcher } from './StudentSwitcher';

export async function ParentShell({
  children,
  showStudentSwitcher = true,
  allowAll,
}: {
  children: React.ReactNode;
  showStudentSwitcher?: boolean;
  allowAll?: boolean;
}) {
  const [contexts, active, { students, activeId }] = await Promise.all([
    getContexts(),
    getActiveContext(),
    getActiveStudent(),
  ]);

  return (
    <Shell
      variant="parent"
      contexts={contexts}
      activeContext={active}
      headerRight={
        showStudentSwitcher ? (
          <StudentSwitcher students={students} activeId={activeId} allowAll={allowAll} />
        ) : null
      }
    >
      {children}
    </Shell>
  );
}
