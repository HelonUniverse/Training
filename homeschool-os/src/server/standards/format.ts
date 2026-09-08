import { createHash } from 'node:crypto';
import type { ArtifactRepresentation, SourceFormat } from './types';

/**
 * What is this file, really?
 *
 * A filename is a claim by whoever named it. A `.csv` that is actually a PDF,
 * or a `.xlsx` that is actually HTML, is an ordinary thing to be handed - and
 * parsing it as what it claims to be produces garbage rows that look like data.
 * So the format is decided from the leading bytes, and the declared MIME is
 * kept alongside only so the disagreement is visible.
 */
export function detectFormat(bytes: Uint8Array): SourceFormat {
  const head = Array.from(bytes.slice(0, 8));
  const startsWith = (sig: number[]) => sig.every((b, i) => head[i] === b);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) return 'pdf';        // %PDF
  // Both .docx and .xlsx are ZIP containers; the difference is inside.
  if (startsWith([0x50, 0x4b, 0x03, 0x04])) {
    const text = new TextDecoder('latin1').decode(bytes.slice(0, 4096));
    if (text.includes('word/')) return 'docx';
    if (text.includes('xl/')) return 'xlsx';
    return 'unknown';
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 4096)).trim();
  if (/^<\?xml/i.test(text)) return 'xml';
  if (/^<(!doctype html|html)\b/i.test(text)) return 'html';
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  // CSV last: it is the format with no signature, so it is what remains rather
  // than what we recognise. A file we cannot place is 'unknown', never 'csv'.
  if (/^[^\n]*,[^\n]*(\n|$)/.test(text)) return 'csv';
  return 'unknown';
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** True when the uploader's claim disagrees with the bytes. Worth surfacing. */
export function formatDisagreement(declaredMime: string | null, detected: SourceFormat): string | null {
  if (!declaredMime) return null;
  const expected: Record<SourceFormat, string[]> = {
    pdf: ['application/pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    csv: ['text/csv', 'application/csv', 'text/plain'],
    html: ['text/html'],
    json: ['application/json', 'text/json'],
    xml: ['application/xml', 'text/xml'],
    unknown: [],
  };
  const ok = expected[detected].some((m) => declaredMime.toLowerCase().startsWith(m));
  return ok ? null : `declared ${declaredMime} but the bytes are ${detected}`;
}

/**
 * HOW is the content carried?
 *
 * Separate from `detectFormat`, which answers what the bytes are. The artifact
 * that forced the distinction is CPALMS's B.E.S.T. Mathematics report: named
 * `.doc`, served as Word, opened by Word, and byte-for-byte HTML whose
 * benchmark code and benchmark wording are adjacent cells of one table row.
 * `detectFormat` correctly says `html`. That says nothing about whether the
 * code-to-wording association can be READ rather than inferred, and that is the
 * question which decides whether a benchmark is trustworthy.
 *
 * The test for `canonical_structured` is deliberately about STRUCTURE and not
 * about Florida: markup that carries a substantial number of two-cell rows is
 * markup where an identity sits beside its text. A state's press release about
 * its standards is also `html` and has no such rows, so it lands on
 * `canonical_html`, where an adapter must recover the association from document
 * order and should be far more suspicious of what it produces.
 *
 * This function never returns a `canonical_*` verdict for a format it cannot
 * see into. It is a floor, not a promise: an adapter still has to decide
 * whether it understands the particular document.
 */
export function detectRepresentation(bytes: Uint8Array, format?: SourceFormat): ArtifactRepresentation {
  const fmt = format ?? detectFormat(bytes);
  switch (fmt) {
    case 'pdf': return 'canonical_pdf';
    case 'csv':
    case 'xlsx': return 'canonical_tabular';
    case 'json':
    case 'xml': return 'canonical_structured';
    case 'docx': return 'canonical_html';   // a ZIP of XML; prose-flow inside
    case 'html': break;
    default: return 'unknown';
  }

  // Read enough to judge, not the whole file: a 40 MB document should not cost
  // 40 MB of decoding to answer a structural question.
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512 * 1024));
  const rows = countMatches(text, /<\s*tr\b/gi);
  const cells = countMatches(text, /<\s*t[dh]\b/gi);
  if (rows >= 8 && cells >= rows * 1.5) return 'canonical_structured';
  return 'canonical_html';
}

function countMatches(text: string, pattern: RegExp): number {
  let n = 0;
  pattern.lastIndex = 0;
  while (pattern.exec(text) !== null) n += 1;
  return n;
}
