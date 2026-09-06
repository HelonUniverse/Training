/**
 * What we accept, and why.
 *
 * The list is short on purpose. Every format here is one the storage and
 * preview path genuinely handles; nothing is listed that would "work" only by
 * being stored and never rendered. DOCX is deliberately absent - the current
 * stack has no safe way to preview or extract it, and pretending otherwise
 * would produce files a parent could save but never open.
 */

export const ACCEPTED = {
  'image/jpeg': { ext: ['jpg', 'jpeg'], label: 'JPEG image', maxBytes: 25 * 1024 * 1024 },
  'image/png': { ext: ['png'], label: 'PNG image', maxBytes: 25 * 1024 * 1024 },
  'image/heic': { ext: ['heic'], label: 'HEIC photo', maxBytes: 25 * 1024 * 1024 },
  'image/heif': { ext: ['heif'], label: 'HEIF photo', maxBytes: 25 * 1024 * 1024 },
  'image/webp': { ext: ['webp'], label: 'WebP image', maxBytes: 25 * 1024 * 1024 },
  'application/pdf': { ext: ['pdf'], label: 'PDF', maxBytes: 50 * 1024 * 1024 },
} as const;

export type AcceptedMime = keyof typeof ACCEPTED;

export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED).join(',');
export const MAX_ANY_BYTES = 50 * 1024 * 1024;

/** Magic bytes. An extension is a claim; the first bytes are evidence. */
const SIGNATURES: Array<{ mime: AcceptedMime; test: (b: Uint8Array) => boolean }> = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'application/pdf',
    test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    // ISO-BMFF container: ....ftyp, then a HEIC/HEIF brand.
    mime: 'image/heic',
    test: (b) => {
      if (!(b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)) return false;
      const brand = String.fromCharCode(b[8] ?? 0, b[9] ?? 0, b[10] ?? 0, b[11] ?? 0);
      return ['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heim', 'heis'].includes(brand);
    },
  },
  {
    mime: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export type ValidationResult =
  | { ok: true; mime: AcceptedMime }
  | { ok: false; reason: 'too_large' | 'unsupported' | 'empty' | 'mismatch'; detail?: string };

/**
 * Validate by content, not by the browser's claim. A file whose declared type
 * and actual bytes disagree is refused rather than trusted either way.
 */
export function validateFileBytes(
  declaredMime: string,
  byteLength: number,
  head: Uint8Array,
): ValidationResult {
  if (byteLength <= 0) return { ok: false, reason: 'empty' };
  if (byteLength > MAX_ANY_BYTES) return { ok: false, reason: 'too_large' };

  const detected = SIGNATURES.find((s) => s.test(head))?.mime;

  // HEIF and HEIC share a container; treat them as one family.
  const normalise = (m: string) => (m === 'image/heif' ? 'image/heic' : m);

  if (!detected) {
    return { ok: false, reason: 'unsupported', detail: declaredMime };
  }
  if (normalise(declaredMime) !== detected && declaredMime !== '') {
    return { ok: false, reason: 'mismatch', detail: `${declaredMime} vs ${detected}` };
  }

  const rule = ACCEPTED[detected];
  if (byteLength > rule.maxBytes) return { ok: false, reason: 'too_large' };

  return { ok: true, mime: detected };
}

/** Message keys, so the UI never shows a MIME type to a parent. */
export const VALIDATION_MESSAGE: Record<
  Exclude<ValidationResult, { ok: true }>['reason'],
  string
> = {
  too_large: 'upload.errors.tooLarge',
  unsupported: 'upload.errors.unsupported',
  empty: 'upload.errors.empty',
  mismatch: 'upload.errors.mismatch',
};

/** Storage object name. Never the original filename - that is user input. */
export function storagePath(familyId: string, studentId: string | null, ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const rand = crypto.randomUUID();
  const scope = studentId ? studentId.slice(0, 8) : 'family';
  return `${familyId}/${scope}/${stamp}/${rand}.${ext.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
}

export function extensionFor(mime: AcceptedMime): string {
  return ACCEPTED[mime].ext[0] ?? 'bin';
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
