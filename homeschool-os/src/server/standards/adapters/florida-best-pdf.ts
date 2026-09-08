import type { ReferenceKind, StagedRow, StagedStatus } from '../types';
import type { PdfLine } from '../pdf';

/**
 * Reading benchmarks out of the authoritative B.E.S.T. Mathematics PDF.
 *
 * WHAT IS DETERMINABLE WITHOUT THE ARTIFACT, and is therefore implemented here:
 * the published code layout (a shape, not a list of codes), the rule that a
 * benchmark begins at a code and its statement runs to the next code, the
 * grade-derivation-must-agree rule, and every refusal.
 *
 * WHAT IS NOT, and is therefore a REFUSAL rather than a guess: whether that
 * layout assumption actually holds for this document. A standards PDF might put
 * the code and statement in one flowed paragraph, or in a two-column table, or
 * on facing pages, and a segmenter written against an imagined layout produces
 * rows that look right and pair the wrong statement with the wrong code. So
 * `segment()` measures its own confidence against the real lines and reports a
 * structural refusal when the document does not look like what it expects.
 *
 * This file contains NO Florida benchmark. Not one code, not one statement. The
 * regular expression below describes a shape; it asserts nothing about which
 * codes exist, and a test greps this file to keep it that way.
 */

/** SUBJECT.GRADE.STRAND.STANDARD.BENCHMARK - a shape, not a list. */
const BENCHMARK_CODE = /^(MA)\.(K|[1-9]|1[0-2])\.([A-Z]{1,3})\.(\d+)\.(\d+)$/;
/** Practices span K-12 and carry no grade position. */
const PRACTICE_CODE = /^MA\.K12\.MTR\.\d+\.\d+$/;
/** A code appearing at the start of a line, possibly followed by its statement. */
const LINE_STARTS_WITH_CODE = /^(MA\.(?:K12\.MTR|(?:K|\d{1,2})\.[A-Z]{1,4})\.\d+\.\d+)\b[:.\s-]*(.*)$/;
/** A code occupying a whole line: the signature of a table cell, not a heading. */
const CODE_ALONE = /^MA\.(?:K12\.MTR|(?:K|\d{1,2})\.[A-Z]{1,4})\.\d+\.\d+$/;

export const FLORIDA_BEST_PDF_ADAPTER_VERSION = '2.0.0';

export type PdfParseOutcome =
  | { ok: true; rows: StagedRow[]; domains: { code: string; name: string }[]; warnings: string[] }
  | { ok: false; refusal: string; diagnostics: Record<string, number | string> };

/**
 * Chrome and furniture that appears on every page and is never part of a
 * benchmark statement. Matched conservatively: a line is dropped only when it
 * is ENTIRELY furniture, never when it merely contains some.
 */
const FURNITURE = [
  /^\d+$/,                                  // a bare page number
  /^page \d+( of \d+)?$/i,
  /^grade \d+$/i,
  /^kindergarten$/i,
  /^[|·•\s]+$/,
];

function isFurniture(text: string): boolean {
  return FURNITURE.some((p) => p.test(text.trim()));
}

/**
 * How confident are we that this document is laid out the way we assume?
 *
 * Three things are measured against the ACTUAL lines rather than assumed:
 * whether codes appear at all, whether they start lines (rather than being
 * buried mid-sentence, which would mean a flowed layout this segmenter cannot
 * read), and whether most codes are followed by text. If any of those fails the
 * document gets a structural refusal and no rows.
 */
export function assessLayout(lines: PdfLine[]): {
  ok: boolean;
  reason: string;
  codesFound: number;
  codesWithStatement: number;
  codesAlone: number;
  codesMidLine: number;
} {
  let codesWithStatement = 0;   // "CODE Statement text..." - what this parser reads
  let codesAlone = 0;           // "CODE" and nothing else - a table cell
  let codesMidLine = 0;         // buried in a sentence - a flowed layout

  const anyCode = /MA\.(?:K12\.MTR|(?:K|\d{1,2})\.[A-Z]{1,4})\.\d+\.\d+/g;
  for (const line of lines) {
    const text = line.text.trim();
    const matches = [...text.matchAll(anyCode)];
    if (matches.length === 0) continue;
    if (CODE_ALONE.test(text)) codesAlone += 1;
    else if (LINE_STARTS_WITH_CODE.test(text)) codesWithStatement += 1;
    else codesMidLine += matches.length;
  }
  const codesFound = codesWithStatement + codesAlone + codesMidLine;
  const base = { codesFound, codesWithStatement, codesAlone, codesMidLine };

  if (codesFound === 0) {
    return { ...base, ok: false,
      reason: 'no benchmark codes matching the published layout were found anywhere in the ' +
              'document. Either this is not the standards publication, or its text layer is ' +
              'not readable in the order this parser assumes. Refusing rather than returning ' +
              'zero rows as if the framework were empty.' };
  }

  // A code ALONE on its line is the signature of a two-column table: the code
  // lives in its own cell, and the statement is in the cell beside it. Because
  // the two cells sit at different y positions, the extracted order becomes
  //
  //     <first half of the statement>
  //     <the benchmark code>
  //     <second half of the statement>
  //
  // and a "code to next code" segmenter attaches the SECOND half to the right
  // code while donating the first half to the previous benchmark. Every row
  // looks well-formed and the wording is wrong, which is the one outcome this
  // whole pipeline exists to prevent.
  //
  // The earlier version of this check counted such a line as "starts with a
  // code" and passed. It was measuring the wrong thing: whether a code opens a
  // line says nothing about whether its STATEMENT follows it.
  if (codesAlone > codesFound * 0.2) {
    return { ...base, ok: false,
      reason: `${codesAlone} of ${codesFound} codes sit alone on their line with no statement ` +
              'following. That is a two-column table: the code is in its own cell and the ' +
              'statement is beside it, so the extracted reading order splits each statement ' +
              'around its own code. A code-to-next-code segmenter would attach the wrong ' +
              'wording to real benchmark codes. Refusing: this document needs a column-aware ' +
              'parser that groups text by x position, not this one.' };
  }

  if (codesMidLine > codesFound * 0.3) {
    return { ...base, ok: false,
      reason: `${codesMidLine} of ${codesFound} codes appear mid-line rather than starting one. ` +
              'This parser segments a benchmark from a code at the start of a line to the next ' +
              'such code; a flowed layout would pair statements with the wrong codes.' };
  }

  return { ...base, ok: true, reason: 'layout matches' };
}

/**
 * Segment lines into staged rows.
 *
 * A benchmark runs from a line beginning with a code to the line before the
 * next such code. Nothing is completed, repaired or inferred: a statement that
 * comes out empty is `unresolved`, and a code that does not match the layout is
 * `parse_error`.
 */
export function segment(
  lines: PdfLine[],
  options: { grades?: string[] } = {},
): PdfParseOutcome {
  const layout = assessLayout(lines);
  if (!layout.ok) {
    return {
      ok: false,
      refusal: layout.reason,
      diagnostics: {
        lines: lines.length,
        codesFound: layout.codesFound,
        codesWithStatement: layout.codesWithStatement,
        codesAlone: layout.codesAlone,
        codesMidLine: layout.codesMidLine,
      },
    };
  }

  const rows: StagedRow[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  let current: { code: string; parts: string[]; page: number; locator: string } | null = null;
  let rowNumber = 0;

  const flush = () => {
    if (!current) return;
    rowNumber += 1;
    const statement = current.parts.join(' ').replace(/\s+/g, ' ').trim();
    rows.push(buildRow(rowNumber, current.code, statement, current.page, current.locator, seen, options));
    current = null;
  };

  for (const line of lines) {
    const match = LINE_STARTS_WITH_CODE.exec(line.text);
    if (match) {
      flush();
      current = {
        code: match[1]!,
        parts: match[2] && match[2].trim().length > 0 ? [match[2].trim()] : [],
        page: line.page,
        locator: line.locator,
      };
      continue;
    }
    if (!current) continue;                 // front matter before the first code
    if (isFurniture(line.text)) continue;
    current.parts.push(line.text);
  }
  flush();

  const unresolved = rows.filter((r) => r.status === 'unresolved').length;
  if (unresolved > 0) warnings.push(`${unresolved} row(s) could not be resolved from the source`);

  return { ok: true, rows, domains: [], warnings };
}

function buildRow(
  rowNumber: number,
  code: string,
  statement: string,
  page: number,
  locator: string,
  seen: Map<string, number>,
  options: { grades?: string[] },
): StagedRow {
  const source = {
    code,
    statement: statement.length > 0 ? statement : null,
    grade: null,                 // the PDF states grade by section, not per row
    domainCode: null,
    domainName: null,
    referenceKind: null,
    language: 'en',
    raw: { page, locator },
  };
  const blank = { code: null, grade: null, subject: 'mathematics', referenceKind: 'benchmark' as ReferenceKind,
                  aliases: [] as string[] };
  const row = (status: StagedStatus, normalized: StagedRow['normalized'], warnings: string[]): StagedRow =>
    ({ rowNumber, status, source, normalized, warnings });

  const previous = seen.get(code);
  if (previous !== undefined) {
    return row('duplicate', { ...blank, code },
      [`duplicate benchmark identity, first seen at row ${previous} (${locator})`]);
  }
  seen.set(code, rowNumber);

  // A benchmark with no statement is unresolved. It is never completed.
  if (!source.statement) {
    return row('unresolved', { ...blank, code },
      [`no statement text followed this code at ${locator}; not reconstructed`]);
  }
  // Truncated wording is kept exactly as found.
  const warnings: string[] = [];
  if (/(…|\.\.\.)\s*$/.test(source.statement)) {
    warnings.push(`wording appears truncated at ${locator}; kept as-is, never completed`);
  }

  if (PRACTICE_CODE.test(code)) {
    return row(warnings.length ? 'ambiguous' : 'staged',
      { code, grade: null, subject: 'mathematics', referenceKind: 'cross_cutting', aliases: aliasesFor(code) },
      warnings);
  }

  const parts = BENCHMARK_CODE.exec(code);
  if (!parts) {
    return row('parse_error', { ...blank, code },
      [`the code at ${locator} does not match the published layout; not repaired`]);
  }

  // Grade derivation. The PDF's own per-row grade is absent (it is a section
  // heading), so the derived value is a CANDIDATE and the row is unresolved
  // until a person confirms it - exactly as requirement 8 allows and no further.
  const derived = parts[2]!;
  if (options.grades && !options.grades.includes(derived)) {
    return row('rejected' as StagedStatus, { ...blank, code },
      [`grade ${derived} is outside the requested scope`]);
  }

  return row('unresolved',
    { code, grade: derived, subject: 'mathematics', referenceKind: 'benchmark', aliases: aliasesFor(code) },
    [...warnings,
     `grade ${derived} is a candidate derived from the code layout; the PDF states grade by ` +
     `section heading rather than per benchmark, so a person confirms it (${locator})`]);
}

function aliasesFor(code: string): string[] {
  const spaced = code.replace(/\./g, ' ');
  return spaced === code ? [] : [spaced];
}
