import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { syntheticAdapter } from '../../src/server/standards/adapters/synthetic';
import { floridaBestMathematicsAdapter } from '../../src/server/standards/adapters/florida-best-mathematics';
import { detectFormat, sha256, formatDisagreement } from '../../src/server/standards/format';
import { validateBatch, validateSupersession, validateVersionDates } from '../../src/server/standards/validate';
import { diffStandards, rowsToRecords } from '../../src/server/standards/diff';
import { proposeMappings } from '../../src/server/standards/mapping';

/**
 * The golden fixture, and the parser boundaries around it.
 *
 * These run as plain unit tests inside the Playwright runner because that is
 * where this project's JavaScript tests already live. They need no browser and
 * no database: they are about what the parser refuses to invent.
 */

const FIXTURES = join(process.cwd(), 'tests/fixtures/standards');
const golden = readFileSync(join(FIXTURES, 'synthetic-golden.csv'));
const goldenV2 = readFileSync(join(FIXTURES, 'synthetic-golden-v2.csv'));

test.describe('source identification', () => {
  test('S1 the format comes from the bytes, not the filename', () => {
    expect(detectFormat(new Uint8Array(golden))).toBe('csv');
    expect(detectFormat(new TextEncoder().encode('%PDF-1.7\nnonsense'))).toBe('pdf');
    expect(detectFormat(new TextEncoder().encode('<!doctype html><p>hi'))).toBe('html');
    expect(detectFormat(new TextEncoder().encode('{"a":1}'))).toBe('json');
    // A file we cannot place is unknown. It is never optimistically called csv.
    expect(detectFormat(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe('unknown');
  });

  test('S2 a filename that disagrees with the bytes is surfaced', () => {
    expect(formatDisagreement('application/pdf', 'csv')).toContain('but the bytes are csv');
    expect(formatDisagreement('text/csv', 'csv')).toBeNull();
  });

  test('S3 the hash is stable and is what identity is built on', () => {
    expect(sha256(new Uint8Array(golden))).toBe(sha256(new Uint8Array(golden)));
    expect(sha256(new Uint8Array(golden))).not.toBe(sha256(new Uint8Array(goldenV2)));
    expect(sha256(new Uint8Array(golden))).toMatch(/^[0-9a-f]{64}$/);
  });
});

test.describe('the synthetic golden fixture', () => {
  const parsed = syntheticAdapter.parse({ format: 'csv', text: golden.toString('utf8') });

  test('G1 multiple grades and multiple strands parse', () => {
    // Benchmarks only: the cross-cutting row is also `staged` and legitimately
    // carries no grade, so folding it in here would assert that null is a grade.
    const grades = new Set(
      parsed.rows
        .filter((r) => r.status === 'staged' && r.normalized.referenceKind === 'benchmark')
        .map((r) => r.normalized.grade),
    );
    expect([...grades].sort()).toEqual(['1', '2', '3', '4', '5', 'K']);
    expect(parsed.domains.map((d) => d.code).sort()).toEqual(['DA', 'FR', 'GM', 'NS', 'OP', 'RP']);
  });

  test('G2 a cross-cutting reference keeps no grade, and that is not a gap', () => {
    const crossCutting = parsed.rows.find((r) => r.normalized.referenceKind === 'cross_cutting');
    expect(crossCutting).toBeTruthy();
    expect(crossCutting!.normalized.grade).toBeNull();
    expect(crossCutting!.status).toBe('staged');
  });

  test('G3 a duplicate identity is reported, not deduplicated away', () => {
    const dupes = parsed.rows.filter((r) => r.status === 'duplicate');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]!.warnings.join(' ')).toContain('duplicate of row');
  });

  test('G4 a missing code is unresolved and is NOT inferred from neighbours', () => {
    const row = parsed.rows.find((r) => r.source.code === null);
    expect(row!.status).toBe('unresolved');
    expect(row!.normalized.code).toBeNull();
    expect(row!.warnings.join(' ')).toContain('not inferred from neighbours');
  });

  test('G5 a missing grade on a benchmark is unresolved, never derived', () => {
    const row = parsed.rows.find((r) => r.source.code === 'TEST.MATH.3.OP.001');
    expect(row!.status).toBe('unresolved');
    expect(row!.normalized.grade).toBeNull();
  });

  test('G6 truncated wording is flagged and never completed', () => {
    const row = parsed.rows.find((r) => r.source.code === 'TEST.MATH.5.GM.002');
    expect(row!.status).toBe('ambiguous');
    expect(row!.warnings.join(' ')).toContain('truncated');
    expect(row!.source.statement).toMatch(/…$/);
  });

  test('G7 every fixture identifier is obviously synthetic', () => {
    for (const row of parsed.rows) {
      if (!row.source.code) continue;
      expect(row.source.code.startsWith('TEST.')).toBe(true);
    }
  });

  test('G8 validation reports each category and repairs nothing', () => {
    const findings = validateBatch(parsed, { expectedSubject: 'mathematics' });
    const kinds = new Set(findings.map((f) => f.kind));
    expect(kinds.has('missing_identity')).toBe(true);
    expect(kinds.has('duplicate_identity')).toBe(true);
    expect(kinds.has('unresolved_row')).toBe(true);
    // The parsed rows are unchanged by having been validated.
    expect(parsed.rows.find((r) => r.source.code === null)!.normalized.code).toBeNull();
  });

  test('G9 an orphan domain reference is caught', () => {
    const withOrphan = {
      ...parsed,
      rows: [{ ...parsed.rows[0]!, source: { ...parsed.rows[0]!.source, domainCode: 'ZZ' } }],
    };
    const findings = validateBatch(withOrphan, { knownDomainCodes: new Set(['NS']) });
    expect(findings.some((f) => f.kind === 'orphan_domain')).toBe(true);
  });

  test('G10 broken supersession and impossible dates are caught', () => {
    expect(validateSupersession([{ id: 'a', supersededBy: 'a' }])[0]!.kind).toBe('broken_supersession');
    expect(validateSupersession([{ id: 'a', supersededBy: 'ghost' }])[0]!.detail).toContain('does not exist');
    expect(validateVersionDates('2030-01-01', '2020-01-01')[0]!.kind).toBe('invalid_date');
  });
});

test.describe('change detection', () => {
  const v1 = syntheticAdapter.parse({ format: 'csv', text: golden.toString('utf8') });
  const v2 = syntheticAdapter.parse({ format: 'csv', text: goldenV2.toString('utf8') });

  test('C1 the same artifact twice is a no-op diff', () => {
    const diff = diffStandards(rowsToRecords(v1.rows), rowsToRecords(v1.rows));
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  test('C2 a changed statement is staged as a change, not an overwrite', () => {
    const diff = diffStandards(rowsToRecords(v1.rows), rowsToRecords(v2.rows));
    const changed = diff.changed.find((c) => c.code === 'TEST.MATH.1.NS.001');
    expect(changed!.field).toBe('statement');
    expect(changed!.from).toContain('within twenty');
    expect(changed!.to).toContain('within one hundred');
  });

  test('C3 an added and a removed benchmark are both reported', () => {
    const diff = diffStandards(rowsToRecords(v1.rows), rowsToRecords(v2.rows));
    expect(diff.added).toContain('TEST.MATH.5.PR.001');
    expect(diff.removed).toContain('TEST.MATH.2.DA.001');
  });
});

test.describe('the Florida adapter refuses rather than invents', () => {
  test('F1 it contains no Florida benchmark of its own', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/server/standards/adapters/florida-best-mathematics.ts'), 'utf8');
    // The published code layout appears as a regular expression. An actual
    // benchmark - a concrete grade and numbers - must not.
    const literalCodes = source.match(/\bMA\.\d+\.[A-Z]{1,3}\.\d+\.\d+\b/g) ?? [];
    expect(literalCodes).toEqual([]);
  });

  test('F2 it refuses an artifact that does not identify itself', () => {
    const verdict = floridaBestMathematicsAdapter.supports({
      format: 'csv', text: 'code,statement\nX,Y', artifactName: 'something-else.csv' });
    expect(verdict.ok).toBe(false);
  });

  test('F3 it refuses a format it cannot read, rather than returning zero rows as success', () => {
    const result = floridaBestMathematicsAdapter.parse({ format: 'pdf', text: 'B.E.S.T.' });
    expect(result.rows).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('refusal, not an empty result');
  });

  test('F4 grade derived from a code must AGREE with the source, or it is a conflict', () => {
    const csv = [
      'code,statement,grade,strand_code,strand_name,kind',
      'MA.4.TS.1.1,A statement about B.E.S.T.,4,TS,Test Strand,benchmark',
      'MA.4.TS.1.2,Another statement,5,TS,Test Strand,benchmark',
      'MA.4.TS.1.3,A third statement,,TS,Test Strand,benchmark',
    ].join('\n');
    const result = floridaBestMathematicsAdapter.parse({ format: 'csv', text: csv });

    expect(result.rows[0]!.status).toBe('staged');
    expect(result.rows[0]!.normalized.grade).toBe('4');

    // Code says 4, source says 5. Neither is preferred.
    expect(result.rows[1]!.status).toBe('source_conflict');
    expect(result.rows[1]!.normalized.grade).toBeNull();

    // Source says nothing: the derivation is a candidate a person confirms.
    expect(result.rows[2]!.status).toBe('unresolved');
    expect(result.rows[2]!.warnings.join(' ')).toContain('needs a person to confirm');
  });

  test('F5 a practice code is cross-cutting and gets no grade', () => {
    const csv = [
      'code,statement,grade,strand_code,strand_name,kind',
      'MA.K12.MTR.1.1,A B.E.S.T. practice expectation,,MTR,Practices,practice',
    ].join('\n');
    const result = floridaBestMathematicsAdapter.parse({ format: 'csv', text: csv });
    expect(result.rows[0]!.normalized.referenceKind).toBe('cross_cutting');
    expect(result.rows[0]!.normalized.grade).toBeNull();
  });

  test('F6 a malformed code is a parse error, never repaired', () => {
    const csv = [
      'code,statement,grade,strand_code,strand_name,kind',
      'NOT-A-CODE,A statement about B.E.S.T.,4,TS,Test Strand,benchmark',
    ].join('\n');
    const result = floridaBestMathematicsAdapter.parse({ format: 'csv', text: csv });
    expect(result.rows[0]!.status).toBe('parse_error');
    expect(result.rows[0]!.warnings.join(' ')).toContain('not repaired');
  });
});

test.describe('deterministic mapping before AI', () => {
  const standards = [
    { standardId: 's1', code: 'TEST.MATH.4.FR.001', statement: null,
      normalizedSubject: 'mathematics', domainCode: 'FR', aliases: [] },
    { standardId: 's2', code: 'TEST.MATH.5.GM.001', statement: null,
      normalizedSubject: 'geography', domainCode: 'GM', aliases: [] },
  ];

  test('M1 an exact code match is proposed without any model call', () => {
    const { proposals, needsSemantic } = proposeMappings({
      skills: [{ skillId: 'k1', code: 'TEST.MATH.4.FR.001', name: 'x', aliases: [], subject: null }],
      standards,
      existing: new Set(),
    });
    expect(proposals[0]!.strategy).toBe('exact_code');
    expect(proposals[0]!.confidence).toBeNull();
    expect(needsSemantic.map((s) => s.standardId)).toEqual(['s2']);
  });

  test('M2 an already-approved mapping proposes nothing at all', () => {
    const { proposals, needsSemantic } = proposeMappings({
      skills: [{ skillId: 'k1', code: 'TEST.MATH.4.FR.001', name: 'x', aliases: [], subject: null }],
      standards: [standards[0]!],
      existing: new Set(['k1::s1']),
    });
    expect(proposals).toHaveLength(0);
    expect(needsSemantic).toHaveLength(0);
  });

  test('M3 subject narrowing proposes only when it narrows to exactly one', () => {
    const two = proposeMappings({
      skills: [
        { skillId: 'k1', code: null, name: 'a', aliases: [], subject: 'mathematics' },
        { skillId: 'k2', code: null, name: 'b', aliases: [], subject: 'mathematics' },
      ],
      standards: [standards[0]!],
      existing: new Set(),
    });
    expect(two.proposals).toHaveLength(0);
    expect(two.needsSemantic).toHaveLength(1);
  });

  test('M4 nothing deterministic ever proposes an approved mapping', () => {
    const { proposals } = proposeMappings({
      skills: [{ skillId: 'k1', code: 'TEST.MATH.4.FR.001', name: 'x', aliases: [], subject: null }],
      standards, existing: new Set(),
    });
    for (const p of proposals) {
      expect(p.provenance).not.toBe('nestra_reviewed');
      expect(Object.keys(p)).not.toContain('status');
    }
  });
});

/* =========================================================================== *
 * PHASE B PREPARATION
 *
 * No authoritative Florida artifact has been supplied, so none of this parses
 * a real one. What it does prove is the machinery that will meet it: that the
 * source-of-truth rule is enforced rather than remembered, that a scan is
 * refused instead of OCR'd, and that a layout this parser cannot read produces
 * a refusal rather than confidently mismatched rows.
 * ========================================================================== */

import { classifyArtifact } from '../../src/server/standards/classify';
import { assessLayout, segment } from '../../src/server/standards/adapters/florida-best-pdf';

/** Synthetic pages. The codes below use the published SHAPE with a strand that
 *  does not exist, so nothing here can be mistaken for a real benchmark. */
function line(page: number, n: number, text: string) {
  return { page, line: n, text, locator: `p${page}:${n}` };
}

test.describe('the source-of-truth rule is enforced, not remembered', () => {
  test('P1 the authority\'s own standards publication is the only kind that may publish', () => {
    const result = classifyArtifact({
      title: "Florida's B.E.S.T. Standards for Mathematics",
      artifactName: 'best-math.pdf',
      openingText: 'Benchmarks for Excellent Student Thinking',
    });
    expect(result.kind).toBe('canonical_standards_publication');
    expect(result.confidence).toBe('clear');
  });

  test('P2 a parent guide is classified as a guide even though it says "standards"', () => {
    const result = classifyArtifact({
      title: "B.E.S.T. Standards for Mathematics Parent Guide",
      artifactName: 'guide.pdf',
      openingText: 'A guide for families to the B.E.S.T. Standards for Mathematics.',
    });
    expect(result.kind).toBe('parent_guide');
  });

  test('P3 progressions, blueprints and correlations are all secondary', () => {
    const kinds = [
      ['Mathematics Learning Progression Document', 'progression_document'],
      ['Grade 4 Mathematics Test Item Specifications', 'assessment_blueprint'],
      ['Instructional Materials Correlation to the Standards', 'correlation_spreadsheet'],
      ['Grade 4 Mathematics Instructional Guide', 'instructional_guide'],
    ] as const;
    for (const [title, expected] of kinds) {
      expect(classifyArtifact({ title, artifactName: 'x.pdf', openingText: '' }).kind).toBe(expected);
    }
  });

  test('P4 a third-party export is refused outright', () => {
    expect(classifyArtifact({
      title: 'Florida Math Standards', artifactName: 'export.csv',
      openingText: 'Downloaded from Quizlet',
    }).kind).toBe('third_party_export');
  });

  test('P5 a document that only MENTIONS the standards does not become them', () => {
    const result = classifyArtifact({
      title: 'District Curriculum Map 2026',
      artifactName: 'map.pdf',
      openingText: 'Aligned to the B.E.S.T. Standards for Mathematics throughout.',
    });
    expect(result.kind).toBe('other_reference');
    expect(result.reason).toContain('does not declare itself to BE them');
  });

  test('P6 an unidentifiable document is not assumed to be the standards', () => {
    const result = classifyArtifact({ title: null, artifactName: 'download.pdf', openingText: 'Page 1' });
    expect(result.kind).toBe('other_reference');
    expect(result.confidence).toBe('uncertain');
  });
});

test.describe('the PDF path refuses what it cannot read', () => {
  test('P7 a document with no benchmark codes is a structural refusal, not an empty framework', () => {
    const outcome = segment([line(1, 1, 'Table of contents'), line(1, 2, 'Introduction ....... 3')]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal).toContain('Refusing rather than returning');
      expect(outcome.diagnostics.codesFound).toBe(0);
    }
  });

  test('P8 a flowed layout is refused rather than mis-segmented', () => {
    // Codes buried mid-sentence: this parser would pair the wrong statement
    // with the wrong code, so it must refuse instead.
    const outcome = segment([
      line(1, 1, 'Students will meet MA.4.ZZ.1.1 and then MA.4.ZZ.1.2 during the year.'),
      line(1, 2, 'Later they encounter MA.5.ZZ.2.1 alongside MA.5.ZZ.2.2 in context.'),
    ]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.refusal).toContain('mid-line');
  });

  test('P9 a clean layout segments, and every benchmark keeps its page locator', () => {
    const outcome = segment([
      line(41, 1, 'MA.4.ZZ.1.1 A synthetic statement for one benchmark.'),
      line(41, 2, 'It continues onto a second line.'),
      line(41, 3, '41'),
      line(42, 4, 'MA.4.ZZ.1.2 A second synthetic statement.'),
    ]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rows).toHaveLength(2);
    expect(outcome.rows[0]!.source.statement).toBe(
      'A synthetic statement for one benchmark. It continues onto a second line.');
    expect((outcome.rows[0]!.source.raw as { locator: string }).locator).toBe('p41:1');
    // The bare page number was dropped as furniture, not glued into the statement.
    expect(outcome.rows[0]!.source.statement).not.toContain('41 ');
  });

  test('P10 a derived grade stays UNRESOLVED because the PDF states grade by section', () => {
    const outcome = segment([line(41, 1, 'MA.4.ZZ.1.1 A synthetic statement.')]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rows[0]!.status).toBe('unresolved');
    expect(outcome.rows[0]!.normalized.grade).toBe('4');
    expect(outcome.rows[0]!.warnings.join(' ')).toContain('a person confirms it');
  });

  test('P11 a code with no statement is unresolved, never reconstructed', () => {
    const outcome = segment([
      line(1, 1, 'MA.4.ZZ.1.1'),
      line(1, 2, 'MA.4.ZZ.1.2 A synthetic statement.'),
    ]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rows[0]!.status).toBe('unresolved');
    expect(outcome.rows[0]!.source.statement).toBeNull();
    expect(outcome.rows[0]!.warnings.join(' ')).toContain('not reconstructed');
  });

  test('P12 a practice code is cross-cutting and gets no grade', () => {
    const outcome = segment([line(3, 1, 'MA.K12.MTR.9.1 A synthetic practice expectation.')]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rows[0]!.normalized.referenceKind).toBe('cross_cutting');
    expect(outcome.rows[0]!.normalized.grade).toBeNull();
  });

  test('P13 a duplicate identity is reported with where it was first seen', () => {
    const outcome = segment([
      line(41, 1, 'MA.4.ZZ.1.1 A synthetic statement.'),
      line(88, 2, 'MA.4.ZZ.1.1 The same code again.'),
    ]);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rows[1]!.status).toBe('duplicate');
    expect(outcome.rows[1]!.warnings.join(' ')).toContain('p88:2');
  });

  test('P14 layout assessment reports its evidence rather than a verdict alone', () => {
    const good = assessLayout([line(1, 1, 'MA.4.ZZ.1.1 Statement.')]);
    expect(good.ok).toBe(true);
    expect(good.codesAtLineStart).toBe(1);
  });

  test('P15 neither PDF file contains a real Florida benchmark', () => {
    for (const path of ['src/server/standards/adapters/florida-best-pdf.ts',
                        'src/server/standards/adapters/florida-best-mathematics.ts',
                        'src/server/standards/classify.ts']) {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      // A concrete grade + real strand + numbers. The shape regexes and the ZZ
      // fixtures do not match this.
      const literal = source.match(/\bMA\.\d{1,2}\.(?:NSO|FR|AR|M|GR|DP|NR|AL|GR)\.\d+\.\d+\b/g) ?? [];
      expect(literal, `${path} must contain no real benchmark`).toEqual([]);
    }
  });
});
