/**
 * Read the committed CPALMS artifact with the production adapter and report
 * every gate. Reports; publishes nothing, writes nothing to any database.
 *
 * Run:  node --import ./scripts/ts-register.mjs scripts/parse-florida-best.mjs [--json out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { detectFormat, detectRepresentation, sha256, formatDisagreement }
  from '../src/server/standards/format.ts';
import { ADAPTERS } from '../src/server/standards/adapters/index.ts';
import { validateBatch } from '../src/server/standards/validate.ts';

export const ARTIFACT = 'sources/cpalms/Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc';
export const EXPECTED_SHA256 =
  '474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914';
export const EXPECTED_BYTES = 841856;
/** The count gate, stated by the requester before anything was parsed. */
export const EXPECTED_COUNTS = { K: 22, 1: 26, 2: 27, 3: 34, 4: 39, 5: 36 };
export const SCOPE_GRADES = ['K', '1', '2', '3', '4', '5'];

export function readArtifact(path = ARTIFACT) {
  const bytes = new Uint8Array(readFileSync(path));
  const digest = sha256(bytes);
  const gate = {
    bytes: bytes.length, expectedBytes: EXPECTED_BYTES,
    sha256: digest, expectedSha256: EXPECTED_SHA256,
    ok: bytes.length === EXPECTED_BYTES && digest === EXPECTED_SHA256,
  };
  return { bytes, gate };
}

export function parseArtifact(path = ARTIFACT) {
  const { bytes, gate } = readArtifact(path);
  if (!gate.ok) return { gate, stop: 'the artifact is not the bytes this ingestion was authorised for' };

  const format = detectFormat(bytes);
  const representation = detectRepresentation(bytes, format);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const artifactName = path.split('/').pop();

  const offers = ADAPTERS.map((a) => ({ a, verdict: a.supports({ format, text, artifactName }) }));
  const chosen = offers.find((o) => o.verdict.ok);
  if (!chosen) {
    return { gate, format, representation, stop: 'no adapter accepted this artifact',
             refusals: offers.map((o) => `${o.a.name}: ${o.verdict.reason}`) };
  }

  const parsed = chosen.a.parse({ format, text, scope: { grades: SCOPE_GRADES } });
  const findings = validateBatch(parsed, { expectedSubject: 'mathematics' });
  return { gate, format, representation, text, artifactName,
           adapter: chosen.a, parsed, findings,
           declaredMimeDisagreement: formatDisagreement('application/msword', format),
           otherAdapterRefusals: offers.filter((o) => o !== chosen)
             .map((o) => `${o.a.name}: ${o.verdict.ok ? 'accepted' : o.verdict.reason}`) };
}

/** Per-grade counts against the gate. Never adjusts anything to make them match. */
export function countGate(parsed) {
  const byGrade = {};
  for (const r of parsed.rows) {
    const g = r.normalized.grade ?? r.source.grade ?? '(none)';
    byGrade[g] = (byGrade[g] ?? 0) + 1;
  }
  const lines = [];
  let allMatch = true;
  let expectedTotal = 0;
  for (const g of SCOPE_GRADES) {
    const expected = EXPECTED_COUNTS[g];
    const actual = byGrade[g] ?? 0;
    expectedTotal += expected;
    if (actual !== expected) allMatch = false;
    lines.push({ grade: g, actual, expected, match: actual === expected });
  }
  const extra = Object.keys(byGrade).filter((g) => !SCOPE_GRADES.includes(g));
  if (extra.length > 0) allMatch = false;
  return { lines, extra, total: parsed.rows.length, expectedTotal,
           totalMatch: parsed.rows.length === expectedTotal, allMatch };
}

/** Every staged row must carry non-empty official wording. */
export function wordingGate(parsed) {
  const empty = parsed.rows.filter((r) => !r.source.statement || r.source.statement.trim() === '');
  const shortest = [...parsed.rows]
    .filter((r) => r.source.statement)
    .sort((a, b) => a.source.statement.length - b.source.statement.length)
    .slice(0, 3)
    .map((r) => ({ code: r.source.code, length: r.source.statement.length }));
  return { checked: parsed.rows.length, empty: empty.map((r) => r.source.code), shortest };
}

function main() {
  const result = parseArtifact();
  console.log('--- SOURCE ARTIFACT GATE ---');
  console.log(`  bytes  ${result.gate.bytes}   expected ${result.gate.expectedBytes}`);
  console.log(`  sha256 ${result.gate.sha256}`);
  console.log(`         ${result.gate.expectedSha256} (expected)`);
  console.log(`  verdict: ${result.gate.ok ? 'MATCH' : 'MISMATCH - STOP'}`);
  if (result.stop) { console.log(`\nSTOP: ${result.stop}`); process.exit(1); }

  console.log('\n--- REPRESENTATION (from bytes, not filename) ---');
  console.log(`  filename says     ${result.artifactName.split('.').pop()}`);
  console.log(`  detected format   ${result.format}`);
  console.log(`  representation    ${result.representation}`);
  console.log(`  declared mime     ${result.declaredMimeDisagreement ?? 'agrees with the bytes'}`);
  console.log(`  adapter           ${result.adapter.name} v${result.adapter.version}`);
  for (const r of result.otherAdapterRefusals) console.log(`  other adapter     ${r}`);

  const { parsed } = result;
  const byStatus = {};
  for (const r of parsed.rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  console.log('\n--- PARSE ---');
  console.log(`  rows in scope     ${parsed.rows.length}`);
  console.log(`  rows out of scope ${parsed.outOfScope.length}`);
  console.log(`  by status         ${JSON.stringify(byStatus)}`);
  console.log(`  domains declared  ${parsed.domains.map((d) => d.code).sort().join(', ')}`);
  for (const w of parsed.warnings) console.log(`  warning           ${w}`);

  const counts = countGate(parsed);
  console.log('\n--- COUNT GATE ---');
  for (const l of counts.lines) {
    console.log(`  grade ${String(l.grade).padEnd(3)} parsed ${String(l.actual).padStart(3)}`
              + `  expected ${String(l.expected).padStart(3)}  ${l.match ? 'MATCH' : 'MISMATCH'}`);
  }
  console.log(`  TOTAL      parsed ${String(counts.total).padStart(3)}`
            + `  expected ${String(counts.expectedTotal).padStart(3)}`
            + `  ${counts.totalMatch ? 'MATCH' : 'MISMATCH'}`);
  if (counts.extra.length) console.log(`  UNEXPECTED GRADES: ${counts.extra.join(', ')}`);

  const wording = wordingGate(parsed);
  console.log('\n--- WORDING GATE ---');
  console.log(`  checked ${wording.checked}, empty ${wording.empty.length}`);
  if (wording.empty.length) console.log(`  EMPTY: ${wording.empty.join(', ')}`);
  console.log(`  shortest: ${wording.shortest.map((s) => `${s.code} (${s.length} chars)`).join(', ')}`);

  console.log('\n--- VALIDATION FINDINGS ---');
  if (result.findings.length === 0) console.log('  none');
  for (const f of result.findings.slice(0, 40)) {
    console.log(`  [${f.kind}] row ${f.rowNumber} ${f.code ?? ''}: ${f.detail}`);
  }
  if (result.findings.length > 40) console.log(`  ... and ${result.findings.length - 40} more`);

  const jsonAt = process.argv.indexOf('--json');
  if (jsonAt > -1 && process.argv[jsonAt + 1]) {
    writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      gate: result.gate, format: result.format, representation: result.representation,
      adapter: result.adapter.name, adapterVersion: result.adapter.version,
      domains: parsed.domains, rows: parsed.rows, outOfScope: parsed.outOfScope,
      warnings: parsed.warnings, findings: result.findings,
      counts, wording,
    }, null, 1));
    console.log(`\nwrote ${process.argv[jsonAt + 1]}`);
  }

  const pass = result.gate.ok && counts.allMatch && counts.totalMatch
            && wording.empty.length === 0 && result.findings.length === 0;
  console.log(`\nGATES: ${pass ? 'ALL PASS' : 'NOT ALL PASSED - see above'}`);
}

if (import.meta.url === `file://${process.argv[1]}`
    || process.argv[1]?.endsWith('parse-florida-best.mjs')) main();
