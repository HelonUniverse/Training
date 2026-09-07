import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PossibleSkill, SuggestionField } from '@/components/intake/SmartIntakeReview';

/**
 * What the review card needs, read through RLS as the caller.
 *
 * Every query here is an ordinary authenticated read. There is no service-role
 * client in this path and there must never be one: a page that renders another
 * family's suggestions because a server component forgot to filter is exactly
 * the failure the policies exist to prevent, and the way to keep that guarantee
 * is to never hold the credential that could bypass them.
 */

const SKILL_PREFIX = 'possible_skill:';

export type IntakeReview = {
  suggestionId: string;
  analysisStatus: string;
  fields: SuggestionField[];
  skills: PossibleSkill[];
};

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function getIntakeReview(
  documentId: string,
  human: { title: string | null; documentDate: string | null },
): Promise<IntakeReview | null> {
  const supabase = await createClient();

  const { data: analysis } = await supabase
    .from('document_ai_analysis')
    .select('id, analysis_status')
    .eq('document_id', documentId)
    .order('analysis_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysis) return null;

  const { data: suggestion } = await supabase
    .from('ai_suggestions')
    .select('id, status')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!suggestion) {
    return {
      suggestionId: '',
      analysisStatus: analysis.analysis_status,
      fields: [],
      skills: [],
    };
  }

  const { data: rows } = await supabase
    .from('ai_suggestion_fields')
    .select('id, field_key, suggested_value, confidence_band, evidence, status, accepted_value, conflicts_with_human')
    .eq('suggestion_id', suggestion.id)
    .order('created_at');

  const fields: SuggestionField[] = [];
  const skillNames: { fieldId: string; name: string }[] = [];

  for (const row of rows ?? []) {
    if (row.field_key.startsWith(SKILL_PREFIX)) {
      // Already confirmed once: do not offer it again.
      if (row.status === 'pending') {
        skillNames.push({ fieldId: row.id, name: asText(row.suggested_value) });
      }
      continue;
    }
    fields.push({
      id: row.id,
      fieldKey: row.field_key,
      suggestedValue: asText(row.suggested_value),
      confidenceBand: row.confidence_band,
      evidence: row.evidence,
      status: row.status,
      acceptedValue: row.accepted_value === null ? null : asText(row.accepted_value),
      conflictsWithHuman: row.conflicts_with_human,
      // The parent's own value, passed in from the document row so the card can
      // show it BESIDE the suggestion rather than replacing it.
      humanValue:
        row.field_key === 'title' ? human.title
        : row.field_key === 'date' ? human.documentDate
        : null,
    });
  }

  // Map suggested skill NAMES onto skills we actually track. A name that
  // matches nothing is dropped rather than shown: offering a parent a skill
  // that does not exist in the graph would produce evidence pointing nowhere.
  const skills: PossibleSkill[] = [];
  if (skillNames.length > 0) {
    const { data: known } = await supabase
      .from('skills')
      .select('id, name')
      .eq('active', true)
      .in('name', skillNames.map((s) => s.name));

    const byName = new Map((known ?? []).map((s) => [s.name.toLowerCase(), s.id]));
    for (const entry of skillNames) {
      const id = byName.get(entry.name.toLowerCase()) ?? null;
      if (id) skills.push({ fieldId: entry.fieldId, skillId: id, name: entry.name });
    }
  }

  return {
    suggestionId: suggestion.id,
    analysisStatus: analysis.analysis_status,
    fields,
    skills,
  };
}
