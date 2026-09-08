import { htmlToInlineText, htmlToText, lineAt, tableRows, topLevelElements } from '../html';
import type { ParseResult, ParseScope, SourceAdapter, StagedRow } from '../types';

/**
 * Florida B.E.S.T. Mathematics, from the authority's own structured export.
 *
 * WHAT THIS FILE STILL DOES NOT CONTAIN: a single Florida benchmark. Not one
 * code, not one statement. Every benchmark this produces was read out of the
 * bytes it was handed, and a benchmark this adapter cannot read is reported as
 * unread rather than completed from anywhere else.
 *
 * WHY A SECOND FLORIDA ADAPTER. `florida-best-mathematics` reads a delimited
 * export and refuses everything else, which is right for what it is. The
 * artifact the state's own portal actually publishes is neither a CSV nor a
 * readable PDF: it is markup, served as `.doc`, in which each benchmark is one
 * table row whose first cell is the code and whose second cell is the wording.
 * That association is READ, not inferred from x/y coordinates, which is the
 * whole reason this artifact can be ingested honestly when the PDF could not.
 *
 * THE SHAPE, schematically - no benchmark of Florida's is reproduced here:
 *
 *   <asp:Label ID="lblGradeLevelTitle" ...>Grade: <grade></asp:Label>
 *   <asp:Label ID="lblBOKDescription" ...>Strand: <STRAND NAME></asp:Label>
 *   ... Standard <n>: <the standard's sentence>
 *   <tr><td><benchmark code></td><td><the benchmark's wording></td></tr>
 *
 * Grade and strand are therefore STATED by the document, not derived from the
 * code. The code's own grade and strand positions are then used to CHECK them:
 * agreement is evidence, and disagreement is a `source_conflict` for a person,
 * never resolved by preferring one side.
 *
 * TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT:
 *
 * 1. Row and cell extraction is nesting-aware (see ../html.ts). One K-5
 *    benchmark - a grade-5 algebraic-reasoning one - illustrates itself with a
 *    table inside its wording cell, and a flat `<tr>...</tr>` regex silently
 *    returns 183 benchmarks instead of 184. The regression fixture in
 *    tests/fixtures/standards names it.
 *
 * 2. The document marks its own sub-sections with BOTH nesting orders -
 *    `<i><u>Clarifications</u></i>` and `<u><i>Examples</i></u>`. A matcher
 *    that only knows one of them puts an entire Examples block, images and all,
 *    inside the benchmark statement.
 */
export const FLORIDA_BEST_STRUCTURED_ADAPTER_VERSION = '1.0.0';

/** SUBJECT.GRADE.STRAND.STANDARD.BENCHMARK - a shape, asserting no contents. */
const BEST_CODE = /^([A-Z]{2})\.(K|[1-9]|1[0-2]|K12|912)\.([A-Z]{1,4})\.(\d+)\.(\d+)$/;

/** Practices span K-12 and belong to no grade. */
const BEST_PRACTICE = /^MA\.K12\.MTR\.\d+\.\d+$/;

const GRADE_HEADER = /lblGradeLevelTitle[^>]*>\s*Grade:\s*([^<]+?)\s*<\/asp:Label>/gi;
const STRAND_HEADER = /lblBOKDescription[^>]*>\s*Strand:\s*([^<]+?)\s*<\/asp:Label>/gi;

/**
 * A sub-section heading inside a wording cell, in either nesting order.
 * The back-reference is what makes `<i><u>x</u></i>` and `<u><i>x</i></u>` both
 * match while `<i><u>x</i></u>` - which is malformed - does not.
 */
const SECTION_HEADING =
  /<\s*(i|u)\s*>\s*<\s*(i|u)\s*>\s*(Clarifications?|Examples?)\s*<\s*\/\s*\2\s*>\s*<\s*\/\s*\1\s*>/gi;

/** An "Access Point" is a different publication and is out of scope entirely. */
const ACCESS_POINT = /access\s*point/i;

type Marker =
  | { at: number; kind: 'grade'; value: string }
  | { at: number; kind: 'strand'; value: string }
  | { at: number; kind: 'benchmark'; code: string; wordingHtml: string; wordingAt: number };

export const floridaBestStructuredAdapter: SourceAdapter = {
  name: 'florida-best-structured',
  version: FLORIDA_BEST_STRUCTURED_ADAPTER_VERSION,
  // CPALMS is Florida's official standards portal, operated for the Department
  // of Education. That is a portal, and saying so is more accurate than
  // promoting it to the department itself.
  authority: 'state_curriculum_portal',

  supports({ format, text, artifactName }) {
    // The filename says `.doc`. The bytes say HTML. `format` here has already
    // been decided from the bytes, and the filename is not consulted.
    if (format !== 'html') {
      return { ok: false, reason: `this adapter reads structured markup; the bytes are ${format}` };
    }
    if (!/b\.?e\.?s\.?t\.?/i.test(text)) {
      return { ok: false, reason: 'the artifact does not identify itself as a B.E.S.T. document' };
    }
    if (!/lblGradeLevelTitle/i.test(text) || !/lblBOKDescription/i.test(text)) {
      return {
        ok: false,
        reason: 'the markup carries no grade or strand headings in the layout this adapter reads; '
              + 'refusing rather than walking an unrecognised document',
      };
    }
    if (!/<\s*tr\b/i.test(text)) {
      return { ok: false, reason: 'the markup has no table rows, so no code sits beside its wording' };
    }
    void artifactName;
    return { ok: true };
  },

  parse({ format, text, scope }): ParseResult {
    const warnings: string[] = [];
    const outOfScope: NonNullable<ParseResult['outOfScope']> = [];
    const refuse = (reason: string): ParseResult => ({
      adapter: this.name, adapterVersion: this.version, rows: [], domains: [],
      warnings: [reason], outOfScope: [],
    });

    if (format !== 'html') {
      return refuse(`this adapter reads structured markup; it was given ${format}. `
                  + 'No rows were produced - this is a refusal, not an empty result.');
    }

    // The scope of this ingestion is the standards. Access Points are a
    // separate publication for students with significant cognitive
    // disabilities; mixing them into the same table would put two different
    // things behind one benchmark code.
    if (ACCESS_POINT.test(text)) {
      return refuse('the artifact contains Access Points, which are a separate publication; '
                  + 'this adapter reads the standards report WITHOUT Access Points and refuses '
                  + 'to guess which rows are which');
    }

    const markers = collectMarkers(text);
    if (markers.length === 0) {
      return refuse('no grade headings, strand headings or benchmark rows were found; refusing');
    }

    const wanted = scope?.grades ? new Set(scope.grades.map(normaliseGrade)) : null;
    const domains = new Map<string, string>();
    const rows: StagedRow[] = [];
    const seen = new Map<string, number>();
    let grade: string | null = null;
    let strand: string | null = null;
    let rowNumber = 0;

    for (const marker of markers) {
      if (marker.kind === 'grade') { grade = normaliseGrade(marker.value); continue; }
      if (marker.kind === 'strand') { strand = marker.value.trim(); continue; }

      const codeMatch = BEST_CODE.exec(marker.code);
      const isPractice = BEST_PRACTICE.test(marker.code);
      const codeGrade = codeMatch ? normaliseGrade(codeMatch[2] ?? '') : null;
      const codeStrand = codeMatch ? (codeMatch[3] ?? null) : null;

      // Scope is applied on the grade the DOCUMENT states, falling back to the
      // code only when the document states none. Excluded rows are counted, not
      // dropped in silence: "184 staged" means something different when the
      // artifact held 184 than when it held 642.
      const effectiveGrade = grade ?? codeGrade;
      if (wanted && (effectiveGrade === null || !wanted.has(effectiveGrade))) {
        outOfScope.push({
          code: marker.code, grade: effectiveGrade,
          reason: effectiveGrade === null ? 'no grade could be established for this row'
                                          : `grade ${effectiveGrade} was not requested`,
        });
        continue;
      }

      rowNumber += 1;
      const locator = `line ${lineAt(text, marker.wordingAt)}`
        + (grade ? `, Grade: ${grade}` : '')
        + (strand ? `, Strand: ${strand}` : '');
      const { statementHtml, sections } = splitWording(marker.wordingHtml);
      const statement = htmlToText(statementHtml) || null;
      const rowWarnings: string[] = [];

      if (strand && codeStrand) {
        const known = domains.get(codeStrand);
        if (known && known !== strand) {
          rowWarnings.push(`strand ${codeStrand} was headed "${known}" earlier and "${strand}" here`);
        }
        domains.set(codeStrand, strand);
      }

      const source = {
        code: marker.code,
        statement,
        grade,
        domainCode: codeStrand,
        domainName: strand,
        referenceKind: isPractice ? 'practice' : 'benchmark',
        language: 'en',
        // Everything the cell held that is not the statement, kept verbatim.
        // Clarifications and examples are published alongside the benchmark and
        // are not the benchmark; dropping them would lose the state's own
        // annotations, and folding them in would change what the wording says.
        raw: {
          locator,
          statedGrade: grade,
          statedStrand: strand,
          codeGrade,
          codeStrand,
          sections,
          wordingCellHtml: marker.wordingHtml,
        } as Record<string, unknown>,
      };
      const blank = { code: null, grade: null, subject: 'mathematics',
                      referenceKind: 'benchmark' as const, aliases: [] as string[] };
      const push = (status: StagedRow['status'],
                    normalized: StagedRow['normalized'], why: string[]) =>
        rows.push({ rowNumber, status, source, normalized, warnings: why, locator, page: null });

      if (!codeMatch) {
        push('parse_error', { ...blank, code: marker.code },
             ['the code does not match the published B.E.S.T. layout; not repaired']);
        continue;
      }
      if (!statement) {
        push('unresolved', { ...blank, code: marker.code },
             ['the wording cell held no text; not reconstructed']);
        continue;
      }
      if (/(…|\.\.\.)\s*$/.test(statement)) {
        rowWarnings.push('source wording appears truncated; kept as-is, never completed');
      }

      const previous = seen.get(marker.code);
      if (previous !== undefined) {
        push('duplicate', { ...blank, code: marker.code },
             [`duplicate benchmark identity, first staged as row ${previous}`]);
        continue;
      }
      seen.set(marker.code, rowNumber);

      if (isPractice) {
        push(rowWarnings.length ? 'ambiguous' : 'staged',
             { code: marker.code, grade: null, subject: 'mathematics',
               referenceKind: 'cross_cutting', aliases: aliasesFor(marker.code) },
             rowWarnings);
        continue;
      }

      // The document states a grade and the code carries one. They must agree.
      if (grade === null) {
        push('unresolved',
             { code: marker.code, grade: codeGrade, subject: 'mathematics',
               referenceKind: 'benchmark', aliases: aliasesFor(marker.code) },
             [`this row sits under no grade heading; ${codeGrade} is a candidate derived `
              + 'from the code layout and needs a person to confirm it']);
        continue;
      }
      if (codeGrade !== grade) {
        push('source_conflict', { ...blank, code: marker.code },
             [`the document files this benchmark under grade ${grade} and its code implies `
              + `${codeGrade}; not resolved by preferring either`]);
        continue;
      }
      if (strand !== null && codeStrand !== null && !strandNameMatchesCode(strand, codeStrand)) {
        rowWarnings.push(`filed under strand "${strand}" while the code says ${codeStrand}; `
                       + 'both are recorded and neither was overwritten');
      }

      push(rowWarnings.length ? 'ambiguous' : 'staged',
           { code: marker.code, grade, subject: 'mathematics',
             referenceKind: 'benchmark', aliases: aliasesFor(marker.code) },
           rowWarnings);
    }

    if (rows.length === 0) {
      warnings.push('the document was walked and produced no rows in scope; '
                  + 'this is a result to look at, not a success');
    }

    return {
      adapter: this.name,
      adapterVersion: this.version,
      rows,
      domains: [...domains].map(([code, name]) => ({ code, name })),
      warnings,
      outOfScope,
    };
  },
};

/**
 * The document's headings and benchmark rows, in the order they appear.
 *
 * Document order is the only thing that ties a benchmark to the grade and
 * strand it is filed under: the row itself does not repeat them.
 */
function collectMarkers(html: string): Marker[] {
  const markers: Marker[] = [];

  for (const [pattern, kind] of [[GRADE_HEADER, 'grade'], [STRAND_HEADER, 'strand']] as const) {
    pattern.lastIndex = 0;
    for (let m = pattern.exec(html); m !== null; m = pattern.exec(html)) {
      markers.push({ at: m.index, kind, value: (m[1] ?? '').trim() } as Marker);
    }
  }

  for (const row of tableRows(html)) {
    // Exactly two cells is the benchmark shape. The header row ("BENCHMARK
    // CODE" / "BENCHMARK") has two as well and is excluded by the code test
    // below; anything else in this document has one.
    if (row.cells.length !== 2) continue;
    const first = row.cells[0];
    const second = row.cells[1];
    if (!first || !second) continue;
    const code = htmlToInlineText(first.html);
    if (!/^[A-Z]{2}\./.test(code)) continue;
    markers.push({ at: row.span.start, kind: 'benchmark', code,
                   wordingHtml: second.html, wordingAt: second.span.start });
  }

  return markers.sort((a, b) => a.at - b.at);
}

/**
 * The benchmark statement, and everything published after it.
 *
 * The statement is what precedes the first `Clarifications`/`Examples`
 * heading. When there is no such heading the whole cell is the statement -
 * twelve K-5 benchmarks are simply a sentence.
 */
export function splitWording(cellHtml: string): {
  statementHtml: string;
  sections: { heading: string; text: string }[];
} {
  SECTION_HEADING.lastIndex = 0;
  const heads: { at: number; end: number; heading: string }[] = [];
  for (let m = SECTION_HEADING.exec(cellHtml); m !== null; m = SECTION_HEADING.exec(cellHtml)) {
    heads.push({ at: m.index, end: m.index + m[0].length, heading: (m[3] ?? '').trim() });
  }
  if (heads.length === 0) return { statementHtml: cellHtml, sections: [] };

  const sections = heads.map((h, i) => ({
    heading: h.heading,
    text: htmlToText(cellHtml.slice(h.end, heads[i + 1]?.at ?? cellHtml.length))
      .replace(/^:\s*/, ''),
  }));
  return { statementHtml: cellHtml.slice(0, heads[0]?.at ?? 0), sections };
}

/**
 * Does the strand heading plausibly go with the strand letters in the code?
 *
 * A CHECK, not a lookup table of Florida's strands - a table would encode the
 * answer and stop checking anything. Two ways a heading abbreviates:
 *
 *   several words -> the letters are among the words' initials, in order.
 *                    "NUMBER SENSE AND OPERATIONS" abbreviates to N-S-O, and
 *                    "DATA ANALYSIS AND PROBABILITY" to D-P, skipping a word.
 *   one word      -> the letters are a prefix of it. A one-word heading has one
 *                    initial, so an initials test can only ever accept a
 *                    one-letter code, and would reject every longer
 *                    abbreviation of a single word as a mismatch.
 *
 * That second case is not hypothetical: the first run of this adapter flagged
 * 21 rows as ambiguous for being "filed under FRACTIONS while the code says
 * FR". The rows were fine; the check could not express how a single word
 * abbreviates. Filler words are dropped because an abbreviation does not
 * usually spend a letter on "AND".
 *
 * When no letters can be extracted the row is NOT flagged. This exists to catch
 * a heading that has drifted out of sync with the rows beneath it, and a
 * warning nobody can act on teaches reviewers to click past warnings.
 */
export function strandNameMatchesCode(strandName: string, codeStrand: string): boolean {
  const wanted = codeStrand.toUpperCase();
  const words = strandName.split(/[^A-Za-z]+/).filter(Boolean)
    .filter((w) => !['AND', 'OF', 'THE', 'FOR'].includes(w.toUpperCase()));
  if (words.length === 0) return true;

  if (words.length === 1) {
    return (words[0] ?? '').toUpperCase().startsWith(wanted);
  }

  const initials = words.map((w) => w[0]?.toUpperCase() ?? '').join('');
  let i = 0;
  for (const ch of initials) if (ch === wanted[i]) i += 1;
  return i === wanted.length;
}

export function normaliseGrade(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (t === 'K' || t === 'KG' || t === 'KINDERGARTEN') return 'K';
  if (t === 'K12' || t === 'K-12') return 'K12';
  if (t === '912' || t === '9-12') return '912';
  const digits = /^GRADE\s*(\d{1,2})$/.exec(t) ?? /^(\d{1,2})$/.exec(t);
  return digits ? String(Number(digits[1])) : t;
}

function aliasesFor(code: string): string[] {
  const spaced = code.replace(/\./g, ' ');
  return spaced === code ? [] : [spaced];
}

/** Re-exported so a caller can walk the same structure without re-deriving it. */
export { topLevelElements };
