/**
 * What KIND of document is this?
 *
 * The rule this exists to enforce: the first ingestion uses the authority's own
 * standards publication, and not a parent guide, instructional guide,
 * progression document, assessment blueprint, correlation spreadsheet or
 * third-party export "merely because they are easier to parse".
 *
 * That temptation is real and it is one-directional. A correlation spreadsheet
 * has one benchmark per row with clean columns; the published standards are a
 * long PDF. Whoever is under time pressure will reach for the spreadsheet, and
 * the resulting rows will be a vendor's transcription of a state document,
 * shown to families as the state's words.
 *
 * So this classifies from the document's OWN self-description - its title,
 * subject and opening pages - and it is deliberately biased towards refusing.
 * `canonical_standards_publication` is only returned when the document actually
 * says it is the standards; everything else, including "I cannot tell", comes
 * back as something that cannot publish.
 */

export type ArtifactKind =
  | 'canonical_standards_publication'
  | 'parent_guide'
  | 'instructional_guide'
  | 'progression_document'
  | 'assessment_blueprint'
  | 'correlation_spreadsheet'
  | 'third_party_export'
  | 'other_reference'
  | 'synthetic_fixture';

export type Classification = {
  kind: ArtifactKind;
  confidence: 'clear' | 'uncertain';
  reason: string;
  /** Everything that matched, so a reviewer can see what this was reading. */
  signals: string[];
};

/**
 * Ordered most-specific first. A "B.E.S.T. Standards Parent Guide" contains the
 * words "B.E.S.T. Standards", so the guide patterns must be tested BEFORE the
 * standards patterns or every guide classifies as the standards themselves.
 */
const KINDS: { kind: ArtifactKind; patterns: RegExp[]; label: string }[] = [
  { kind: 'parent_guide', label: 'a family-facing guide',
    patterns: [/\bparent(?:'s|s')? guide\b/i, /\bfamily guide\b/i, /\bguide for (?:parents|families)\b/i] },
  { kind: 'instructional_guide', label: 'an instructional guide',
    patterns: [/\binstructional guide\b/i, /\bteacher(?:'s|s')? guide\b/i, /\bcurriculum guide\b/i,
               /\bpacing guide\b/i, /\bscope and sequence\b/i] },
  { kind: 'progression_document', label: 'a progression document',
    patterns: [/\bprogression(?:s)? (?:document|chart|guide)\b/i, /\bvertical (?:alignment|progression)\b/i,
               /\blearning progression\b/i] },
  { kind: 'assessment_blueprint', label: 'an assessment blueprint',
    patterns: [/\b(?:test|assessment) (?:blueprint|specification)/i, /\bitem specifications?\b/i,
               /\bF\.?A\.?S\.?T\.?\b.*\bblueprint\b/i] },
  { kind: 'correlation_spreadsheet', label: 'a correlation spreadsheet',
    patterns: [/\bcorrelation\b/i, /\bcrosswalk\b/i, /\balignment (?:matrix|document|report)\b/i,
               /\binstructional materials?\b.*\balign/i] },
  { kind: 'canonical_standards_publication', label: 'the standards themselves',
    patterns: [/\bstandards for mathematics\b/i, /\bmathematics standards\b/i,
               /\bB\.?E\.?S\.?T\.?\s+standards\b/i, /\bbenchmarks? for excellent student thinking\b/i] },
];

const THIRD_PARTY = [
  /\bquizlet\b/i, /\bteachers?\s*pay\s*teachers?\b/i, /\bcommon\s*core\s*sheets\b/i,
  /\bkhan academy\b/i, /\bihomeschool\b/i, /\bstudy\.com\b/i, /\bcourse\s*hero\b/i,
];

export function classifyArtifact(input: {
  title: string | null;
  subject?: string | null;
  keywords?: string | null;
  artifactName: string;
  /** The opening of the document. Enough to read a cover page, not the whole file. */
  openingText: string;
}): Classification {
  // The title and subject the DOCUMENT carries are worth more than its filename,
  // which is whatever the last person to save it typed. Both are read; the
  // filename is last.
  const haystack = [input.title, input.subject, input.keywords, input.openingText.slice(0, 4000),
                    input.artifactName]
    .filter(Boolean).join('\n');

  const signals: string[] = [];

  for (const pattern of THIRD_PARTY) {
    if (pattern.test(haystack)) {
      return {
        kind: 'third_party_export', confidence: 'clear',
        reason: 'the document identifies a third-party publisher; not an authoritative source',
        signals: [String(pattern)],
      };
    }
  }

  for (const candidate of KINDS) {
    const matched = candidate.patterns.filter((p) => p.test(haystack));
    if (matched.length === 0) continue;
    signals.push(...matched.map(String));

    if (candidate.kind === 'canonical_standards_publication') {
      // One more hurdle for the only kind that may publish: a document that
      // merely MENTIONS the standards is not the standards. Require that the
      // claim appears in the title or subject the document itself carries,
      // rather than somewhere in the body of a guide that cites them.
      const declared = [input.title, input.subject].filter(Boolean).join('\n');
      const inTitle = candidate.patterns.some((p) => p.test(declared));
      if (!inTitle) {
        return {
          kind: 'other_reference', confidence: 'uncertain',
          reason: 'the document mentions the standards but does not declare itself to BE them ' +
                  '(no matching title or subject); registering as a secondary reference',
          signals,
        };
      }
      return {
        kind: 'canonical_standards_publication', confidence: 'clear',
        reason: `the document declares itself as ${candidate.label}`,
        signals,
      };
    }

    return {
      kind: candidate.kind, confidence: 'clear',
      reason: `the document identifies itself as ${candidate.label}; ` +
              'useful as a secondary reference, not a source of canonical standards',
      signals,
    };
  }

  return {
    kind: 'other_reference', confidence: 'uncertain',
    reason: 'the document does not say what it is; refusing to assume it is the standards',
    signals,
  };
}
