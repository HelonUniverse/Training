import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader, Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/patterns';
import { createClient } from '@/lib/supabase/server';
import { getActiveStudent } from '@/lib/auth/context';
import { getSkillStandards, getStandardsVisibility } from '@/server/queries/standards';

/**
 * One skill, for a family.
 *
 * The order of this page is the argument. Evidence first, because that is what
 * the family did. The standards reference is LAST, quiet, and headed "Related
 * standards" - a note about how this happens to line up with an external map,
 * not a target the child is being measured against.
 *
 * With standards_visibility = 'hidden' the reference section is not rendered,
 * not queried, and not hinted at. Everything above it is unchanged, which is
 * the test: the page is complete without it.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('learn');
  const ts = await getTranslations('standards');
  const supabase = await createClient();
  const { students, activeId } = await getActiveStudent();
  const student = students.find((s) => s.id === activeId) ?? students[0] ?? null;
  if (!student) notFound();

  const { data: skill } = await supabase
    .from('skills')
    .select('id, name, description')
    .eq('id', id)
    .maybeSingle();
  if (!skill) notFound();

  const { data: evidence } = await supabase
    .from('learning_evidence')
    .select('id, occurred_on, relation, note, created_at')
    .eq('student_id', student.id)
    .eq('skill_id', id)
    .order('occurred_on', { ascending: false, nullsFirst: false })
    .limit(50);

  // The active-student context does not carry the family id, and the
  // preference is a family setting. One small read rather than widening a
  // context every page pays for.
  const { data: studentRow } = await supabase
    .from('students')
    .select('family_id')
    .eq('id', student.id)
    .maybeSingle();

  const visibility = await getStandardsVisibility(studentRow?.family_id ?? null);
  const references = await getSkillStandards(id, visibility);

  return (
    <ParentShell>
      <PageHeader title={skill.name} />

      {skill.description ? (
        <p className="text-sm text-ink-muted">{skill.description}</p>
      ) : null}

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">{t('evidenceHeading')}</h2>
        <p className="text-sm text-ink-muted">{t('skillsHelp')}</p>

        {(evidence ?? []).length === 0 ? (
          <EmptyState icon="◇" title={t('empty.skillsTitle')} body={t('empty.skillsBody')} />
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card bg-surface ring-1 ring-inset ring-hairline/70">
            {(evidence ?? []).map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-ink">{t(`relation.${row.relation}`)}</span>
                  <span className="text-sm text-ink-muted">
                    {row.occurred_on ?? new Date(row.created_at).toISOString().slice(0, 10)}
                  </span>
                </div>
                {row.note ? <p className="mt-1 text-sm text-ink-muted">{row.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Secondary by construction: last on the page, smaller type, and gone
          entirely when a family has chosen `hidden`. */}
      {visibility !== 'hidden' && references.length > 0 ? (
        <section className="mt-8">
          <Card>
            <h2 className="text-base font-semibold text-ink">{ts('relatedHeading')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{ts('relatedHelp')}</p>
            <ul className="mt-3 space-y-2">
              {references.map((reference) => (
                <li key={reference.mappingId} className="text-sm">
                  <p className="text-ink">
                    {reference.frameworkName}
                    {reference.versionLabel ? ` · ${reference.versionLabel}` : ''}
                  </p>
                  <p className="text-ink-subtle">
                    {reference.code}
                    {reference.gradeReference
                      ? ` · ${ts('gradeReference', { grade: reference.gradeReference })}`
                      : ''}
                  </p>
                  {reference.statement ? (
                    <p className="mt-0.5 text-ink-muted">{reference.statement}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <p className="mt-6 text-sm">
        <Link href="/app/learning" className="text-ink-muted underline">
          {t('backToLearn')}
        </Link>
      </p>
    </ParentShell>
  );
}
