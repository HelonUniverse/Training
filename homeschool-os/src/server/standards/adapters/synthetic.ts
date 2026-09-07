import type { ParseResult, SourceAdapter, StagedRow } from '../types';

/**
 * The synthetic test adapter.
 *
 * It exists because the authoritative Florida artifact is not reachable from
 * this environment, and the architecture still has to be proved end to end. Its
 * codes look like TEST.MATH.4.FR.001 - obviously synthetic, and deliberately
 * NOT shaped like a plausible Florida benchmark. A fixture that could be
 * mistaken for a real code is a fixture that will eventually be quoted as one.
 *
 * Its rows are registered under the `synthetic_test` authority, which
 * publish_standards_batch() refuses outright. The fixture cannot become
 * canonical data by accident or on purpose.
 *
 * Format: a small CSV. code,statement,grade,domain_code,domain_name,kind
 */
export const SYNTHETIC_ADAPTER_VERSION = '1.0.0';

export const syntheticAdapter: SourceAdapter = {
  name: 'synthetic-test',
  version: SYNTHETIC_ADAPTER_VERSION,
  authority: 'synthetic_test',

  supports({ format }) {
    if (format !== 'csv') return { ok: false, reason: `expected csv, got ${format}` };
    return { ok: true };
  },

  parse({ text }): ParseResult {
    const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
    const header = lines.shift();
    const warnings: string[] = [];
    if (!header || !header.startsWith('code,')) {
      return {
        adapter: this.name, adapterVersion: this.version, rows: [], domains: [],
        warnings: ['no recognisable header row'],
      };
    }

    const rows: StagedRow[] = [];
    const domains = new Map<string, string>();
    const seen = new Map<string, number>();

    lines.forEach((line, index) => {
      const rowNumber = index + 1;
      const cells = splitCsvLine(line);
      const [code, statement, grade, domainCode, domainName, kind] = cells;
      const rowWarnings: string[] = [];

      const source = {
        code: nullIfBlank(code),
        statement: nullIfBlank(statement),
        grade: nullIfBlank(grade),
        domainCode: nullIfBlank(domainCode),
        domainName: nullIfBlank(domainName),
        referenceKind: nullIfBlank(kind),
        language: 'en',
        raw: { line, cells },
      };

      if (source.domainCode && source.domainName) domains.set(source.domainCode, source.domainName);

      // Missing identity is unresolved. It is never inferred from the row above.
      if (!source.code) {
        rows.push({
          rowNumber, status: 'unresolved', source,
          normalized: { code: null, grade: null, subject: 'mathematics', referenceKind: 'benchmark', aliases: [] },
          warnings: ['no benchmark code in the source row; not inferred from neighbours'],
        });
        return;
      }

      // Truncated wording is unresolved too. Completing a sentence a state
      // wrote is putting words in its mouth.
      if (source.statement && /(…|\.\.\.)\s*$/.test(source.statement)) {
        rowWarnings.push('source wording appears truncated; not completed');
      }

      const previous = seen.get(source.code);
      if (previous !== undefined) {
        rows.push({
          rowNumber, status: 'duplicate', source,
          normalized: { code: source.code, grade: source.grade, subject: 'mathematics',
                        referenceKind: toKind(source.referenceKind), aliases: [] },
          warnings: [...rowWarnings, `duplicate of row ${previous}`],
        });
        return;
      }
      seen.set(source.code, rowNumber);

      // A cross-cutting reference legitimately has no single grade. That is not
      // a missing value to fill in; it is what the reference IS.
      const kindValue = toKind(source.referenceKind);
      const gradeIsExpected = kindValue === 'benchmark' || kindValue === 'cluster';
      if (gradeIsExpected && !source.grade) {
        rows.push({
          rowNumber, status: 'unresolved', source,
          normalized: { code: source.code, grade: null, subject: 'mathematics',
                        referenceKind: kindValue, aliases: [] },
          warnings: [...rowWarnings, 'a benchmark with no grade in the source; grade is NOT inferred from the code'],
        });
        return;
      }

      rows.push({
        rowNumber,
        status: rowWarnings.length > 0 ? 'ambiguous' : 'staged',
        source,
        normalized: {
          code: source.code,
          grade: source.grade,
          subject: 'mathematics',
          referenceKind: kindValue,
          aliases: aliasesFor(source.code),
        },
        warnings: rowWarnings,
      });
    });

    return {
      adapter: this.name,
      adapterVersion: this.version,
      rows,
      domains: [...domains].map(([code, name]) => ({ code, name })),
      warnings,
    };
  },
};

function toKind(raw: string | null): ParseResult['rows'][number]['normalized']['referenceKind'] {
  switch ((raw ?? '').toLowerCase()) {
    case 'practice': return 'practice';
    case 'cross_cutting': return 'cross_cutting';
    case 'domain': return 'domain';
    case 'cluster': return 'cluster';
    case 'progression_note': return 'progression_note';
    default: return 'benchmark';
  }
}

/** Search aliases only - a code written the way somebody might type it. */
function aliasesFor(code: string): string[] {
  const stripped = code.replace(/\./g, ' ').trim();
  return stripped === code ? [] : [stripped];
}

function nullIfBlank(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Enough CSV for a fixture: quoted cells with embedded commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cell); cell = ''; }
    else cell += ch;
  }
  out.push(cell);
  return out;
}
