/**
 * Emit the SQL that walks the CPALMS artifact through the pipeline.
 *
 * WHY SQL AND NOT DIRECT WRITES. Every step here goes through the same RPCs and
 * the same RLS policies a person would go through, as a signed-in user holding
 * the platform capability and nothing more. An importer with a service-role key
 * would prove that the parser works and nothing about whether the gates do.
 *
 * WHY EMITTED RATHER THAN EXECUTED. The generated file is the record of what
 * was staged and published, reviewable before it runs and diffable afterwards.
 * It is also what makes local and managed provably the same ingestion rather
 * than two runs that happened to agree.
 *
 * The script REFUSES to emit anything if the artifact gate, the count gate, the
 * wording gate or validation does not pass. A generator that emits SQL for a
 * batch that failed its gates is a generator that will one day be run anyway.
 *
 * Usage:
 *   node --import ./scripts/ts-register.mjs scripts/ingest-florida-best.mjs \
 *        --admin <uuid> > /tmp/ingest.sql
 */
import { createHash } from 'node:crypto';
import { parseArtifact, countGate, wordingGate, ARTIFACT, EXPECTED_SHA256, EXPECTED_BYTES }
  from './parse-florida-best.mjs';

const FRAMEWORK_CODE = 'FL_BEST';
const VERSION_LABEL = '2020';
const SUBJECT = 'mathematics';
const ADAPTER_SCOPE = { grades: ['K', '1', '2', '3', '4', '5'], subject: SUBJECT,
                        accessPoints: false };

/** Provenance, as supplied with the artifact. Recorded, never inferred. */
const PROVENANCE = {
  authority: 'state_curriculum_portal',
  authorityName: 'Florida Department of Education (CPALMS)',
  artifactName: 'Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc',
  officialSourcePage: 'https://www.cpalms.org/downloads',
  acquisitionUrl: 'https://cpalmsmediaprod.blob.core.windows.net/downloads/reports/'
                + 'Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc',
  acquiredAt: '2026-09-08T16:23:49Z',
  declaredMime: 'application/msword',
  artifactKind: 'canonical_standards_publication',
  language: 'en-US',
};

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

/**
 * What the database must hold after a chunk is applied.
 *
 * Deliberately built the way Postgres will build it - concat_ws over the same
 * columns in the same order, newline separated, NULL rendered as an empty field
 * exactly as concat_ws does - so agreement means the values agree and not that
 * two different formatters happened to produce the same string.
 */
function chunkDigest(chunk) {
  const field = (v) => (v === null || v === undefined ? '' : String(v));
  const line = (row) => [
    row.rowNumber, row.status, row.source.code, row.source.statement,
    row.source.grade, row.source.domainCode, row.normalized.code,
    row.normalized.grade, row.locator,
  ].map(field).filter((_, i, a) => a).join('|');
  return createHash('md5').update(chunk.map(line).join('\n')).digest('hex');
}
const jsonb = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v) => (v.length === 0 ? "'{}'::text[]"
  : `array[${v.map(q).join(', ')}]::text[]`);

/**
 * TWO DIALECTS, ONE INGESTION.
 *
 * Local psql has the test harness's `t.login()` and can hold a temporary table
 * across the whole file. The managed project is reached through an MCP channel
 * that wraps every call in its own transaction, so a temporary table does not
 * survive between calls and the session's identity has to be re-established at
 * the top of each one.
 *
 * The DIFFERENCE IS ONLY IN HOW A SESSION IS ESTABLISHED AND HOW THE BATCH IS
 * FOUND. Every row, every value and every RPC call is generated from the same
 * parse, so "local and managed ran the same ingestion" is a fact about the
 * generator rather than a claim about two runs that happened to agree.
 *
 * In managed mode the batch is re-derived from the artifact's sha256 in every
 * chunk, which is also the safer construction: a chunk cannot append rows to
 * whatever batch happens to be newest.
 */
function main() {
  const admin = process.argv[process.argv.indexOf('--admin') + 1];
  const managed = process.argv.includes('--managed');
  const chunkAt = process.argv.indexOf('--chunk');
  const chunkSize = chunkAt > -1 ? Number(process.argv[chunkAt + 1]) : 0;
  if (!admin || !/^[0-9a-f-]{36}$/.test(admin)) {
    process.stderr.write('STOP: --admin <uuid> is required. Ingestion runs as a person.\n');
    process.exit(2);
  }

  const result = parseArtifact();
  if (!result.gate.ok || result.stop) {
    process.stderr.write(`STOP: ${result.stop ?? 'the artifact gate failed'}\n`);
    process.exit(1);
  }
  const counts = countGate(result.parsed);
  const wording = wordingGate(result.parsed);
  const problems = [];
  if (!counts.allMatch || !counts.totalMatch) problems.push('the count gate did not pass');
  if (wording.empty.length > 0) problems.push(`${wording.empty.length} rows have empty wording`);
  if (result.findings.length > 0) problems.push(`${result.findings.length} validation findings`);
  const notStaged = result.parsed.rows.filter((r) => r.status !== 'staged');
  if (notStaged.length > 0) {
    problems.push(`${notStaged.length} rows are not cleanly staged and need a person first`);
  }
  if (problems.length > 0) {
    process.stderr.write(`STOP - no SQL emitted:\n  ${problems.join('\n  ')}\n`);
    process.exit(1);
  }

  const { parsed } = result;
  const out = [];
  const w = (line = '') => out.push(line);

  w('-- =============================================================================');
  w('-- Florida B.E.S.T. Mathematics K-5, from the CPALMS structured export');
  w('-- =============================================================================');
  w('-- GENERATED by scripts/ingest-florida-best.mjs. Do not hand-edit: the point of');
  w('-- generating it is that it is derived from the artifact rather than typed.');
  w('--');
  w(`--   artifact         ${ARTIFACT}`);
  w(`--   sha256           ${EXPECTED_SHA256}`);
  w(`--   bytes            ${EXPECTED_BYTES}`);
  w(`--   detected format  ${result.format}   (the filename says .doc)`);
  w(`--   representation   ${result.representation}`);
  w(`--   adapter          ${parsed.adapter} v${parsed.adapterVersion}`);
  w(`--   scope            K-5, ${SUBJECT}, no Access Points`);
  w(`--   rows in scope    ${parsed.rows.length}`);
  w(`--   rows excluded    ${parsed.outOfScope.length} (present in the artifact, not requested)`);
  w('--');
  w('-- Every statement below runs as a signed-in user holding the platform');
  w('-- standards capability, through the same RPCs and the same RLS policies a');
  w('-- person would use. Nothing here uses a service role.');
  w('-- =============================================================================');
  w();
  if (!managed) w('begin;');
  w();
  // The session, established the way this deployment can establish one.
  const session = () => {
    if (managed) {
      w("set local role authenticated;");
      w("select set_config('request.jwt.claims',");
      w(`  json_build_object('sub', ${q(admin)}, 'role', 'authenticated')::text, true);`);
    } else {
      w(`select t.login(${q(admin)});`);
    }
  };
  const batchRef = managed
    ? `(select b.id from public.standards_import_batches b
        join public.standards_sources s on s.id = b.source_id
       where s.sha256 = ${q(EXPECTED_SHA256)} and b.adapter = ${q(parsed.adapter)})`
    : '(select batch_id from _ingest)';

  session();
  w('-- Refuse loudly rather than staging 184 rows as the wrong user. Written as a');
  w('-- raise and not as a CASE over 1/0: Postgres folds constant expressions at');
  w('-- plan time, so that guard fires whichever branch is taken - it would have');
  w('-- failed safe here and been useless as a check.');
  w('do $guard$ begin');
  w('  if not app.is_standards_admin() then');
  w("    raise exception 'this session does not hold standards.administer; nothing was staged'");
  w("      using errcode = 'insufficient_privilege';");
  w('  end if;');
  w('end $guard$;');
  w();

  w('-- --- 1. the artifact -------------------------------------------------------');
  if (managed) {
    w('select public.register_standards_source(');
  } else {
    w('create temporary table _ingest (source_id uuid, version_id uuid, batch_id uuid);');
    w('insert into _ingest (source_id) select public.register_standards_source(');
  }
  w(`  p_authority       => ${q(PROVENANCE.authority)},`);
  w(`  p_authority_name  => ${q(PROVENANCE.authorityName)},`);
  w(`  p_artifact_name   => ${q(PROVENANCE.artifactName)},`);
  w(`  p_detected_format => ${q(result.format)},`);
  w(`  p_sha256          => ${q(EXPECTED_SHA256)},`);
  w(`  p_byte_size       => ${EXPECTED_BYTES},`);
  w(`  p_declared_mime   => ${q(PROVENANCE.declaredMime)},`);
  w(`  p_language        => ${q(PROVENANCE.language)},`);
  w(`  p_artifact_kind   => ${q(PROVENANCE.artifactKind)},`);
  w(`  p_representation  => ${q(result.representation)},`);
  w(`  p_official_source_page => ${q(PROVENANCE.officialSourcePage)},`);
  w(`  p_acquisition_url => ${q(PROVENANCE.acquisitionUrl)},`);
  w(`  p_acquired_at     => ${q(PROVENANCE.acquiredAt)}::timestamptz,`);
  w(`  p_notes           => ${q('Served with a .doc extension and a Word MIME type; the bytes '
    + 'are HTML with each benchmark as a two-cell table row. Format is decided from the bytes.')});`);
  w();

  w('-- --- 2. the framework version ----------------------------------------------');
  w('-- A benchmark code is not an identity without one: the same code can mean');
  w('-- different things in two editions.');
  const sourceRef = managed
    ? `(select id from public.standards_sources where sha256 = ${q(EXPECTED_SHA256)})`
    : '(select source_id from _ingest)';
  const versionRef = managed
    ? `(select v.id from public.standards_framework_versions v
        join public.standards_frameworks f on f.id = v.framework_id
       where f.code = ${q(FRAMEWORK_CODE)} and v.version_label = ${q(VERSION_LABEL)}
         and v.subject = ${q(SUBJECT)})`
    : '(select version_id from _ingest)';
  w('insert into public.standards_framework_versions');
  w('  (framework_id, version_label, jurisdiction, subject, status, source_id, source_url)');
  w(`select f.id, ${q(VERSION_LABEL)}, 'FL', ${q(SUBJECT)}, 'active', ${sourceRef},`);
  w(`       ${q(PROVENANCE.officialSourcePage)}`);
  w(`  from public.standards_frameworks f where f.code = ${q(FRAMEWORK_CODE)}`);
  w('on conflict (framework_id, version_label, subject) do nothing;');
  if (!managed) {
    w('update _ingest set version_id = (');
    w('  select v.id from public.standards_framework_versions v');
    w('    join public.standards_frameworks f on f.id = v.framework_id');
    w(`   where f.code = ${q(FRAMEWORK_CODE)} and v.version_label = ${q(VERSION_LABEL)}`);
    w(`     and v.subject = ${q(SUBJECT)});`);
  }
  w();

  w('-- --- 3. the domains the document declares ----------------------------------');
  w('-- Called domains and not strands: "strand" is Florida\'s word, and the schema');
  w('-- does not learn one authority\'s vocabulary.');
  for (const [i, d] of parsed.domains.entries()) {
    w('insert into public.standards_domains (framework_version_id, code, name, sequence)');
    w(`select ${versionRef}, ${q(d.code)}, ${q(d.name)}, ${(i + 1) * 10}`);
    w('on conflict (framework_version_id, code) do nothing;');
  }
  w();

  w('-- --- 4. the batch ----------------------------------------------------------');
  w(managed ? 'select public.open_standards_import('
            : 'update _ingest set batch_id = (public.open_standards_import(');
  w(`  p_source => ${sourceRef},`);
  w(`  p_adapter => ${q(parsed.adapter)},`);
  w(`  p_adapter_version => ${q(parsed.adapterVersion)},`);
  w(`  p_framework_version => ${versionRef},`);
  w(`  p_scope => ${jsonb(ADAPTER_SCOPE)})${managed ? ';' : " ->> 'batch_id')::uuid;"}`);
  w();

  w(`-- --- 5. staging: ${parsed.rows.length} rows ------------------------------------------------`);
  w('-- The importer writes here and has no path to public.standards.');

  const rowDocument = (row) => {
    const raw = row.source.raw;
    return {
      n: row.rowNumber, st: row.status,
      code: row.source.code, grade: row.source.grade,
      dom: row.source.domainCode, domName: row.source.domainName,
      lang: row.source.language, stmt: row.source.statement,
      nCode: row.normalized.code, nGrade: row.normalized.grade,
      nSubj: row.normalized.subject, kind: row.normalized.referenceKind,
      aliases: row.normalized.aliases, warn: row.warnings, loc: row.locator,
      raw: { sections: raw.sections, statedGrade: raw.statedGrade,
             statedStrand: raw.statedStrand, codeGrade: raw.codeGrade,
             codeStrand: raw.codeStrand, locator: raw.locator },
    };
  };

  if (managed) {
    // THE SAME RPC, THE SAME VALUES, A DIFFERENT ENVELOPE.
    //
    // The named-argument form used locally repeats sixteen parameter names 184
    // times, which is more than half the bytes of this file. That is free on a
    // local socket and is not free across a channel where every byte is paid
    // for twice. So the values travel as one JSON document and a loop hands
    // each one to `stage_standard_record` - the same function, with the same
    // arguments, called the same number of times.
    //
    // The short keys are not obfuscation; they are the difference between one
    // request and two.
    const chunks = [];
    for (let i = 0; i < parsed.rows.length; i += (chunkSize || parsed.rows.length)) {
      chunks.push(parsed.rows.slice(i, i + (chunkSize || parsed.rows.length)));
    }
    chunks.forEach((chunk, index) => {
      if (index > 0) {
        w();
        w(`-- ==== CHUNK ${index + 1} (rows ${chunk[0].rowNumber}-`
          + `${chunk[chunk.length - 1].rowNumber}) ====`);
        session();
        w();
      }
      w('do $stage$');
      w('declare r jsonb;');
      w('begin');
      w('  for r in select * from jsonb_array_elements($rows$');
      w(`  ${JSON.stringify(chunk.map(rowDocument))}`);
      w('  $rows$::jsonb) loop');
      w('    perform public.stage_standard_record(');
      w(`      p_batch => ${batchRef},`);
      w("      p_row => (r->>'n')::integer, p_status => r->>'st',");
      w("      p_source_code => r->>'code', p_source_statement => r->>'stmt',");
      w("      p_source_grade => r->>'grade', p_source_domain_code => r->>'dom',");
      w("      p_source_domain_name => r->>'domName', p_source_language => r->>'lang',");
      w("      p_raw => r->'raw',");
      w("      p_normalized_code => r->>'nCode', p_normalized_grade => r->>'nGrade',");
      w("      p_normalized_subject => r->>'nSubj', p_reference_kind => r->>'kind',");
      w("      p_aliases => (select coalesce(array_agg(value #>> '{}'), '{}')");
      w("                      from jsonb_array_elements(r->'aliases')),");
      w("      p_warnings => r->'warn', p_source_locator => r->>'loc');");
      w('  end loop;');
      w('end $stage$;');

      // SELF-VERIFYING. These rows cross a channel where the SQL text is
      // retyped, and a single altered character inside a benchmark statement
      // would be invisible: the row count would still be right and the wording
      // would be a state's wording with one word changed. So each chunk carries
      // the md5 of what it is supposed to have written, computed here from the
      // parsed values, and checks it after writing. A corrupted chunk fails
      // loudly instead of publishing quietly.
      const expected = chunkDigest(chunk);
      w('do $verify$');
      w('declare v_actual text;');
      w('begin');
      w('  select md5(string_agg(concat_ws(\'|\', row_number, status::text, source_code,');
      w('                source_statement, source_grade, source_domain_code, normalized_code,');
      w('                normalized_grade, source_locator), chr(10) order by row_number))');
      w('    into v_actual from public.standards_staged_records');
      w(`   where batch_id = ${batchRef}`);
      w(`     and row_number between ${chunk[0].rowNumber} and ${chunk[chunk.length - 1].rowNumber};`);
      w(`  if v_actual is distinct from ${q(expected)} then`);
      w('    raise exception ');
      w(`      'chunk ${index + 1} did not arrive intact: expected md5 %, stored %',`);
      w(`      ${q(expected)}, v_actual using errcode = 'data_corrupted';`);
      w('  end if;');
      w('end $verify$;');
    });
    w();
  }

  if (!managed) parsed.rows.forEach((row) => {
    const raw = row.source.raw;
    if (chunkSize > 0 && row.rowNumber > 1 && (row.rowNumber - 1) % chunkSize === 0) {
      // A chunk boundary. Each chunk re-establishes its own session and finds
      // its own batch, so it is a complete, independently runnable transaction
      // rather than a fragment that only works after its predecessor.
      w();
      w(`-- ==== CHUNK ${Math.floor((row.rowNumber - 1) / chunkSize) + 1} `
        + `(rows ${row.rowNumber}-`
        + `${Math.min(row.rowNumber + chunkSize - 1, parsed.rows.length)}) ====`);
      session();
      w();
    }
    w('select public.stage_standard_record(');
    w(`  p_batch => ${batchRef}, p_row => ${row.rowNumber},`);
    w(`  p_status => ${q(row.status)},`);
    w(`  p_source_code => ${q(row.source.code)},`);
    w(`  p_source_statement => ${q(row.source.statement)},`);
    w(`  p_source_grade => ${q(row.source.grade)},`);
    w(`  p_source_domain_code => ${q(row.source.domainCode)},`);
    w(`  p_source_domain_name => ${q(row.source.domainName)},`);
    w(`  p_source_language => ${q(row.source.language)},`);
    w(`  p_raw => ${jsonb({ sections: raw.sections, statedGrade: raw.statedGrade,
                            statedStrand: raw.statedStrand, codeGrade: raw.codeGrade,
                            codeStrand: raw.codeStrand, locator: raw.locator })},`);
    w(`  p_normalized_code => ${q(row.normalized.code)},`);
    w(`  p_normalized_grade => ${q(row.normalized.grade)},`);
    w(`  p_normalized_subject => ${q(row.normalized.subject)},`);
    w(`  p_reference_kind => ${q(row.normalized.referenceKind)},`);
    w(`  p_aliases => ${arr(row.normalized.aliases)},`);
    w(`  p_warnings => ${jsonb(row.warnings)},`);
    w(`  p_source_locator => ${q(row.locator)});`);
  });
  w();

  w('-- --- 6. the batch is parsed, not approved ----------------------------------');
  w("update public.standards_import_batches set status = 'validation_pending',");
  w(`       rows_seen = ${parsed.rows.length + parsed.outOfScope.length},`);
  w(`       rows_staged = ${parsed.rows.length}, rows_unresolved = 0,`);
  w(`       warnings = ${jsonb(parsed.warnings)}`);
  w(` where id = ${batchRef};`);
  w();
  if (!managed) w('commit;');
  w();
  w('-- Publication is NOT in this file. A person reviews the staged rows and');
  w('-- approves them, and only then does publish_standards_batch run. The gate');
  w('-- is the whole point; an importer that approves its own work is not one.');

  process.stdout.write(out.join('\n') + '\n');
  process.stderr.write(`emitted ${parsed.rows.length} staged rows, `
    + `${parsed.domains.length} domains, ${parsed.outOfScope.length} rows out of scope\n`);
}

main();
