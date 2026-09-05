import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cx } from '@/components/ui/primitives';
import type { AppContext } from '@/lib/auth/session';
import { ContextSwitcher } from './ContextSwitcher';
import { UniversalAction } from './UniversalAction';
import { MobileBottomNav } from './MobileBottomNav';
import { NavLink } from './NavLink';

export type NavItem = { href: string; labelKey: string; icon: string };

export const PARENT_NAV: NavItem[] = [
  { href: '/app/home', labelKey: 'home', icon: '◉' },
  { href: '/app/learning', labelKey: 'learning', icon: '✎' },
  { href: '/app/calendar', labelKey: 'calendar', icon: '▦' },
  { href: '/app/portfolio', labelKey: 'portfolio', icon: '✦' },
  { href: '/app/documents', labelKey: 'documents', icon: '❐' },
  { href: '/app/progress', labelKey: 'progress', icon: '◈' },
  { href: '/app/messages', labelKey: 'messages', icon: '✉' },
];

export const PARENT_MORE: NavItem[] = [
  { href: '/app/records', labelKey: 'records', icon: '▥' },
  { href: '/app/reports', labelKey: 'reports', icon: '▤' },
  { href: '/app/settings', labelKey: 'settings', icon: '⚙' },
];

/** Mobile keeps to five. Everything else lives behind More. */
export const PARENT_MOBILE: NavItem[] = [
  { href: '/app/home', labelKey: 'home', icon: '◉' },
  { href: '/app/learning', labelKey: 'learn', icon: '✎' },
  { href: '/app/calendar', labelKey: 'calendar', icon: '▦' },
  { href: '/app/portfolio', labelKey: 'portfolio', icon: '✦' },
  { href: '/app/more', labelKey: 'more', icon: '⋯' },
];

export const ORG_NAV: NavItem[] = [
  { href: '/app/org/home', labelKey: 'home', icon: '◉' },
  { href: '/app/org/students', labelKey: 'students', icon: '◍' },
  { href: '/app/org/families', labelKey: 'families', icon: '⬡' },
  { href: '/app/org/staff', labelKey: 'staff', icon: '✓' },
  { href: '/app/org/classes', labelKey: 'classes', icon: '▣' },
  { href: '/app/org/calendar', labelKey: 'calendar', icon: '▦' },
  { href: '/app/org/academics', labelKey: 'academics', icon: '◈' },
  { href: '/app/org/documents', labelKey: 'documents', icon: '❐' },
];

export const ORG_MORE: NavItem[] = [
  { href: '/app/org/reports', labelKey: 'reports', icon: '▤' },
  { href: '/app/org/settings', labelKey: 'settings', icon: '⚙' },
];

export const ORG_MOBILE: NavItem[] = [
  { href: '/app/org/home', labelKey: 'home', icon: '◉' },
  { href: '/app/org/students', labelKey: 'students', icon: '◍' },
  { href: '/app/org/calendar', labelKey: 'calendar', icon: '▦' },
  { href: '/app/org/classes', labelKey: 'classes', icon: '▣' },
  { href: '/app/more', labelKey: 'more', icon: '⋯' },
];

export async function Shell({
  children,
  variant,
  contexts,
  activeContext,
  headerRight,
}: {
  children: React.ReactNode;
  variant: 'parent' | 'organization';
  contexts: AppContext[];
  activeContext: AppContext | null;
  headerRight?: React.ReactNode;
}) {
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const ta = await getTranslations('actions');

  const primary = variant === 'parent' ? PARENT_NAV : ORG_NAV;
  const secondary = variant === 'parent' ? PARENT_MORE : ORG_MORE;
  const mobile = variant === 'parent' ? PARENT_MOBILE : ORG_MOBILE;

  const actions =
    variant === 'parent'
      ? [
          { key: 'uploadWork', href: '/app/portfolio' },
          { key: 'uploadDocument', href: '/app/documents' },
          { key: 'addActivity', href: '/app/portfolio' },
          { key: 'planLesson', href: '/app/learning' },
          { key: 'createEvent', href: '/app/calendar' },
          { key: 'askAi', href: '/app/home' },
        ]
      : [
          { key: 'inviteFamily', href: '/app/org/families' },
          { key: 'addStudent', href: '/app/org/students' },
          { key: 'createClass', href: '/app/org/classes' },
          { key: 'createEvent', href: '/app/org/calendar' },
          { key: 'inviteStaff', href: '/app/org/staff' },
        ];

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hairline bg-surface lg:flex">
        <div className="px-5 py-6">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center text-heading tracking-tight text-primary"
          >
            {tc('appName')}
          </Link>
        </div>

        <div className="px-3">
          <ContextSwitcher contexts={contexts} active={activeContext} />
        </div>

        <nav aria-label="Main" className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {primary.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={t(item.labelKey)} />
          ))}
          <div className="my-3 border-t border-hairline" />
          {secondary.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={t(item.labelKey)} />
          ))}
        </nav>
      </aside>

      {/* ----------------------------------------------------------- header */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1 lg:hidden">
              <Link
                href="/app"
                className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold tracking-tight text-primary"
              >
                {tc('appName')}
              </Link>
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">{headerRight ? null : null}</div>
            <div className="flex shrink-0 items-center gap-2">
              {headerRight}
              <UniversalAction label={ta('title')} actions={actions} />
            </div>
          </div>
        </header>

        <main id="main" className="px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div className={cx('mx-auto w-full', 'max-w-5xl')}>{children}</div>
        </main>
      </div>

      <MobileBottomNav items={mobile.map((i) => ({ ...i, label: t(i.labelKey) }))} />
    </div>
  );
}
