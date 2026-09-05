'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui/primitives';

/**
 * Five items maximum, each a 44px+ touch target, with the safe-area inset so it
 * clears the iPhone home indicator.
 */
export function MobileBottomNav({
  items,
}: {
  items: Array<{ href: string; label: string; icon: string }>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/app/more' && pathname.startsWith(item.href + '/'));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem]',
                  active ? 'font-medium text-primary' : 'text-ink-subtle',
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
