import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ParentShell } from '@/components/app/ParentShell';
import { PageHeader } from '@/components/ui/primitives';
import { AddCurriculumForm } from '@/components/learning/AddCurriculumForm';
import { createClient } from '@/lib/supabase/server';
import { getActiveStudent } from '@/lib/auth/context';

/**
 * Bring the curriculum you already use.
 *
 * The provider list is a CONVENIENCE, so a parent need not type "Teaching
 * Textbooks" by hand. It is not a list of partners, it does not imply we talk
 * to any of them, and "Another curriculum" is a first-class choice rather than
 * an escape hatch at the bottom.
 */
export default async function Page() {
  const t = await getTranslations('learn');
  const supabase = await createClient();
  const { students, activeId } = await getActiveStudent();
  const student = students.find((s) => s.id === activeId) ?? students[0] ?? null;

  // The family comes from the student's own row rather than a session guess:
  // add_family_course writes against it and RLS will refuse a family the caller
  // does not belong to, so a wrong value here fails loudly rather than quietly.
  const { data: studentRow } = student
    ? await supabase.from('students').select('family_id').eq('id', student.id).maybeSingle()
    : { data: null };

  const [{ data: providers }, { data: subjects }] = await Promise.all([
    supabase
      .from('curriculum_providers')
      .select('id, slug, name, website_url')
      .eq('scope', 'catalog')
      .eq('active', true)
      .order('is_first_party', { ascending: false })
      .order('name'),
    supabase.from('subjects').select('id, name').eq('active', true).order('name').limit(40),
  ]);

  return (
    <ParentShell showStudentSwitcher={false}>
      <PageHeader
        eyebrow={
          <Link href="/app/learning" className="inline-flex min-h-11 items-center hover:underline">
            ← {t('backToLearn')}
          </Link>
        }
        title={t('addCurriculum')}
        subtitle={t('addCurriculumHelp')}
      />

      <AddCurriculumForm
        familyId={studentRow?.family_id ?? ''}
        studentId={student?.id ?? ''}
        studentName={student?.name ?? ''}
        providers={(providers ?? []).map((p) => ({ slug: p.slug, name: p.name }))}
        subjects={(subjects ?? []).map((s) => ({ id: s.id, name: s.name }))}
      />
    </ParentShell>
  );
}
