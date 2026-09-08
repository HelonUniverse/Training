import type { ParseResult, SourceAdapter, StagedRow } from '../types';

/**
 * Florida B.E.S.T. Mathematics.
 *
 * WHAT THIS FILE DOES NOT CONTAIN: a single Florida benchmark. Not one code,
 * not one statement, not a list "from memory". This environment cannot reach
 * fldoe.org or CPALMS, and a benchmark reconstructed from model knowledge is
 * indistinguishable, to a family reading it, from one a state published. It
 * would be quoted to a district as fact.
 *
 * What it contains is the READER: how to walk the authoritative artifact when
 * somebody supplies it, what shape to expect, and - the important part - what
 * to refuse to guess.
 *
 * ON INFERRING GRADE FROM A CODE. The B.E.S.T. code layout does carry a grade
 * position, and requirement 8 permits inferring grade from a code only when the
 * parser specification for the authoritative source explicitly permits it AND
 * the value is validated. So this adapter derives a grade candidate from the
 * code and then requires the source to AGREE: if the artifact states a grade and
 * it differs, the row is `source_conflict`, not a silent overwrite. If the
 * artifact states no grade at all, the derived value is kept as a candidate and
 * the row is `unresolved` for a person to confirm. A derivation nobody checked
 * is a guess with a rule attached.
 */
export const FLORIDA_BEST_MATH_ADAPTER_VERSION = '1.0.0';

/**
 * The published code layout, as a shape only: SUBJECT.GRADE.STRAND.STANDARD.BENCHMARK
 * e.g. two letters, a grade token, then dot-separated numeric parts. This
 * validates STRUCTURE. It asserts nothing about which codes exist.
 */
const BEST_CODE = /^([A-Z]{2})\.(K|[1-9]|1[0-2]|912)\.([A-Z]{1,3})\.(\d+)\.(\d+)$/;

/** Practices and cross-cutting expectations do not carry a grade position. */
const BEST_PRACTICE = /^MA\.K12\.MTR\.\d+\.\d+$/;

export const floridaBestMathematicsAdapter: SourceAdapter = {
  name: 'florida-best-mathematics',
  version: FLORIDA_BEST_MATH_ADAPTER_VERSION,
  authority: 'state_education_agency',

  supports({ format, text, artifactName }) {
    // This adapter reads ONE thing: a delimited export. It used to say yes to
    // pdf/docx/xlsx/html and then refuse them in parse(), which is a promise it
    // could not keep - and with a second Florida adapter now in the registry,
    // an over-broad `supports` is how the wrong reader gets handed the right
    // document.
    if (format !== 'csv') {
      return { ok: false, reason: `this adapter reads the delimited export; the bytes are ${format}` };
    }
    // Refuse a document that does not look like the thing this adapter reads.
    // Parsing an unrecognised artifact produces rows that look fine and are wrong.
    const looksRight = /b\.?e\.?s\.?t\.?/i.test(text) || /b\.?e\.?s\.?t\.?/i.test(artifactName);
    if (!looksRight) {
      return {
        ok: false,
        reason: 'the artifact does not identify itself as a B.E.S.T. document; ' +
                'refusing rather than parsing an unrecognised source',
      };
    }
    return { ok: true };
  },

  parse({ format, text }): ParseResult {
    const warnings: string[] = [];
    if (format !== 'csv') {
      // Only the structured export path is implemented. A PDF needs a text
      // extraction stage this environment cannot exercise against a real
      // artifact, and writing one blind would be writing it against imagined
      // input. It refuses instead of returning zero rows that read as success.
      return {
        adapter: this.name,
        adapterVersion: this.version,
        rows: [],
        domains: [],
        warnings: [
          `this adapter version reads the structured export (csv); it was given ${format}. ` +
          'No rows were produced - this is a refusal, not an empty result.',
        ],
      };
    }

    const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0);
    const header = (lines.shift() ?? '').toLowerCase();
    const columns = header.split(',').map((c) => c.trim());
    const at = (name: string) => columns.indexOf(name);
    const iCode = at('code'), iStatement = at('statement'), iGrade = at('grade');
    const iStrand = at('strand_code'), iStrandName = at('strand_name'), iKind = at('kind');

    if (iCode < 0 || iStatement < 0) {
      return {
        adapter: this.name, adapterVersion: this.version, rows: [], domains: [],
        warnings: ['the export is missing a code or statement column; refusing to guess the layout'],
      };
    }

    const rows: StagedRow[] = [];
    const domains = new Map<string, string>();
    const seen = new Map<string, number>();

    lines.forEach((line, index) => {
      const rowNumber = index + 1;
      const cells = splitCsvLine(line);
      const cell = (i: number) => (i >= 0 ? nullIfBlank(cells[i]) : null);

      const source = {
        code: cell(iCode),
        statement: cell(iStatement),
        grade: cell(iGrade),
        domainCode: cell(iStrand),
        domainName: cell(iStrandName),
        referenceKind: cell(iKind),
        language: 'en',
        raw: { line, cells },
      };
      if (source.domainCode && source.domainName) domains.set(source.domainCode, source.domainName);

      const rowWarnings: string[] = [];
      const blank = { code: null, grade: null, subject: 'mathematics' as const,
                      referenceKind: 'benchmark' as const, aliases: [] as string[] };

      if (!source.code) {
        rows.push({ rowNumber, status: 'unresolved', source, normalized: blank,
          warnings: ['no benchmark code in the source row; not inferred from neighbours'] });
        return;
      }
      if (!source.statement) {
        rows.push({ rowNumber, status: 'unresolved', source,
          normalized: { ...blank, code: source.code },
          warnings: ['no benchmark wording in the source row; not reconstructed'] });
        return;
      }
      if (/(…|\.\.\.)\s*$/.test(source.statement)) {
        rowWarnings.push('source wording appears truncated; kept as-is, never completed');
      }

      const previous = seen.get(source.code);
      if (previous !== undefined) {
        rows.push({ rowNumber, status: 'duplicate', source,
          normalized: { ...blank, code: source.code },
          warnings: [`duplicate benchmark identity, first seen at row ${previous}`] });
        return;
      }
      seen.set(source.code, rowNumber);

      const isPractice = BEST_PRACTICE.test(source.code);
      const match = BEST_CODE.exec(source.code);

      if (!isPractice && !match) {
        rows.push({ rowNumber, status: 'parse_error', source,
          normalized: { ...blank, code: source.code },
          warnings: ['the code does not match the published B.E.S.T. layout; not repaired'] });
        return;
      }

      if (isPractice) {
        // A mathematical practice spans K-12 and belongs to no grade and no
        // single skill. Forcing it into the benchmark shape would invent a grade.
        rows.push({ rowNumber, status: rowWarnings.length ? 'ambiguous' : 'staged', source,
          normalized: { code: source.code, grade: null, subject: 'mathematics',
                        referenceKind: 'cross_cutting', aliases: aliasesFor(source.code) },
          warnings: rowWarnings });
        return;
      }

      // Grade derivation, then validation against what the source says.
      const derivedGrade = match![2] ?? null;
      if (derivedGrade === null) {
        rows.push({ rowNumber, status: 'parse_error', source,
          normalized: { ...blank, code: source.code },
          warnings: ['the code matched the layout but carries no grade position'] });
        return;
      }
      if (source.grade) {
        const stated = normaliseGrade(source.grade);
        if (stated !== derivedGrade) {
          rows.push({ rowNumber, status: 'source_conflict', source,
            normalized: { ...blank, code: source.code },
            warnings: [`the code implies grade ${derivedGrade} but the source states ${stated}; ` +
                       'not resolved by preferring either'] });
          return;
        }
      } else {
        rows.push({ rowNumber, status: 'unresolved', source,
          normalized: { code: source.code, grade: derivedGrade, subject: 'mathematics',
                        referenceKind: 'benchmark', aliases: aliasesFor(source.code) },
          warnings: [`the source states no grade; ${derivedGrade} is a candidate derived from the ` +
                     'code layout and needs a person to confirm it'] });
        return;
      }

      rows.push({ rowNumber, status: rowWarnings.length ? 'ambiguous' : 'staged', source,
        normalized: { code: source.code, grade: derivedGrade, subject: 'mathematics',
                      referenceKind: toKind(source.referenceKind), aliases: aliasesFor(source.code) },
        warnings: rowWarnings });
    });

    return { adapter: this.name, adapterVersion: this.version, rows,
             domains: [...domains].map(([code, name]) => ({ code, name })), warnings };
  },
};

function normaliseGrade(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (t === 'K' || t === 'KG' || t === 'KINDERGARTEN') return 'K';
  const digits = /^GRADE\s*(\d{1,2})$/.exec(t) ?? /^(\d{1,2})$/.exec(t);
  return digits ? String(Number(digits[1])) : t;
}

function toKind(raw: string | null) {
  switch ((raw ?? '').toLowerCase()) {
    case 'practice':
    case 'cross_cutting': return 'cross_cutting' as const;
    case 'cluster': return 'cluster' as const;
    case 'domain': return 'domain' as const;
    default: return 'benchmark' as const;
  }
}

function aliasesFor(code: string): string[] {
  const spaced = code.replace(/\./g, ' ');
  return spaced === code ? [] : [spaced];
}

function nullIfBlank(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length === 0 ? null : trimmed;
}

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
