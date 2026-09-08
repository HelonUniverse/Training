# CPALMS — Florida B.E.S.T. Standards for Mathematics

## The artifact

    Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc

| field | value |
|---|---|
| sha256 | `474b9a436a06d060aaba55cb84965901118c1c351066915665a9863607dd1914` |
| byte size | 841856 |
| authority | Florida Department of Education (published through CPALMS) |
| official source page | https://www.cpalms.org/downloads |
| acquisition URL | https://cpalmsmediaprod.blob.core.windows.net/downloads/reports/Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc |
| acquired | 2026-09-08T16:23:49Z |
| declared extension | `.doc` |
| actual representation | HTML markup with tabular benchmark rows — **not** a binary Word document |
| artifact kind | canonical standards publication |
| contains Access Points | no (0 occurrences) |

## The extension is a claim, not evidence

CPALMS serves this report with a `.doc` extension and a Word MIME type, and Word
opens it. The bytes are `<html><body>…`: HTML markup, UTF-8, no OLE compound
header, no ZIP container. The importer therefore decides the format from the
leading bytes and records `html`, while `representation` records the separate
fact that the markup carries each benchmark as an explicit two-cell table row.

**Nothing converts this file before parsing.** It is not opened in Word,
LibreOffice or Preview and re-saved; a re-save changes the bytes, and the bytes
are the identity every published standard cites.

## Why this artifact and not the FLDOE PDF

The PDF at fldoe.org is the same standards in a form this pipeline could not
read honestly: Type0 fonts with no embedded font program and incomplete
ToUnicode maps, so pdf.js silently drops runs of text and MuPDF emits raw glyph
indices. 358 of 3,740 spans across 38 of the 53 K–5 pages could not be decoded
by either extractor. The offset that appears to turn those indices back into
English is one subset font's glyph order, not a decoding rule — applying it
would be *reconstructing* a state's published wording, which this product must
never do. See `docs/architecture/18-standards-reference-layer.md`.

This CPALMS export is the same authority's own publication of the same
standards, in a representation where the benchmark code and its wording are
adjacent cells of one table row. The association is read, not inferred.

## Rules

Do not rename, re-save, reformat or "clean up" this file. Do not repair or
supplement it from the internet, from model memory, from third-party datasets,
mirrors, parent guides, progression documents or instructional guides.
