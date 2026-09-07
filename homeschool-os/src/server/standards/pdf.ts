/**
 * Reading text out of a PDF, with the page it came from.
 *
 * WHY PAGE NUMBERS. Requirement 4 asks for source location, and the reason is
 * not bookkeeping: a reviewer comparing our record against the state's document
 * needs to be told where to look. "Page 41, lines 12-14" makes a spot check a
 * ten-second job and makes a disagreement resolvable. Without it, checking a
 * thousand benchmarks means reading a thousand pages.
 *
 * WHAT THIS REFUSES. A PDF with no text layer is a scan. The honest response to
 * a scan is to say so - OCR would produce benchmark codes with plausible
 * character substitutions (MA.4.FR.1.1 vs MA.4.FR.l.1) that look right and are
 * wrong. There is no OCR path here on purpose.
 */

export type PdfLine = {
  page: number;
  line: number;
  text: string;
  /** "p41:12" - what a reviewer types into a page box. */
  locator: string;
};

export type PdfExtraction = {
  lines: PdfLine[];
  pageCount: number;
  /** Metadata read from the DOCUMENT, not from its filename or our assumptions. */
  info: {
    title: string | null;
    author: string | null;
    subject: string | null;
    keywords: string | null;
    creationDate: string | null;
    modificationDate: string | null;
    producer: string | null;
  };
  warnings: string[];
};

export class NoTextLayerError extends Error {
  constructor(pageCount: number) {
    super(
      `this PDF has ${pageCount} page(s) and no extractable text layer. It is a scan. ` +
        'Refusing: OCR of a standards document produces codes that differ from the ' +
        'published ones by characters nobody notices. Supply a text-bearing PDF.',
    );
    this.name = 'NoTextLayerError';
  }
}

/**
 * Group the positioned text items pdf.js returns back into visual lines.
 *
 * pdf.js gives items with a transform matrix, not lines: a single visual line
 * routinely arrives as several items, and reading order is not guaranteed to be
 * visual order. Items are bucketed by their y coordinate (rounded, because
 * glyphs on one line differ by fractions of a point) and then sorted by x.
 *
 * The tolerance is deliberately conservative. Merging two lines that were not
 * one line silently joins a code to the wrong statement, which is exactly the
 * class of error this whole pipeline exists to avoid - so where the geometry is
 * ambiguous, this leaves them separate and lets a later stage report an
 * unresolved row.
 */
const Y_TOLERANCE = 2;

export async function extractPdfLines(bytes: Uint8Array): Promise<PdfExtraction> {
  // Imported lazily: pdf.js is a large ESM bundle and nothing in the family
  // request path should pay for loading it.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '';

  const doc = await pdfjs.getDocument({
    data: bytes,
    // A standards document needs no scripting, no external fetches and no
    // fonts of ours. This is untrusted input: it gets nothing.
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  const warnings: string[] = [];
  const lines: PdfLine[] = [];
  let lineNumber = 0;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    const buckets = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || typeof item.str !== 'string') continue;
      if (item.str.length === 0) continue;
      const x = item.transform[4] as number;
      const y = item.transform[5] as number;
      const key = Math.round(y / Y_TOLERANCE) * Y_TOLERANCE;
      const bucket = buckets.get(key) ?? [];
      bucket.push({ x, text: item.str });
      buckets.set(key, bucket);
    }

    // Top of the page downwards, then left to right within a line.
    const ordered = [...buckets.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of ordered) {
      const text = items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length === 0) continue;
      lineNumber += 1;
      lines.push({ page: pageNumber, line: lineNumber, text, locator: `p${pageNumber}:${lineNumber}` });
    }

    page.cleanup();
  }

  if (lines.length === 0) throw new NoTextLayerError(doc.numPages);

  // A document with very little text per page is usually a scan with a thin
  // accessibility layer, or a set of images with captions. Worth saying so.
  const averagePerPage = lines.length / doc.numPages;
  if (averagePerPage < 3) {
    warnings.push(
      `only ${lines.length} text lines across ${doc.numPages} pages ` +
        `(${averagePerPage.toFixed(1)} per page) - this may be a scan with a partial text layer`,
    );
  }

  const metadata = await doc.getMetadata().catch(() => null);
  const info = (metadata?.info ?? {}) as Record<string, unknown>;
  const asText = (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);

  await doc.destroy();

  return {
    lines,
    pageCount: doc.numPages,
    info: {
      title: asText(info.Title),
      author: asText(info.Author),
      subject: asText(info.Subject),
      keywords: asText(info.Keywords),
      creationDate: asText(info.CreationDate),
      modificationDate: asText(info.ModDate),
      producer: asText(info.Producer),
    },
    warnings,
  };
}
