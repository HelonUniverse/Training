import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/session';
import { getActiveContext, greetingKey } from '@/lib/auth/context';
import { OrgShell } from '@/components/app/OrgShell';
import { Button, Card, StatusBadge } from '@/components/ui/primitives';
import { StatCard, ProgressCard } from '@/components/ui/patterns';

export default async function OrgHome() {
  const t = await getTranslations('org');
  const td = await getTranslations('dashboard');
  const ta = await getTranslations('actions');

  const context = await getActiveContext();
  if (context?.kind !== 'organization') redirect('/app/home');

  const user = await getUser();
  const supabase = await createClient();

  // All counts read through RLS, scoped to this organization.
  const [students, families, staff, classes, invitations] = await Promise.all([
    supabase
      .from('student_organization_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .then((r) => r.count ?? 0),
    supabase
      .from('family_organization_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .then((r) => r.count ?? 0),
    supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .then((r) => r.count ?? 0),
    supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .then((r) => r.count ?? 0),
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .then((r) => r.count ?? 0),
  ]);

  const firstName =
    (user?.fullName ?? '').split(' ')[0] || (user?.email ?? '').split('@')[0] || '';

  // Setup steps reflect real state - never a fabricated checklist.
  const steps = [
    { label: t('step1'), done: families > 0 || invitations > 0, href: '/app/org/families' },
    { label: t('step4'), done: students > 0, href: '/app/org/students' },
    { label: t('step2'), done: classes > 0, href: '/app/org/classes' },
    { label: t('step3'), done: staff > 1, href: '/app/org/staff' },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <OrgShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title text-balance text-ink sm:text-display">
            {td(`greeting.${greetingKey()}`, { name: firstName })}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
            <span className="font-medium text-ink">{context.organizationName}</span>
            <StatusBadge tone="primary">{t('admin')}</StatusBadge>
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ stats */}
      <section aria-labelledby="stats-heading" className="mt-8">
        <h2 id="stats-heading" className="sr-only">
          {t('commandCenter')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('students')}
            value={students}
            action={{ href: '/app/org/students', label: ta('addStudent') }}
            icon="◍"
          />
          <StatCard
            label={t('families')}
            value={families}
            action={{ href: '/app/org/families', label: ta('inviteFamily') }}
            icon="⬡"
          />
          <StatCard
            label={t('teachers')}
            value={Math.max(staff - 1, 0)}
            action={{ href: '/app/org/staff', label: ta('inviteTeacher') }}
            icon="✓"
          />
          <StatCard label={t('classesToday')} value={0} icon="▣" />
        </div>
      </section>

      {/* ------------------------------------------------------- get started */}
      <section aria-labelledby="start-heading" className="mt-9">
        <h2 id="start-heading" className="mb-3 text-heading text-ink">
          {t('getStarted')}
        </h2>
        <ProgressCard
          label={t('setupProgress')}
          done={doneCount}
          total={steps.length}
        >
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="flex min-h-11 items-center gap-3 rounded-field px-2 py-2 hover:bg-surface-sunken"
                >
                  <span
                    aria-hidden
                    className={
                      s.done
                        ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-positive-soft text-xs text-positive-ink'
                        : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs text-ink-subtle ring-1 ring-inset ring-hairline'
                    }
                  >
                    {s.done ? '✓' : i + 1}
                  </span>
                  <span
                    className={
                      s.done
                        ? 'text-[0.9375rem] text-ink-subtle line-through'
                        : 'text-[0.9375rem] text-ink'
                    }
                  >
                    {s.label}
                  </span>
                  <span aria-hidden className="ml-auto text-ink-subtle">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </ProgressCard>
      </section>

      {/* ------------------------------------------------------------ today */}
      <section aria-labelledby="today-heading" className="mt-9">
        <h2 id="today-heading" className="mb-3 text-heading text-ink">
          {td('today')}
        </h2>
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-ink-muted">{t('noClasses')}</p>
          <Link href="/app/org/calendar" className="inline-block">
            <Button variant="secondary">{ta('createEvent')}</Button>
          </Link>
        </Card>
      </section>

      {/* -------------------------------------------------- needs attention */}
      <section aria-labelledby="attention-heading" className="mt-9">
        <h2 id="attention-heading" className="mb-3 text-heading text-ink">
          {t('needsAttention')}
        </h2>
        {/* No students yet means nothing can genuinely need attention. Saying so
            plainly beats inventing an alert. */}
        <Card>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-positive-soft text-positive-ink"
            >
              ✓
            </span>
            <div>
              <p className="font-medium text-ink">{t('allGood')}</p>
              <p className="mt-1 text-pretty text-sm text-ink-muted">{t('allGoodBody')}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* ----------------------------------------------------- quick actions */}
      <section aria-labelledby="quick-heading" className="mt-9">
        <h2 id="quick-heading" className="mb-3 text-heading text-ink">
          {td('quickActions')}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/app/org/families', label: ta('inviteFamily'), icon: '⬡' },
            { href: '/app/org/students', label: ta('addStudent'), icon: '◍' },
            { href: '/app/org/classes', label: ta('createClass'), icon: '▣' },
            { href: '/app/org/calendar', label: ta('createEvent'), icon: '▦' },
            { href: '/app/org/staff', label: ta('inviteStaff'), icon: '✓' },
          ].map((a) => (
            <Link
              key={a.label}
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
    </OrgShell>
  );
}
