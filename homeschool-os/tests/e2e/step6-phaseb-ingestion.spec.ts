import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectFormat, detectRepresentation, sha256, formatDisagreement }
  from '../../src/server/standards/format';
import { topLevelElements, tableRows, htmlToText, decodeEntities, lineAt }
  from '../../src/server/standards/html';
import {
  floridaBestStructuredAdapter, splitWording, strandNameMatchesCode, normaliseGrade,
} from '../../src/server/standards/adapters/florida-best-structured';
import { floridaBestMathematicsAdapter } from '../../src/server/standards/adapters/florida-best-mathematics';
import { ADAPTERS } from '../../src/server/standards/adapters';
import { validateBatch } from '../../src/server/standards/validate';

/**
 * STEP 6 PHASE B: reading the artifact Florida actually publishes.
 *
 * Two kinds of test here, and the difference matters.
 *
 * The STRUCTURE tests run against a synthetic fixture whose codes use a subject
 * prefix no state uses. They pin down the markup a parser has to survive. A
 * fixture carrying real benchmark wording would be an unversioned second copy
 * of a state's publication living in a test directory.
 *
 * The ARTIFACT tests run against the committed CPALMS export and assert what
 * the pipeline read out of it. They name real benchmark CODES, because a test
 * that checks a count without being able to say which row went missing is not
 * much of a test. They assert no benchmark WORDING: the artifact is the
 * authority on that, and duplicating a sentence here would create a second
 * place for it to be wrong.
 */

const FIXTURES = join(process.cwd(), 'tests/fixtures/standards');
const NESTED = readFileSync(join(FIXTURES, 'structured-nested-table.html'), 'utf8');

const ARTIFACT_PATH = join(process.cwd(),
  'sources/cpalms/Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc');
const EXPECTED_SHA256 = '474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914';
const EXPECTED_BYTES = 841856;
/** Stated before anything was parsed. Nothing may be tuned to satisfy it. */
const EXPECTED_COUNTS: Record<string, number> = { K: 22, 1: 26, 2: 27, 3: 34, 4: 39, 5: 36 };
const SCOPE = ['K', '1', '2', '3', '4', '5'];

const artifactBytes = new Uint8Array(readFileSync(ARTIFACT_PATH));
const artifactText = new TextDecoder('utf-8', { fatal: false }).decode(artifactBytes);

function parseArtifact(scope: string[] | null = SCOPE) {
  return floridaBestStructuredAdapter.parse({
    format: 'html', text: artifactText,
    scope: scope ? { grades: scope } : undefined,
  });
}

/** The fixture parsed with no scope, for the structure tests. */
function parseFixture() {
  return floridaBestStructuredAdapter.parse({ format: 'html', text: NESTED }).rows;
}

// ===========================================================================
test.describe('B1 nesting-aware extraction', () => {
// ===========================================================================

  test('B1.1 a flat regex loses a row with a nested table; this does not', () => {
    // The defect, demonstrated rather than described, with the mechanism it
    // actually has. A lazy <tr> match ends at the INNER closing tag, so the
    // fragment it captures carries the inner table's cells as if they were the
    // row's own. The row then has more than two cells and fails the "a
    // benchmark row has exactly two cells" test that every real row passes - so
    // it is not rejected loudly, it simply never becomes a benchmark.
    const flatRows = NESTED.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    const flatCodes = flatRows
      .map((row) => row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/gi) ?? [])
      .filter((cells) => cells.length === 2)
      .map((cells) => htmlToText(cells[0]!).trim())
      .filter((code) => /^ZZ\./.test(code));

    const depthAware = tableRows(NESTED)
      .filter((r) => r.cells.length === 2)
      .map((r) => htmlToText(r.cells[0]!.html).trim())
      .filter((code) => /^ZZ\./.test(code));

    expect(depthAware).toContain('ZZ.5.AR.3.3');
    expect(flatCodes).not.toContain('ZZ.5.AR.3.3');
    // The point: the flat reading is SHORT, and nothing about it errors.
    expect(flatCodes.length).toBe(depthAware.length - 1);
  });

  test('B1.2 the inner table is content of the outer row, not a row of its own', () => {
    const rows = tableRows(NESTED).filter((r) => r.cells.length === 2);
    const nested = rows.find((r) => htmlToText(r.cells[0]!.html).trim() === 'ZZ.5.AR.3.3');
    expect(nested).toBeDefined();
    expect(nested!.cells[1]!.html).toContain('<table');
    // Cells of the inner table must not be mistaken for cells of the outer row.
    expect(nested!.cells).toHaveLength(2);
  });

  test('B1.3 an unclosed element yields no span rather than one running to EOF', () => {
    expect(topLevelElements('<tr><td>a</td>', 'tr')).toEqual([]);
    // A stray close tag closes nothing; it must not fabricate a row.
    expect(topLevelElements('</tr><tr><td>a</td></tr>', 'tr')).toHaveLength(1);
  });

  test('B1.4 cell offsets point into the whole document, not into a fragment', () => {
    const row = tableRows(NESTED).find((r) => r.cells.length === 2
      && htmlToText(r.cells[0]!.html).trim() === 'ZZ.5.AR.3.1');
    const cell = row!.cells[1]!;
    expect(NESTED.slice(cell.span.start, cell.span.end)).toBe(cell.html);
  });
});

// ===========================================================================
test.describe('B2 wording, sections and entities', () => {
// ===========================================================================

  test('B2.1 the section heading is found in BOTH nesting orders', () => {
    const a = splitWording('Statement.<br /><i><u>Clarifications</u></i>:<br/>C1.');
    const b = splitWording('Statement.<br /><u><i>Examples</i></u>:<br/>E1.');
    expect(htmlToText(a.statementHtml)).toBe('Statement.');
    expect(htmlToText(b.statementHtml)).toBe('Statement.');
    expect(a.sections[0]!.heading).toBe('Clarifications');
    expect(b.sections[0]!.heading).toBe('Examples');
  });

  test('B2.2 malformed interleaving is not treated as a heading', () => {
    // <i><u>x</i></u> is not a well-formed pair. Accepting it would let stray
    // formatting truncate a benchmark statement.
    const r = splitWording('Statement.<i><u>Clarifications</i></u>: more.');
    expect(r.sections).toHaveLength(0);
    expect(htmlToText(r.statementHtml)).toContain('Statement.');
  });

  test('B2.3 examples never leak into the statement', () => {
    const withExamples = parseFixture().find((r) => r.source.code === 'ZZ.5.AR.3.2')!;
    expect(withExamples.source.statement).not.toContain('is an example');
    const sections = (withExamples.source.raw as { sections: { heading: string }[] }).sections;
    expect(sections.map((s) => s.heading)).toContain('Examples');
  });

  test('B2.4 the nested illustration is kept as a section, not lost and not inlined', () => {
    const nested = parseFixture().find((r) => r.source.code === 'ZZ.5.AR.3.3')!;
    expect(nested.source.statement).toBe(
      'A benchmark that illustrates itself with a two-column table.');
    const sections = (nested.source.raw as { sections: { heading: string; text: string }[] }).sections;
    expect(sections.map((s) => s.heading)).toEqual(['Clarifications', 'Examples']);
    expect(sections.find((s) => s.heading === 'Examples')!.text).toContain('Input');
  });

  test('B2.5 an unknown character reference survives instead of vanishing', () => {
    // Dropping it would delete a character from a state's wording; guessing it
    // would invent one. Leaving it visible gets it noticed in review.
    expect(decodeEntities('a &thinsp; b')).toBe('a &thinsp; b');
    expect(decodeEntities('&lt;&gt;&frac12;&#65;&#x42;')).toBe('<>½AB');
    const entities = parseFixture().find((r) => r.source.code === 'ZZ.5.AR.3.4')!;
    expect(entities.source.statement).toContain('<, > and ½');
    expect(entities.source.statement).toContain('&thinsp;');
  });

  test('B2.6 markup becomes text without words being changed', () => {
    // Both the opening and the closing block tag break, so adjacent paragraphs
    // stay separated rather than running together into one sentence.
    expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\n\ntwo');
    expect(htmlToText('one<br />two')).toBe('one\ntwo');
    // Markup machinery is never prose.
    expect(htmlToText('a<script>var x = "b";</script>c')).toBe('a c');
    // Insignificant whitespace collapses; words do not change.
    expect(htmlToText('spaced' + '\u00a0'.repeat(3) + 'word')).toBe('spaced word');
    expect(htmlToText('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  test('B2.7 a locator names a line a person can open', () => {
    expect(lineAt('a\nb\nc', 0)).toBe(1);
    expect(lineAt('a\nb\nc', 4)).toBe(3);
  });
});

// ===========================================================================
test.describe('B3 what the adapter refuses', () => {
// ===========================================================================

  test('B3.1 it refuses a format it cannot see into, as a refusal not an empty result', () => {
    const r = floridaBestStructuredAdapter.parse({ format: 'pdf', text: 'B.E.S.T.' });
    expect(r.rows).toHaveLength(0);
    expect(r.warnings.join(' ')).toContain('refusal, not an empty result');
  });

  test('B3.2 it refuses an artifact containing Access Points', () => {
    // Access Points are a separate publication. Mixing them in would put two
    // different things behind one benchmark code.
    const withAP = NESTED.replace('A plain benchmark', 'Access Point: a plain benchmark');
    const r = floridaBestStructuredAdapter.parse({ format: 'html', text: withAP });
    expect(r.rows).toHaveLength(0);
    expect(r.warnings.join(' ')).toContain('Access Points');
  });

  test('B3.3 it refuses markup that is not the layout it reads', () => {
    const verdict = floridaBestStructuredAdapter.supports({
      format: 'html', text: '<html><p>B.E.S.T. standards are great</p></html>',
      artifactName: 'press-release.html' });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.reason).toContain('grade or strand headings');
  });

  test('B3.4 it refuses a document that does not identify itself', () => {
    const verdict = floridaBestStructuredAdapter.supports({
      format: 'html', text: '<asp:Label ID="lblGradeLevelTitle">Grade: K</asp:Label><tr></tr>',
      artifactName: 'Florida-BEST-Mathematics-OFFICIAL.doc' });
    // The filename claims B.E.S.T. loudly. The filename is not evidence.
    expect(verdict.ok).toBe(false);
  });

  test('B3.5 exactly one adapter accepts the real artifact', () => {
    const format = detectFormat(artifactBytes);
    const accepting = ADAPTERS.filter((a) => a.supports({
      format, text: artifactText, artifactName: 'x.doc' }).ok);
    expect(accepting.map((a) => a.name)).toEqual(['florida-best-structured']);
  });

  test('B3.6 the delimited-export adapter no longer claims formats it cannot read', () => {
    for (const format of ['pdf', 'docx', 'xlsx', 'html'] as const) {
      const v = floridaBestMathematicsAdapter.supports({
        format, text: 'B.E.S.T.', artifactName: 'x' });
      expect(v.ok).toBe(false);
    }
    expect(floridaBestMathematicsAdapter.supports({
      format: 'csv', text: 'B.E.S.T.', artifactName: 'x' }).ok).toBe(true);
  });

  test('B3.7 a row under no grade heading is unresolved, never grade-guessed silently', () => {
    const headed = '<asp:Label ID="lblGradeLevelTitle">Grade: 5</asp:Label>'
      + '<asp:Label ID="lblBOKDescription">Strand: ALGEBRAIC REASONING</asp:Label>'
      + '<table><tr><td>ZZ.5.AR.1.1</td><td>Wording. B.E.S.T.</td></tr></table>';
    const orphaned = '<table><tr><td>ZZ.5.AR.1.1</td><td>Wording. B.E.S.T.</td></tr></table>'
      + '<asp:Label ID="lblGradeLevelTitle">Grade: 5</asp:Label>'
      + '<asp:Label ID="lblBOKDescription">Strand: ALGEBRAIC REASONING</asp:Label>';
    expect(floridaBestStructuredAdapter.parse({ format: 'html', text: headed })
      .rows[0]!.status).toBe('staged');
    const orphan = floridaBestStructuredAdapter.parse({ format: 'html', text: orphaned }).rows[0]!;
    expect(orphan.status).toBe('unresolved');
    expect(orphan.warnings.join(' ')).toContain('needs a person to confirm');
  });

  test('B3.8 a stated grade that contradicts the code is a conflict, not a preference', () => {
    const conflicting = '<asp:Label ID="lblGradeLevelTitle">Grade: 4</asp:Label>'
      + '<asp:Label ID="lblBOKDescription">Strand: ALGEBRAIC REASONING</asp:Label>'
      + '<table><tr><td>ZZ.5.AR.1.1</td><td>Wording. B.E.S.T.</td></tr></table>';
    const row = floridaBestStructuredAdapter.parse({ format: 'html', text: conflicting }).rows[0]!;
    expect(row.status).toBe('source_conflict');
    expect(row.normalized.grade).toBeNull();
    expect(row.warnings.join(' ')).toContain('not resolved by preferring either');
  });

  test('B3.9 a duplicate identity is reported, never merged', () => {
    const dupe = '<asp:Label ID="lblGradeLevelTitle">Grade: 5</asp:Label>'
      + '<asp:Label ID="lblBOKDescription">Strand: ALGEBRAIC REASONING</asp:Label>'
      + '<table><tr><td>ZZ.5.AR.1.1</td><td>First wording. B.E.S.T.</td></tr></table>'
      + '<table><tr><td>ZZ.5.AR.1.1</td><td>Second, different wording.</td></tr></table>';
    const rows = floridaBestStructuredAdapter.parse({ format: 'html', text: dupe }).rows;
    expect(rows.map((r) => r.status)).toEqual(['staged', 'duplicate']);
    expect(validateBatch({ adapter: 'x', adapterVersion: '1', rows, domains: [], warnings: [] })
      .some((f) => f.kind === 'duplicate_identity')).toBe(true);
  });

  test('B3.10 the strand check accepts real abbreviations and still rejects a mismatch', () => {
    // Both ways a heading abbreviates.
    expect(strandNameMatchesCode('NUMBER SENSE AND OPERATIONS', 'NSO')).toBe(true);
    expect(strandNameMatchesCode('DATA ANALYSIS AND PROBABILITY', 'DP')).toBe(true);
    expect(strandNameMatchesCode('FRACTIONS', 'FR')).toBe(true);
    expect(strandNameMatchesCode('MEASUREMENT', 'M')).toBe(true);
    // A check that accepted everything would not be a check.
    expect(strandNameMatchesCode('GEOMETRIC REASONING', 'NSO')).toBe(false);
    expect(strandNameMatchesCode('FRACTIONS', 'GR')).toBe(false);
  });

  test('B3.11 grade tokens normalise without inventing one', () => {
    expect(normaliseGrade('K')).toBe('K');
    expect(normaliseGrade('Kindergarten')).toBe('K');
    expect(normaliseGrade('K12')).toBe('K12');
    expect(normaliseGrade('912')).toBe('912');
    expect(normaliseGrade('Grade 3')).toBe('3');
    // Something unrecognised is passed through, not mapped to a plausible grade.
    expect(normaliseGrade('Upper Elementary')).toBe('UPPER ELEMENTARY');
  });
});

// ===========================================================================
test.describe('B4 scope', () => {
// ===========================================================================

  test('B4.1 out-of-scope rows are counted, not silently dropped', () => {
    const scoped = floridaBestStructuredAdapter.parse({
      format: 'html', text: NESTED, scope: { grades: SCOPE } });
    expect(scoped.rows.map((r) => r.source.code)).not.toContain('ZZ.6.FR.1.1');
    expect(scoped.outOfScope!.map((r) => r.code)).toContain('ZZ.6.FR.1.1');
    // "184 staged" means one thing out of 184 and another out of 642.
    const all = floridaBestStructuredAdapter.parse({ format: 'html', text: NESTED });
    expect(all.rows.length).toBe(scoped.rows.length + scoped.outOfScope!.length);
  });

  test('B4.2 the real artifact holds far more than this run was asked for', () => {
    const parsed = parseArtifact();
    expect(parsed.rows).toHaveLength(184);
    expect(parsed.outOfScope!.length).toBe(458);
    expect(parsed.rows.length + parsed.outOfScope!.length).toBe(642);
  });

  test('B4.3 no out-of-scope grade reaches the staged rows', () => {
    const grades = new Set(parseArtifact().rows.map((r) => r.normalized.grade));
    expect([...grades].sort()).toEqual(['1', '2', '3', '4', '5', 'K']);
  });
});

// ===========================================================================
test.describe('B5 the artifact gate', () => {
// ===========================================================================

  test('B5.1 the committed bytes are the bytes this ingestion was authorised for', () => {
    expect(artifactBytes.length).toBe(EXPECTED_BYTES);
    expect(sha256(artifactBytes)).toBe(EXPECTED_SHA256);
  });

  test('B5.2 format and representation come from the bytes, and disagree with the name', () => {
    expect(ARTIFACT_PATH.endsWith('.doc')).toBe(true);
    expect(detectFormat(artifactBytes)).toBe('html');
    expect(detectRepresentation(artifactBytes)).toBe('canonical_structured');
    // The mismatch between the claim and the bytes is surfaced, not smoothed.
    expect(formatDisagreement('application/msword', 'html'))
      .toBe('declared application/msword but the bytes are html');
  });

  test('B5.3 representation is a separate question from format', () => {
    const pressRelease = new TextEncoder().encode(
      '<!doctype html><html><body><h1>Standards adopted</h1><p>Text.</p></body></html>');
    expect(detectFormat(pressRelease)).toBe('html');
    expect(detectRepresentation(pressRelease)).toBe('canonical_html');
    expect(detectRepresentation(new TextEncoder().encode('%PDF-1.7\n'))).toBe('canonical_pdf');
  });

  test('B5.4 the artifact carries no Access Points', () => {
    expect(/access\s*point/i.test(artifactText)).toBe(false);
  });
});

// ===========================================================================
test.describe('B6 the count and wording gates', () => {
// ===========================================================================

  const parsed = parseArtifact();

  for (const grade of SCOPE) {
    test(`B6.1 grade ${grade} yields exactly ${EXPECTED_COUNTS[grade]} benchmarks`, () => {
      const n = parsed.rows.filter((r) => r.normalized.grade === grade).length;
      expect(n).toBe(EXPECTED_COUNTS[grade]);
    });
  }

  test('B6.2 the K-5 total is 184', () => {
    expect(parsed.rows).toHaveLength(184);
    expect(Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0)).toBe(184);
  });

  test('B6.3 every staged row carries non-empty official wording', () => {
    const empty = parsed.rows.filter((r) => !r.source.statement?.trim());
    expect(empty.map((r) => r.source.code)).toEqual([]);
    expect(parsed.rows).toHaveLength(184);
  });

  test('B6.4 no wording is truncated, holed or carrying raw glyph indices', () => {
    // The three ways a benchmark can be present and still wrong.
    for (const row of parsed.rows) {
      const s = row.source.statement!;
      expect(s).not.toMatch(/(…|\.\.\.)\s*$/);
      // A dropped run leaves a sentence ending at a space before its full stop.
      expect(s).not.toMatch(/\s[.,]\s*$/);
      // Unmapped glyph indices surface as control characters where prose belongs.
      expect(s).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/);
      expect(s).not.toContain('�');
    }
  });

  test('B6.5 every identity is unique and well-formed', () => {
    const codes = parsed.rows.map((r) => r.source.code!);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^MA\.(K|[1-5])\.[A-Z]{1,4}\.\d+\.\d+$/);
  });

  test('B6.6 every row is staged - none unresolved, conflicting or in error', () => {
    const byStatus: Record<string, number> = {};
    for (const r of parsed.rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    expect(byStatus).toEqual({ staged: 184 });
  });

  test('B6.7 validation over the real batch reports nothing', () => {
    expect(validateBatch(parsed, { expectedSubject: 'mathematics' })).toEqual([]);
  });

  test('B6.8 the grade the document states matches the grade the code carries', () => {
    // 184 independent agreements between two facts the document states in two
    // different places. This is why the grade is checked rather than derived.
    for (const row of parsed.rows) {
      const raw = row.source.raw as { statedGrade: string; codeGrade: string };
      expect(raw.statedGrade).toBe(raw.codeGrade);
    }
  });

  test('B6.9 the benchmark that broke the flat parse is present', () => {
    // The grade-5 row whose wording cell contains a table. This is the row a
    // lazy <tr> regex loses, and losing it is how the total came out 183.
    const row = parsed.rows.find((r) => r.source.code === 'MA.5.AR.3.2');
    expect(row).toBeDefined();
    expect(row!.source.statement!.length).toBeGreaterThan(0);
    expect((row!.source.raw as { wordingCellHtml: string }).wordingCellHtml).toContain('<table');
  });

  test('B6.10 every row can be found again in the artifact', () => {
    for (const row of parsed.rows) {
      expect(row.locator).toMatch(/^line \d+, Grade: (K|[1-5]), Strand: [A-Z ]+$/);
    }
  });

  test('B6.11 the domains are the ones the document declares', () => {
    expect(parsed.domains.map((d) => d.code).sort()).toEqual(['AR', 'DP', 'FR', 'GR', 'M', 'NSO']);
    for (const d of parsed.domains) expect(strandNameMatchesCode(d.name, d.code)).toBe(true);
  });

  test('B6.12 every staged statement appears verbatim in the artifact', () => {
    // The strongest available check that nothing was composed: each sentence
    // the pipeline is about to publish must be findable in the bytes it came
    // from, after the same markup-to-text collapsing and nothing else.
    const flattened = htmlToText(artifactText).replace(/\s+/g, ' ');
    for (const row of parsed.rows) {
      expect(flattened).toContain(row.source.statement!.replace(/\s+/g, ' '));
    }
  });
});

// ===========================================================================
test.describe('B7 nothing is invented', () => {
// ===========================================================================

  test('B7.1 no adapter source file contains a literal benchmark code', () => {
    for (const path of ['src/server/standards/adapters/florida-best-structured.ts',
                        'src/server/standards/adapters/florida-best-mathematics.ts',
                        'src/server/standards/adapters/florida-best-pdf.ts',
                        'src/server/standards/html.ts']) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      // Code layouts appear as regular expressions. Concrete codes must not.
      expect(source.match(/\bMA\.(K12|K|\d{1,2})\.[A-Z]{1,4}\.\d+\.\d+\b/g) ?? []).toEqual([]);
    }
  });

  test('B7.2 the fixture carries no state benchmark either', () => {
    expect(NESTED.match(/\bMA\.[A-Z0-9]+\./g) ?? []).toEqual([]);
  });
});
