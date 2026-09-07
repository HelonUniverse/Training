import type { ParseResult, StagedRow } from './types';

/**
 * Validation over a parsed batch.
 *
 * Everything here REPORTS. Nothing repairs. A validator that quietly fixes a
 * suspicious record removes the only signal that the source, or the parser, is
 * wrong - and the record it produces is then indistinguishable from one the
 * authority actually published.
 */
export type Finding = {
  rowNumber: number | null;
  code: string | null;
  kind:
    | 'duplicate_identity'
    | 'missing_identity'
    | 'unexpected_code_format'
    | 'grade_inconsistency'
    | 'subject_inconsistency'
    | 'orphan_domain'
    | 'duplicate_source_record'
    | 'invalid_date'
    | 'broken_supersession'
    | 'unresolved_row'
    | 'unexpected_structure';
  detail: string;
};

export function validateBatch(
  parsed: ParseResult,
  context: { knownDomainCodes?: Set<string>; expectedSubject?: string } = {},
): Finding[] {
  const findings: Finding[] = [];
  const declaredDomains = new Set(parsed.domains.map((d) => d.code));
  const known = context.knownDomainCodes ?? declaredDomains;
  const byCode = new Map<string, StagedRow[]>();

  for (const row of parsed.rows) {
    const code = row.normalized.code ?? row.source.code;
    if (code) {
      const list = byCode.get(code) ?? [];
      list.push(row);
      byCode.set(code, list);
    }

    if (!row.source.code) {
      findings.push({ rowNumber: row.rowNumber, code: null, kind: 'missing_identity',
        detail: 'the source row carries no benchmark code' });
    }
    if (row.status === 'parse_error') {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'unexpected_code_format',
        detail: row.warnings.join('; ') || 'the code did not match the published layout' });
    }
    if (row.status === 'source_conflict') {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'grade_inconsistency',
        detail: row.warnings.join('; ') });
    }
    if (row.status === 'unresolved') {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'unresolved_row',
        detail: row.warnings.join('; ') || 'unresolved' });
    }
    if (context.expectedSubject && row.normalized.subject
        && row.normalized.subject !== context.expectedSubject) {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'subject_inconsistency',
        detail: `expected ${context.expectedSubject}, row says ${row.normalized.subject}` });
    }
    if (row.source.domainCode && !known.has(row.source.domainCode)) {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'orphan_domain',
        detail: `references domain ${row.source.domainCode}, which the source never declares` });
    }
    // A benchmark with no grade at all is a real gap. A cross-cutting reference
    // legitimately has none, and flagging it would train reviewers to click past.
    if (row.normalized.referenceKind === 'benchmark' && !row.normalized.grade
        && row.status !== 'unresolved') {
      findings.push({ rowNumber: row.rowNumber, code, kind: 'grade_inconsistency',
        detail: 'a benchmark with no grade reference' });
    }
  }

  for (const [code, rows] of byCode) {
    if (rows.length > 1) {
      findings.push({ rowNumber: rows[1]!.rowNumber, code, kind: 'duplicate_identity',
        detail: `appears ${rows.length} times in one source (rows ${rows.map((r) => r.rowNumber).join(', ')})` });
    }
  }

  if (parsed.rows.length === 0) {
    findings.push({ rowNumber: null, code: null, kind: 'unexpected_structure',
      detail: 'the adapter produced no rows at all; treat as a refusal, not an empty framework' });
  }

  return findings;
}

/** Dates, checked where a caller supplies them rather than invented. */
export function validateVersionDates(from: string | null, to: string | null): Finding[] {
  if (!from || !to) return [];
  if (new Date(to) < new Date(from)) {
    return [{ rowNumber: null, code: null, kind: 'invalid_date',
      detail: `effective_to ${to} precedes effective_from ${from}` }];
  }
  return [];
}

/** A supersession pointing nowhere, or at itself, is broken. */
export function validateSupersession(
  edges: { id: string; supersededBy: string | null }[],
): Finding[] {
  const ids = new Set(edges.map((e) => e.id));
  const findings: Finding[] = [];
  for (const e of edges) {
    if (!e.supersededBy) continue;
    if (e.supersededBy === e.id) {
      findings.push({ rowNumber: null, code: e.id, kind: 'broken_supersession',
        detail: 'a record superseded by itself' });
    } else if (!ids.has(e.supersededBy)) {
      findings.push({ rowNumber: null, code: e.id, kind: 'broken_supersession',
        detail: `superseded by ${e.supersededBy}, which does not exist` });
    }
  }
  return findings;
}
