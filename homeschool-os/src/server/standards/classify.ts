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

/**
 * Evidence that an artifact is what it claims, independent of PDF metadata.
 *
 * A canonical standards publication may legitimately carry an empty Title and
 * Subject - the FLDOE B.E.S.T. Mathematics PDF does, and its cover page is an
 * image. Demoting it for that was wrong: metadata is one signal among several
 * and the weakest of them, because it is trivially absent and trivially edited.
 *
 * What may NOT stand in for it is the filename, which is whatever the last
 * person to save the file typed. So identity is established from the two things
 * that are hard to fake: where the bytes came from, and what the document
 * structurally contains.
 */
export type ProvenanceEvidence = {
  /** Bytes retrieved from the authority's own published URL, hash recorded. */
  retrievedFromOfficialSource: boolean;
  /** The exact URL, for the record. */
  sourceUrl?: string | null;
};

export function classifyArtifact(input: {
  title: string | null;
  subject?: string | null;
  keywords?: string | null;
  artifactName: string;
  /** The opening of the document. Enough to read a cover page, not the whole file. */
  openingText: string;
  /** Structural markers found by the parser, not by reading prose. */
  structure?: {
    /** Benchmark codes matching the published layout. */
    benchmarkCodes: number;
    /** Grade section headings found in the body. */
    gradeSections: number;
    /** Domain/strand headings found in the body. */
    domains: number;
  };
  provenance?: ProvenanceEvidence;
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
      // merely MENTIONS the standards is not the standards. Three ways to clear
      // it, and none of them is the filename.
      const declared = [input.title, input.subject].filter(Boolean).join('\n');
      const inMetadata = declared.length > 0 && candidate.patterns.some((p) => p.test(declared));

      // The document says so on its own opening pages. This is how a printed
      // publication declares itself, and it survives empty PDF metadata.
      const inDocumentText = candidate.patterns.some((p) => p.test(input.openingText));

      // It is SHAPED like a standards publication: many benchmark codes, grade
      // sections, domain headings. A guide cites a handful of codes; the
      // standards themselves carry hundreds, in grade order.
      const st = input.structure;
      const structurallyStandards =
        !!st && st.benchmarkCodes >= 50 && st.gradeSections >= 3 && st.domains >= 3;

      // And the bytes came from the authority's own published URL.
      const fromOfficialSource = input.provenance?.retrievedFromOfficialSource === true;

      if (inMetadata) {
        signals.push('declared in PDF metadata');
      }
      if (inDocumentText) signals.push('declared in the document text');
      if (structurallyStandards) {
        signals.push(`structure: ${st!.benchmarkCodes} codes, ${st!.gradeSections} grade sections, ${st!.domains} domains`);
      }
      if (fromOfficialSource) signals.push(`retrieved from ${input.provenance?.sourceUrl ?? 'the official source'}`);

      // Metadata alone still counts, as before. Without it, identity needs BOTH
      // deterministic document content AND trusted source provenance - a
      // structurally convincing document from an unverified source is exactly
      // what a good forgery or a stale mirror looks like.
      if (inMetadata || ((inDocumentText || structurallyStandards) && fromOfficialSource)) {
        return {
          kind: 'canonical_standards_publication', confidence: 'clear',
          reason: 'identified as the standards publication itself',
          signals,
        };
      }

      if (inDocumentText || structurallyStandards) {
        return {
          kind: 'other_reference', confidence: 'uncertain',
          reason: 'the document looks like the standards publication, but its bytes were not ' +
                  'retrieved from the authority\'s own published URL. Content without ' +
                  'provenance is a mirror or a re-save, not a canonical source',
          signals,
        };
      }

      return {
        kind: 'other_reference', confidence: 'uncertain',
        reason: 'the document mentions the standards but does not declare itself to BE them, ' +
                'and carries none of the structure of the publication; registering as a ' +
                'secondary reference',
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
