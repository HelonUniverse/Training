/**
 * The standards reference layer, as seen from the application.
 *
 * Nothing in this directory is Florida-shaped. A source adapter turns one
 * authority's artifact into these generic shapes; the database schema, the
 * review queue and the publication gate never learn what a "strand" is.
 */

/** What a source artifact actually is, decided from its bytes. */
export type SourceFormat = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'html' | 'json' | 'xml' | 'unknown';

export type SourceAuthority =
  | 'state_education_agency'
  | 'state_curriculum_portal'
  | 'national_body'
  | 'international_body'
  | 'organization'
  | 'synthetic_test';

/**
 * The outcome of reading one row.
 *
 * `unresolved`, `ambiguous`, `parse_error` and `source_conflict` are results,
 * not failures to hide. A parser that guesses a benchmark code from its
 * neighbours produces a number a family may repeat to a district; one that says
 * "row 214 is unresolved" produces work for a person, which is correct.
 */
export type StagedStatus =
  | 'staged'
  | 'unresolved'
  | 'ambiguous'
  | 'parse_error'
  | 'source_conflict'
  | 'duplicate';

export type ReferenceKind =
  | 'benchmark'
  | 'practice'
  | 'cross_cutting'
  | 'domain'
  | 'cluster'
  | 'progression_note';

/** What the document said. An adapter never edits these. */
export type SourceRepresentation = {
  code: string | null;
  statement: string | null;
  grade: string | null;
  domainCode: string | null;
  domainName: string | null;
  referenceKind: string | null;
  language: string;
  raw: Record<string, unknown>;
};

/** What Nestra made of it. A reviewer may correct these. */
export type Normalization = {
  code: string | null;
  grade: string | null;
  subject: string | null;
  referenceKind: ReferenceKind;
  aliases: string[];
};

export type StagedRow = {
  rowNumber: number;
  status: StagedStatus;
  source: SourceRepresentation;
  normalized: Normalization;
  warnings: string[];
};

export type ParseResult = {
  adapter: string;
  adapterVersion: string;
  rows: StagedRow[];
  /** Domains the source declares, so an orphan domain reference is detectable. */
  domains: { code: string; name: string }[];
  warnings: string[];
};

/**
 * A source adapter.
 *
 * `supports` is asked BEFORE parsing and is allowed to say no. An adapter that
 * cheerfully parses a document it does not understand produces rows that look
 * fine and are wrong, which is worse than refusing.
 */
export type SourceAdapter = {
  readonly name: string;
  readonly version: string;
  readonly authority: SourceAuthority;
  supports(input: { format: SourceFormat; text: string; artifactName: string }):
    { ok: true } | { ok: false; reason: string };
  parse(input: { format: SourceFormat; text: string }): ParseResult;
};
