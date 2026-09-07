import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Reading the standards reference layer, from the family side.
 *
 * Everything here is OPTIONAL. Every function returns an empty result rather
 * than throwing when there is nothing to show, and every caller renders
 * correctly without it. That is not defensive coding - it is the acceptance
 * criterion: a family who never looks at a standards code must be able to use
 * the entire learning system, so no learning surface may DEPEND on this file.
 */

export type StandardsVisibility = 'hidden' | 'simple' | 'detailed';

export type SkillStandardReference = {
  mappingId: string;
  standardId: string;
  code: string;
  statement: string | null;
  frameworkName: string;
  versionLabel: string | null;
  gradeReference: string | null;
  relation: string;
};

/** A family's chosen visibility. Defaults to `simple` when we cannot tell. */
export async function getStandardsVisibility(familyId: string | null): Promise<StandardsVisibility> {
  if (!familyId) return 'simple';
  const supabase = await createClient();
  const { data } = await supabase
    .from('families')
    .select('standards_visibility')
    .eq('id', familyId)
    .maybeSingle();
  return (data?.standards_visibility as StandardsVisibility | undefined) ?? 'simple';
}

/**
 * Approved references for a skill.
 *
 * Returns [] when visibility is `hidden` WITHOUT querying: a family who turned
 * this off should not have the lookup happen at all, and the cheapest way to be
 * sure a preference is honoured everywhere is to honour it before the query.
 *
 * RLS does the rest: 0076 restricts skill_standards reads to `approved`, so a
 * proposal under review is invisible here even if this code forgot to filter.
 */
export async function getSkillStandards(
  skillId: string,
  visibility: StandardsVisibility,
): Promise<SkillStandardReference[]> {
  if (visibility === 'hidden') return [];

  const supabase = await createClient();
  const { data: mappings } = await supabase
    .from('skill_standards')
    .select('id, standard_id, relation')
    .eq('skill_id', skillId)
    .eq('status', 'approved')
    .eq('active', true);

  const standardIds = [...new Set((mappings ?? []).map((m) => m.standard_id))];
  if (standardIds.length === 0) return [];

  const { data: standards } = await supabase
    .from('standards')
    .select('id, code, statement, grade_band, normalized_grade, framework_id, framework_version_id')
    .in('id', standardIds);

  const frameworkIds = [...new Set((standards ?? []).map((s) => s.framework_id))];
  const versionIds = [...new Set((standards ?? []).map((s) => s.framework_version_id).filter(Boolean))] as string[];

  const [{ data: frameworks }, { data: versions }] = await Promise.all([
    frameworkIds.length
      ? supabase.from('standards_frameworks').select('id, name').in('id', frameworkIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    versionIds.length
      ? supabase.from('standards_framework_versions').select('id, version_label').in('id', versionIds)
      : Promise.resolve({ data: [] as { id: string; version_label: string }[] }),
  ]);

  const frameworkName = new Map((frameworks ?? []).map((f) => [f.id, f.name]));
  const versionLabel = new Map((versions ?? []).map((v) => [v.id, v.version_label]));
  const standardById = new Map((standards ?? []).map((s) => [s.id, s]));

  return (mappings ?? []).flatMap((m) => {
    const standard = standardById.get(m.standard_id);
    if (!standard) return [];
    return [{
      mappingId: m.id,
      standardId: standard.id,
      code: standard.code,
      statement: visibility === 'detailed' ? standard.statement : null,
      frameworkName: frameworkName.get(standard.framework_id) ?? '',
      versionLabel: standard.framework_version_id
        ? versionLabel.get(standard.framework_version_id) ?? null
        : null,
      gradeReference: standard.normalized_grade ?? standard.grade_band,
      relation: m.relation,
    }];
  });
}
