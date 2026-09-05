import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';
import { getActiveStudent, greetingKey } from '@/lib/auth/context';
import { ParentShell } from '@/components/app/ParentShell';
import { Button, Card, StatusBadge } from '@/components/ui/primitives';
import { StatCard } from '@/components/ui/patterns';
import { AIInsightCard } from '@/components/ui/interactive';

export default async function ParentHome() {
  const t = await getTranslations('dashboard');
  const ta = await getTranslations('actions');
  const ts = await getTranslations('status');

  const user = await getUser();
  const { activeId } = await getActiveStudent();
  const supabase = await createClient();

  // Everything below reads through RLS as the signed-in guardian.
  const studentFilter = activeId && activeId !== 'all' ? activeId : null;

  const [portfolioRes, lessonsRes, documentsRes, eventsRes] = await Promise.all([
    supabase.from('portfolio_items').select('id', { count: 'exact', head: true }),
    supabase
      .from('lessons')
      .select('id, title, scheduled_for')
      .gte('scheduled_for', new Date().toISOString().slice(0, 10))
      .order('scheduled_for', { ascending: true })
      .limit(3),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('calendar_event_instances').select('id', { count: 'exact', head: true }),
  ]);

  const portfolio = portfolioRes.count ?? 0;
  const documents = documentsRes.count ?? 0;
  const events = eventsRes.count ?? 0;
  const lessons = lessonsRes.data ?? [];

  void studentFilter;

  const firstName =
    (user?.fullName ?? '').split(' ')[0] || (user?.email ?? '').split('@')[0] || '';
  const greeting = t(`greeting.${greetingKey()}`, { name: firstName });

  return (
    <ParentShell allowAll>
      <h1 className="text-title text-balance text-ink sm:text-display">{greeting}</h1>

      {/* ------------------------------------------------------------ today */}
      <section aria-labelledby="today-heading" className="mt-8">
        <h2 id="today-heading" className="mb-3 text-heading text-ink">
          {t('today')}
        </h2>
        {lessons.length === 0 ? (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-ink-muted">{t('noLessons')}</p>
            <Link href="/app/learning" className="inline-block">
              <Button variant="secondary">{t('planFirstLesson')}</Button>
            </Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {lessons.map((l) => (
              <Card as="li" key={l.id} className="flex items-center justify-between gap-4">
                <span className="font-medium text-ink">{l.title}</span>
                <StatusBadge tone="primary">{l.scheduled_for}</StatusBadge>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------- your homeschool */}
      <section aria-labelledby="homeschool-heading" className="mt-9">
        <h2 id="homeschool-heading" className="mb-3 text-heading text-ink">
          {t('yourHomeschool')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* A count is shown only when there is something to count. Otherwise
              a human state - never "0%", which reads as failure. */}
          <StatCard
            label={t('cards.portfolio')}
            {...(portfolio > 0
              ? { value: portfolio }
              : { state: ts('noEvidenceYet'), tone: 'neutral' as const })}
            action={{ href: '/app/portfolio', label: t('cards.addWork') }}
            icon="✦"
          />
          <StatCard
            label={t('cards.learning')}
            state={ts('gettingStarted')}
            action={{ href: '/app/learning', label: t('cards.viewPlan') }}
            icon="✎"
          />
          <StatCard
            label={t('cards.records')}
            {...(documents > 0
              ? { value: documents }
              : { state: ts('gettingOrganized'), tone: 'neutral' as const })}
            action={{ href: '/app/records', label: t('cards.viewRecords') }}
            icon="▥"
          />
          <StatCard
            label={t('cards.calendar')}
            {...(events > 0
              ? { value: events }
              : { state: ts('nothingScheduled'), tone: 'neutral' as const })}
            action={{ href: '/app/calendar', label: t('cards.openCalendar') }}
            icon="▦"
          />
        </div>
      </section>

      {/* -------------------------------------------------------- next step */}
      <section aria-labelledby="next-heading" className="mt-9">
        <h2 id="next-heading" className="mb-3 text-heading text-ink">
          {t('nextStep')}
        </h2>
        <AIInsightCard
          title={t('buildFirstWeek')}
          body={t('buildFirstWeekBody')}
          action={
            <Link href="/app/learning" className="inline-block">
              <Button>{t('createFirstWeek')}</Button>
            </Link>
          }
        />
      </section>

      {/* ----------------------------------------------------- quick actions */}
      <section aria-labelledby="quick-heading" className="mt-9">
        <h2 id="quick-heading" className="mb-3 text-heading text-ink">
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/app/portfolio', label: ta('uploadWork'), icon: '⬆' },
            { href: '/app/learning', label: ta('planLesson'), icon: '✎' },
            { href: '/app/portfolio', label: ta('addActivity'), icon: '＋' },
            { href: '/app/documents', label: ta('uploadDocument'), icon: '❐' },
            { href: '/app/home', label: ta('askAi'), icon: '✦' },
          ].map((a, i) => (
            <Link
              key={`${a.href}-${i}`}
              href={a.href}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card bg-surface p-4 text-center shadow-card ring-1 ring-inset ring-hairline/70 transition-shadow hover:shadow-raised"
            >
              <span aria-hidden className="text-xl text-primary">
                {a.icon}
              </span>
              <span className="text-sm font-medium leading-tight text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

    </ParentShell>
  );
}
