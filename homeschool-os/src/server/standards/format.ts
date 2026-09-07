import { createHash } from 'node:crypto';
import type { SourceFormat } from './types';

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
