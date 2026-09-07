import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Card, StatusBadge } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { MarkComplete } from '@/components/learning/MarkComplete';
import { createClient } from '@/lib/supabase/server';
import { getActiveStudent } from '@/lib/auth/context';

/**
 * Learn.
 *
 * STEP 5 turns this from a placeholder into two things that are real:
 * Curriculum, which works, and Skills, which shows only what a human has
 * actually confirmed. There is deliberately no "Today" yet - an adaptive daily
 * plan is a later step, and a tab that showed a plausible-looking day nobody
 * had thought about would be worse than an absent one.
 */

export default async function Page() {
  const t = await getTranslations('learn');
  const tn = await getTranslations('nav');
  const supabase = await createClient();
  const { students, activeId } = await getActiveStudent();
  const student = students.find((s) => s.id === activeId) ?? students[0] ?? null;

  if (!student) {
    return (
      <ParentShell>
        <PageHeader title={tn('learning')} />
        <EmptyState icon="✎" title={t('empty.title')} body={t('empty.body')} />
      </ParentShell>
    );
  }

  const [{ data: enrollments }, { data: evidence }] = await Promise.all([
    supabase
      .from('student_course_enrollments')
      .select('id, status, integration_mode, started_on, course_id')
      .eq('student_id', student.id)
      .eq('status', 'active'),
    supabase
      .from('learning_evidence')
      .select('id, occurred_on, relation, skill_id')
      .eq('student_id', student.id)
      .order('occurred_on', { ascending: false })
      .limit(50),
  ]);

  // Skills are grouped from CONFIRMED evidence only. A skill with no confirmed
  // evidence does not appear: this page answers "what has this child shown",
  // not "what could a model be persuaded to say".
  // Two small follow-up reads rather than nested selects: PostgREST embedding
  // across four tables produces a type the generator cannot narrow, and a page
  // that needs `as unknown as` to compile is a page whose shape nobody checks.
  const courseIds = [...new Set((enrollments ?? []).map((e) => e.course_id))];
  const skillIds = [...new Set((evidence ?? []).map((e) => e.skill_id))];

  const [{ data: courses }, { data: skillRows }] = await Promise.all([
    courseIds.length
      ? supabase
          .from('courses')
          .select('id, name, external_url, provider_id')
          .in('id', courseIds)
      : Promise.resolve({ data: [] as { id: string; name: string; external_url: string | null; provider_id: string }[] }),
    skillIds.length
      ? supabase.from('skills').select('id, name').in('id', skillIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const providerIds = [...new Set((courses ?? []).map((c) => c.provider_id))];
  const { data: providerRows } = providerIds.length
    ? await supabase.from('curriculum_providers').select('id, name').in('id', providerIds)
    : { data: [] as { id: string; name: string }[] };

  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));
  const providerById = new Map((providerRows ?? []).map((p) => [p.id, p.name]));
  const skillNameById = new Map((skillRows ?? []).map((s) => [s.id, s.name]));

  const bySkill = new Map<string, { name: string; count: number }>();
  for (const row of evidence ?? []) {
    const name = skillNameById.get(row.skill_id);
    if (!name) continue;
    const found = bySkill.get(row.skill_id);
    if (found) found.count += 1;
    else bySkill.set(row.skill_id, { name, count: 1 });
  }

  return (
    <ParentShell>
      <PageHeader
        title={tn('learning')}
        action={
          <Link
            href="/app/learning/add"
            className="inline-flex min-h-11 items-center rounded-button bg-ink px-4 text-sm font-medium text-surface"
          >
            {t('addCurriculum')}
          </Link>
        }
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('curriculum')}</h2>

        {(enrollments ?? []).length === 0 ? (
          <EmptyState
            icon="◈"
            title={t('empty.curriculumTitle')}
            body={t('empty.curriculumBody')}
            action={
              <Link
                href="/app/learning/add"
                className="inline-flex min-h-11 items-center rounded-button bg-ink px-5 text-sm font-medium text-surface"
              >
                {t('addCurriculum')}
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {(enrollments ?? []).map((enrollment) => {
              const course = courseById.get(enrollment.course_id);
              if (!course) return null;
              return (
                <li key={enrollment.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{course.name}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {providerById.get(course.provider_id) ?? ''}
                        </p>
                      </div>
                      {/* THE HONESTY BADGE. `Integrated` is reserved for a real,
                          live integration and nothing in STEP 5 has one, so this
                          renders `Linked website` or `Manual tracking`. */}
                      <StatusBadge tone="neutral">
                        {t(`mode.${enrollment.integration_mode}`)}
                      </StatusBadge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.external_url ? (
                        <a
                          href={course.external_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-11 items-center rounded-button border border-hairline px-4 text-sm font-medium text-ink"
                        >
                          {t('openLesson')}
                        </a>
                      ) : null}
                      <MarkComplete enrollmentId={enrollment.id} studentId={student.id} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('skills')}</h2>
        {/* "Learning evidence", never "mastered skills". The distinction is the
            whole reason this section exists in STEP 5 rather than waiting. */}
        <p className="text-sm text-ink-muted">{t('skillsHelp')}</p>

        {bySkill.size === 0 ? (
          <EmptyState icon="◇" title={t('empty.skillsTitle')} body={t('empty.skillsBody')} />
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-hairline/70">
            {[...bySkill.entries()].map(([id, skill]) => (
              <li key={id}>
                {/* Navigating by href rather than a row click handler: a row
                    clicked mid-hydration goes nowhere, and a link works before
                    any JavaScript has arrived. */}
                <Link
                  href={`/app/learning/skill/${id}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-ink">{skill.name}</span>
                  <span className="text-sm text-ink-muted">
                    {t('evidenceCount', { count: skill.count })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ParentShell>
  );
}
