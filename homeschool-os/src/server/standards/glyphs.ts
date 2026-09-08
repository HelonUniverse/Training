/**
 * Glyph fidelity - the hard publication gate.
 *
 * A PDF stores text as glyph indices into a font. Turning those back into
 * characters needs the font's ToUnicode CMap (or a standard encoding). When a
 * file lacks that mapping, extractors behave differently, and both are wrong in
 * ways that are easy to miss:
 *
 *   pdf.js   drops the run entirely       -> a sentence quietly loses a word
 *   MuPDF    emits the raw glyph indices  -> "using the word" comes out as
 *                                            control bytes
 *
 * The second is dangerous only because it is visible; the first is dangerous
 * because it is not. Either way the file does not contain the information
 * needed to read the text, and NOTHING here may reconstruct it. A constant
 * offset that turns those indices back into English is a property of one subset
 * font's glyph order, not a decoding rule - applying it would be
 * reconstruction, and reconstructing a state's published wording is precisely
 * what this product must never do.
 *
 * So this module only ever DETECTS. It never repairs.
 */

/** Characters that legitimately appear in K-5 mathematics wording. */
export const EXPECTED_MATH = [
  '<', '>', '=', '≤', '≥', '+', '−', '-', '×', '÷', '±',
  '½', '⅓', '¼', '⅔', '¾', '°', '$', '¢', '%',
  '(', ')', '[', ']', '/', '.', ',',
] as const;

export type GlyphFinding =
  | { kind: 'unmapped_glyphs'; detail: string; sample: string }
  | { kind: 'dropped_run'; detail: string; sample: string }
  | { kind: 'extractor_disagreement'; detail: string; a: string; b: string }
  | { kind: 'suspicious_gap'; detail: string; sample: string };

/**
 * Raw glyph indices leaking into extracted text.
 *
 * The signature is NULs and C0/C1 control characters where prose belongs. Real
 * standards wording contains none of them. Built from char codes rather than
 * written as a literal so the pattern itself stays readable.
 */
const CONTROL_CHARS = new RegExp(
  `[${'\\u0000-\\u0008'}${'\\u000B\\u000C'}${'\\u000E-\\u001F'}${'\\u007F-\\u009F'}]`,
);

export function hasUnmappedGlyphs(text: string): boolean {
  return CONTROL_CHARS.test(text);
}

/**
 * A sentence that ends where a symbol should be.
 *
 * "the expectation is not to use the relational symbols ." is what a dropped
 * run looks like: the prose survives, the symbols do not, and the result reads
 * as a complete sentence with a hole in it.
 */
export function looksLikeDroppedRun(text: string): boolean {
  const t = text.trim();
  if (/\bExample:\s*$/.test(t)) return true;
  if (/\s[.,]\s*$/.test(t)) return true;
  return /\b(symbols?|expressions?|equations?|form is|restated as|such as)\b/i.test(t)
    && /\b(symbols?|expressions?|equations?|form|as|through|than|to|and|or)\s*[.,:]?\s*$/i.test(t);
}

export function normalizeForComparison(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractorsAgree(a: string, b: string): boolean {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

/**
 * Everything wrong with one candidate benchmark, seen by two extractors.
 *
 * A non-empty result means the benchmark is NOT stageable. There is no severity
 * scale and no threshold to tune: the wording is either what the state
 * published or it is not.
 */
export function checkGlyphFidelity(input: {
  code: string;
  extractorA: string | null;
  extractorB: string | null;
  locator: string;
}): GlyphFinding[] {
  const findings: GlyphFinding[] = [];
  const { extractorA: a, extractorB: b, locator } = input;

  for (const [name, text] of [['A', a], ['B', b]] as const) {
    if (!text) continue;
    if (hasUnmappedGlyphs(text)) {
      findings.push({
        kind: 'unmapped_glyphs',
        detail: `extractor ${name} returned raw glyph indices at ${locator}: the font carries no `
              + 'ToUnicode map, so this text cannot be read out of the file at all',
        sample: JSON.stringify(text.slice(0, 60)),
      });
    }
    if (looksLikeDroppedRun(text)) {
      findings.push({
        kind: 'dropped_run',
        detail: `extractor ${name} produced a sentence with a hole in it at ${locator}`,
        sample: text.slice(0, 120),
      });
    }
  }

  if (a && b && !extractorsAgree(a, b)) {
    findings.push({
      kind: 'extractor_disagreement',
      detail: `two independent extractors disagree at ${locator}`,
      a: a.slice(0, 120),
      b: b.slice(0, 120),
    });
  }
  if ((a && !b) || (b && !a)) {
    findings.push({
      kind: 'suspicious_gap',
      detail: `one extractor found text at ${locator} and the other found none`,
      sample: (a ?? b ?? '').slice(0, 120),
    });
  }

  return findings;
}

/** Document-level verdict. Reports; decides nothing beyond stageability. */
export function summariseGlyphFidelity(
  rows: { code: string; findings: GlyphFinding[] }[],
): { stageable: number; blocked: number; byKind: Record<string, number> } {
  const byKind: Record<string, number> = {};
  let blocked = 0;
  for (const r of rows) {
    if (r.findings.length > 0) blocked += 1;
    for (const f of r.findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  }
  return { stageable: rows.length - blocked, blocked, byKind };
}
