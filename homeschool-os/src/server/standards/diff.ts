import type { StagedRow } from './types';

/**
 * Enough diff to make a re-import reviewable, and no more.
 *
 * This is not a standards CMS. It answers one question: between what we
 * published and what the new artifact says, what changed and what does that
 * touch? A removed benchmark is reported as removed - never hard-deleted, since
 * a mapping made under it is part of a child's record.
 */
export type PublishedRecord = {
  code: string;
  statement: string | null;
  grade: string | null;
  domainCode: string | null;
};

export type StandardsDiff = {
  added: string[];
  removed: string[];
  changed: { code: string; field: 'statement' | 'grade' | 'domain'; from: string | null; to: string | null }[];
  unchanged: number;
};

export function diffStandards(previous: PublishedRecord[], next: PublishedRecord[]): StandardsDiff {
  const before = new Map(previous.map((r) => [r.code, r]));
  const after = new Map(next.map((r) => [r.code, r]));
  const diff: StandardsDiff = { added: [], removed: [], changed: [], unchanged: 0 };

  for (const [code, row] of after) {
    const old = before.get(code);
    if (!old) { diff.added.push(code); continue; }
    let changed = false;
    if (old.statement !== row.statement) {
      diff.changed.push({ code, field: 'statement', from: old.statement, to: row.statement });
      changed = true;
    }
    if (old.grade !== row.grade) {
      diff.changed.push({ code, field: 'grade', from: old.grade, to: row.grade });
      changed = true;
    }
    if (old.domainCode !== row.domainCode) {
      diff.changed.push({ code, field: 'domain', from: old.domainCode, to: row.domainCode });
      changed = true;
    }
    if (!changed) diff.unchanged += 1;
  }

  for (const code of before.keys()) if (!after.has(code)) diff.removed.push(code);

  diff.added.sort(); diff.removed.sort();
  return diff;
}

export function rowsToRecords(rows: StagedRow[]): PublishedRecord[] {
  return rows
    .filter((r) => r.normalized.code)
    .map((r) => ({
      code: r.normalized.code!,
      statement: r.source.statement,
      grade: r.normalized.grade,
      domainCode: r.source.domainCode,
    }));
}
