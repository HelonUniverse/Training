import Link from 'next/link';
import { getTranslations, getFormatter } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/primitives';

/**
 * The few things worth interrupting someone for.
 *
 * Rows are written by database triggers at the moment the event happens
 * (migration 0063), and there are only two kinds: a file that could not be
 * kept, and something shared with you. Nothing else. A feed that announced
 * every save would be scrolled past, and the first notification that mattered
 * would be scrolled past with it.
 *
 * Renders nothing at all when there is nothing to say - not an empty card
 * headed "Notifications", which is itself a small daily interruption.
 */
export async function NotificationList() {
  const supabase = await createClient();
  const t = await getTranslations('notifications');
  const format = await getFormatter();

  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, link, created_at')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const items = data ?? [];
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="notifications-heading" className="mt-9">
      <h2 id="notifications-heading" className="mb-3 text-heading text-ink">
        {t('heading')}
      </h2>
      <ul className="space-y-2">
        {items.map((n) => {
          const inner = (
            <>
              <p className="font-medium text-ink">{n.title}</p>
              {n.body ? <p className="mt-1 text-pretty text-sm text-ink-muted">{n.body}</p> : null}
              <p className="mt-2 text-xs text-ink-subtle">
                {format.relativeTime(new Date(n.created_at))}
              </p>
            </>
          );
          return (
            <Card as="li" key={n.id}>
              {n.link ? (
                <Link href={n.link} className="block">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </Card>
          );
        })}
      </ul>
    </section>
  );
}
