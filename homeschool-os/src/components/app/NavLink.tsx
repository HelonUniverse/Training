'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui/primitives';

export function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex min-h-11 items-center gap-3 rounded-field px-3 py-2 text-[0.9375rem] transition-colors',
        active
          ? 'bg-primary-soft font-medium text-primary-ink'
          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
      )}
    >
      <span aria-hidden className="w-5 text-center text-base">
        {icon}
      </span>
      {label}
    </Link>
  );
}
