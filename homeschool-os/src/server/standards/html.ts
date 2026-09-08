/**
 * Reading tables out of markup, without a DOM.
 *
 * WHY NOT A REGEX PER ROW. The obvious way to find table rows is
 * /<tr>(.*?)<\/tr>/gs. It is wrong in a way that is almost invisible: a row
 * whose cell contains a nested table has an inner </tr> before the outer one,
 * so the lazy match ends early, the outer row is split into fragments, and the
 * benchmark it carried simply is not in the output. No error, no warning - a
 * count one lower than it should be.
 *
 * That is not hypothetical. In the CPALMS B.E.S.T. Mathematics export, exactly
 * one K-5 benchmark illustrates itself with a nested input/output table. Read
 * flatly, the inner table's cells are counted as the outer row's own, the row
 * fails a "exactly two cells" test that every real benchmark passes, and the
 * document yields 183 benchmarks instead of 184. A parser that loses one row in
 * 184 without saying so is worse than one that fails, because the result looks
 * finished. The regression fixture in tests/fixtures/standards reproduces the
 * shape; the test suite names the benchmark.
 *
 * So these functions track NESTING DEPTH. A `<tr>` at depth 0 opens a row; the
 * `</tr>` that returns depth to 0 closes it; everything between is the row's
 * content including any tables inside it. Same algorithm for cells.
 *
 * WHY NOT AN HTML PARSER LIBRARY. Adding one would be reasonable. It is not
 * added here because this file must do exactly one thing - report the byte
 * ranges of well-formed row and cell elements - and a general parser brings
 * error recovery, which for this job means silently inventing structure the
 * document does not have. When this document's markup is malformed, the right
 * outcome is a row that fails to parse and gets reviewed, not one a library
 * repaired into plausibility.
 */

/** Half-open byte range [start, end) into the source text. */
export type Span = { start: number; end: number };

const TAG = /<(\/?)([A-Za-z][\w:-]*)[^>]*?(\/?)>/g;

/**
 * Every element with this tag name that is NOT inside another element of the
 * same name, as the span of its inner content.
 *
 * Unbalanced markup ends the scan honestly: a `<tr>` that never closes produces
 * no span rather than a span running to end of file.
 */
export function topLevelElements(html: string, tagName: string): Span[] {
  const tag = tagName.toLowerCase();
  const out: Span[] = [];
  let depth = 0;
  let start: number | null = null;

  TAG.lastIndex = 0;
  for (let m = TAG.exec(html); m !== null; m = TAG.exec(html)) {
    const closing = m[1] === '/';
    const name = (m[2] ?? '').toLowerCase();
    const selfClosing = m[3] === '/';
    if (name !== tag || selfClosing) continue;

    if (!closing) {
      if (depth === 0) start = m.index + m[0].length;
      depth += 1;
    } else if (depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== null) {
        out.push({ start, end: m.index });
        start = null;
      }
    }
    // A stray </tr> at depth 0 is ignored rather than treated as a close: it
    // closes nothing, and pretending otherwise would fabricate a row.
  }
  return out;
}

export type Cell = { html: string; span: Span };
export type Row = { cells: Cell[]; html: string; span: Span };

/** Every top-level row in the document, with its top-level cells. */
export function tableRows(html: string, rowTag = 'tr', cellTag = 'td'): Row[] {
  return topLevelElements(html, rowTag).map((span) => {
    const inner = html.slice(span.start, span.end);
    const cells = topLevelElements(inner, cellTag).map((c) => ({
      html: inner.slice(c.start, c.end),
      // Offsets are translated back to the whole document so a locator points
      // at the artifact, not at a fragment nobody else can index into.
      span: { start: span.start + c.start, end: span.start + c.end },
    }));
    return { cells, html: inner, span };
  });
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', hellip: '…', deg: '°',
  times: '×', divide: '÷', plusmn: '±', minus: '−',
  le: '≤', ge: '≥', ne: '≠', frac12: '½',
  frac13: '⅓', frac14: '¼', frac23: '⅔', frac34: '¾',
  cent: '¢', pound: '£', euro: '€', bull: '•',
  middot: '·', sup2: '²', sup3: '³', radic: '√',
  pi: 'π', infin: '∞', asymp: '≈',
};

/**
 * Character references, decoded.
 *
 * An UNRECOGNISED named entity is left exactly as written. Dropping it would
 * silently delete a character from a state's published wording; guessing it
 * would invent one. Leaving `&thinsp;` visible in the text is ugly and will be
 * noticed in review, which is the point.
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try { return String.fromCodePoint(code); } catch { return whole; }
    }
    const named = ENTITIES[body];
    return named ?? whole;
  });
}

/** Elements whose content is markup machinery, never prose. */
const NON_TEXT = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
/** Elements that end a line of prose when they open or close. */
const BREAKS = /<\s*\/?\s*(br|p|div|li|tr|td|th|table|ul|ol|h[1-6])\b[^>]*>/gi;

/**
 * Markup to the text a reader would see.
 *
 * Block boundaries become newlines so a benchmark's paragraphs stay separate
 * paragraphs - both the opening and the closing tag break, so two adjacent
 * paragraphs end up separated by a blank line rather than running together.
 * Runs of spaces collapse, because HTML whitespace is not significant and
 * preserving the source's line wrapping would make two identical statements
 * compare as different.
 *
 * Nothing here removes, completes or normalises WORDS. The only transformations
 * are markup-to-text ones.
 */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(NON_TEXT, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(BREAKS, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(withBreaks)
    // A non-breaking space is a typographic space; folding it into ordinary
    // whitespace is a markup-to-text decision, made visibly here rather than
    // hidden by decoding the entity as a plain space in the first place.
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The same text on one line. For codes and headings, never for wording. */
export function htmlToInlineText(html: string): string {
  return htmlToText(html).replace(/\s*\n\s*/g, ' ').trim();
}

/**
 * A 1-based line number for a byte offset, so a locator reads like something a
 * person can find. Cheap because it is asked for a few hundred times, not per
 * character.
 */
export function lineAt(html: string, offset: number): number {
  let line = 1;
  const limit = Math.min(offset, html.length);
  for (let i = 0; i < limit; i += 1) if (html.charCodeAt(i) === 10) line += 1;
  return line;
}
