/**
 * Proposing skill <-> standard mappings.
 *
 * DETERMINISTIC FIRST, and mostly deterministic only. Four cheap, explainable
 * strategies run before anything semantic is considered:
 *
 *   1. an exact code already mapped elsewhere in an earlier framework version
 *   2. an approved mapping that already exists (nothing to propose)
 *   3. a canonical alias match on either side
 *   4. subject and domain narrowing, which shrinks the candidate set enough
 *      that a person can just read it
 *
 * Only what survives all four is a candidate for semantic help, and even then
 * the output is a SUGGESTION. A model call costs money and produces a claim
 * with weaker provenance than a code match; spending it where string equality
 * would have answered is both wasteful and worse.
 *
 * Nothing here writes an approved mapping. The status of anything proposed is
 * `proposed`, and 0076's trigger refuses to let confidence stand in for review.
 */

export type SkillCandidate = {
  skillId: string;
  code: string | null;
  name: string;
  aliases: string[];
  subject: string | null;
};

export type StandardCandidate = {
  standardId: string;
  code: string;
  statement: string | null;
  normalizedSubject: string | null;
  domainCode: string | null;
  aliases: string[];
};

export type ProposedMapping = {
  skillId: string;
  standardId: string;
  relation: 'exact' | 'partial' | 'supporting' | 'broader' | 'narrower' | 'related';
  provenance: 'nestra_reviewed' | 'imported' | 'ai_suggested';
  strategy: 'existing_approved' | 'exact_code' | 'alias' | 'subject_domain' | 'semantic';
  confidence: number | null;
  rationale: string;
};

export type ProposalInput = {
  skills: SkillCandidate[];
  standards: StandardCandidate[];
  /** (skillId, standardId) pairs already approved. */
  existing: Set<string>;
};

const key = (skillId: string, standardId: string) => `${skillId}::${standardId}`;

export function proposeMappings(input: ProposalInput): {
  proposals: ProposedMapping[];
  needsSemantic: StandardCandidate[];
} {
  const proposals: ProposedMapping[] = [];
  const resolved = new Set<string>();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  for (const standard of input.standards) {
    // 2. Already approved. Nothing to propose, and nothing to spend.
    const already = input.skills.find((s) => input.existing.has(key(s.skillId, standard.standardId)));
    if (already) { resolved.add(standard.standardId); continue; }

    // 1. Exact code equality on either side's canonical code.
    const exact = input.skills.find(
      (s) => s.code && norm(s.code) === norm(standard.code));
    if (exact) {
      proposals.push({ skillId: exact.skillId, standardId: standard.standardId,
        relation: 'exact', provenance: 'imported', strategy: 'exact_code', confidence: null,
        rationale: `the skill and the standard carry the same code (${standard.code})` });
      resolved.add(standard.standardId);
      continue;
    }

    // 3. Canonical aliases, both directions.
    const standardAliases = new Set([standard.code, ...standard.aliases].map(norm));
    const aliased = input.skills.find(
      (s) => [s.code ?? '', ...s.aliases].some((a) => a && standardAliases.has(norm(a))));
    if (aliased) {
      proposals.push({ skillId: aliased.skillId, standardId: standard.standardId,
        relation: 'related', provenance: 'imported', strategy: 'alias', confidence: null,
        rationale: 'a canonical alias matches on both sides' });
      resolved.add(standard.standardId);
      continue;
    }

    // 4. Subject and domain narrowing. Only proposed when it narrows to ONE
    //    skill: "here are nine candidates" is not a proposal, it is a shrug.
    const narrowed = input.skills.filter(
      (s) => s.subject && standard.normalizedSubject
             && norm(s.subject) === norm(standard.normalizedSubject));
    if (narrowed.length === 1) {
      proposals.push({ skillId: narrowed[0]!.skillId, standardId: standard.standardId,
        relation: 'related', provenance: 'imported', strategy: 'subject_domain', confidence: null,
        rationale: `the only ${standard.normalizedSubject} skill in scope` });
      resolved.add(standard.standardId);
    }
  }

  return {
    proposals,
    needsSemantic: input.standards.filter((s) => !resolved.has(s.standardId)),
  };
}

/**
 * The shape an AI proposal must take to be storable. Note what is NOT here:
 * a status. A model cannot express `approved`, because the column it would have
 * to write is one 0076's trigger defends.
 */
export function asAiSuggestion(
  skillId: string, standardId: string, confidence: number, rationale: string,
): ProposedMapping {
  return {
    skillId, standardId,
    relation: 'related',
    provenance: 'ai_suggested',
    strategy: 'semantic',
    confidence: Math.max(0, Math.min(1, confidence)),
    rationale,
  };
}
