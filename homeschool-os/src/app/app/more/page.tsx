import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getActiveContext } from '@/lib/auth/context';
import { ParentShell } from '@/components/app/ParentShell';
import { OrgShell } from '@/components/app/OrgShell';
import { PageHeader, Card } from '@/components/ui/primitives';
import { SignOutButton } from '@/components/app/SignOutButton';

const PARENT_LINKS = [
  { href: '/app/documents', key: 'documents', icon: '❐' },
  { href: '/app/progress', key: 'progress', icon: '◈' },
  { href: '/app/messages', key: 'messages', icon: '✉' },
  { href: '/app/records', key: 'records', icon: '▥' },
  { href: '/app/reports', key: 'reports', icon: '▤' },
  { href: '/app/settings', key: 'settings', icon: '⚙' },
];

const ORG_LINKS = [
  { href: '/app/org/families', key: 'families', icon: '⬡' },
  { href: '/app/org/staff', key: 'staff', icon: '✓' },
  { href: '/app/org/academics', key: 'academics', icon: '◈' },
  { href: '/app/org/documents', key: 'documents', icon: '❐' },
  { href: '/app/org/reports', key: 'reports', icon: '▤' },
  { href: '/app/org/settings', key: 'settings', icon: '⚙' },
];

export default async function MorePage() {
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const context = await getActiveContext();
  const isOrg = context?.kind === 'organization';
  const links = isOrg ? ORG_LINKS : PARENT_LINKS;

  const body = (
    <>
      <PageHeader title={tc('more')} />
      <Card className="divide-y divide-hairline p-0">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-14 items-center gap-3 px-5 py-3.5 text-[0.9375rem] text-ink hover:bg-surface-sunken"
          >
            <span aria-hidden className="w-5 text-center text-base text-ink-subtle">
              {l.icon}
            </span>
            {t(l.key)}
            <span aria-hidden className="ml-auto text-ink-subtle">
              ›
            </span>
          </Link>
        ))}
      </Card>
      <div className="mt-6">
        <SignOutButton label={tc('signOut')} />
      </div>
    </>
  );

  return isOrg ? <OrgShell>{body}</OrgShell> : <ParentShell showStudentSwitcher={false}>{body}</ParentShell>;
}
