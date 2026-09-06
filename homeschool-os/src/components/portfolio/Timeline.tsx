import Link from 'next/link';
import { getTranslations, getFormatter } from 'next-intl/server';
import { StatusBadge, cx } from '@/components/ui/primitives';
import { DocumentPreview } from './DocumentPreview';
import type { TimelineEntry } from '@/lib/portfolio/queries';
import { calendarDate } from '@/lib/dates';

/**
 * The year, as a story.
 *
 * Months are headings, not filters; entries are cards with the child's own
 * photograph on them, not rows with a filename and a size. That difference is
 * the entire brief for this screen - a parent should be able to scroll it in
 * April and feel that something happened, which no list of files has ever done.
 */

const KIND_ICON: Record<TimelineEntry['kind'], string> = {
  portfolio: '✦',
  activity: '☀',
  reading: '❧',
};

export async function Timeline({
  months,
  studentNames,
  subjectNames,
}: {
  months: Array<{ month: string; items: TimelineEntry[] }>;
  studentNames: Map<string, string>;
  subjectNames: Map<string, string>;
}) {
  const t = await getTranslations('portfolio');
  const tv = await getTranslations('vocab');
  const format = await getFormatter();
  const showChild = studentNames.size > 1;

  return (
    <div className="space-y-10">
      {months.map(({ month, items }) => (
        <section key={month} aria-labelledby={`month-${month}`}>
          <h2
            id={`month-${month}`}
            className="sticky top-0 z-10 -mx-1 bg-canvas/90 px-1 py-2 text-sm font-medium uppercase tracking-wide text-ink-subtle backdrop-blur"
          >
            {monthLabel(month, format)}
          </h2>

          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((entry) => {
              const href =
                entry.kind === 'portfolio' ? `/app/portfolio/${entry.id}` : undefined;
              const cover = entry.documentIds[0];
              const subject = entry.subjectId ? subjectNames.get(entry.subjectId) : null;

              const body = (
                <>
                  {cover ? (
                    <DocumentPreview
                      documentId={cover}
                      alt={entry.title}
                      className="aspect-[4/3] w-full"
                      rounded={false}
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex aspect-[4/3] w-full items-center justify-center bg-primary-soft text-3xl text-primary-ink"
                    >
                      {KIND_ICON[entry.kind]}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium text-ink">{entry.title}</p>
                      {entry.documentIds.length > 1 ? (
                        <StatusBadge>{t('photoCount', { count: entry.documentIds.length })}</StatusBadge>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-ink-muted">
                      {dayLabel(entry.occurredOn, format)}
                      {showChild ? ` · ${studentNames.get(entry.studentId) ?? ''}` : ''}
                      {subject ? ` · ${subject}` : ''}
                    </p>

                    {entry.description ? (
                      <p className="mt-2 line-clamp-2 text-pretty text-sm text-ink-muted">
                        {entry.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs uppercase tracking-wide text-ink-subtle">
                      {entry.kind === 'reading'
                        ? tv(`readingType.${entry.detail}`)
                        : entry.kind === 'activity'
                          ? tv(`activityKind.${entry.detail}`)
                          : tv(`activityType.${entry.detail}`)}
                      {entry.minutes ? ` · ${t('minutes', { count: entry.minutes })}` : ''}
                    </p>
                  </div>
                </>
              );

              const cardClass = cx(
                'block overflow-hidden rounded-card bg-surface shadow-card',
                'ring-1 ring-inset ring-hairline/70 transition-all',
                href && 'hover:shadow-raised hover:ring-primary/40',
              );

              return (
                <li key={`${entry.kind}-${entry.id}`}>
                  {href ? (
                    <Link href={href} className={cardClass}>
                      {body}
                    </Link>
                  ) : (
                    <article className={cardClass}>{body}</article>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Format = Awaited<ReturnType<typeof getFormatter>>;

function monthLabel(month: string, format: Format) {
  const date = calendarDate(`${month}-01`);
  return date ? format.dateTime(date, { month: 'long', year: 'numeric' }) : month;
}

function dayLabel(value: string, format: Format) {
  const date = calendarDate(value);
  return date ? format.dateTime(date, { month: 'short', day: 'numeric' }) : '';
}
