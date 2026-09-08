#!/usr/bin/env python3
"""Second, independent reading of the CPALMS artifact.

The PDF path taught this: one extractor's output is not evidence. pdf.js and
MuPDF each produced confident, plausible, DIFFERENT text from the same file, and
only comparing them showed that neither could read it.

The same discipline applies to markup, where the failure is quieter. A flat
`<tr>...</tr>` regex silently loses any row containing a nested table - 183
benchmarks instead of 184, no error - and a single implementation has no way to
notice a row it never saw.

So this reads the artifact again with nothing in common with
src/server/standards/adapters/florida-best-structured.ts: Python's stdlib
html.parser is an event-driven tokenizer maintaining its own element stack,
where the TypeScript side scans tag matches and counts nesting depth. Different
language, different algorithm, different author's assumptions.

Agreement on all 184 (code, grade, strand, statement) tuples is the evidence
that the association was READ out of the document rather than manufactured by
one implementation's quirk. Disagreement is a STOP, not a tie to break.

Usage:
    node --import ./scripts/ts-register.mjs scripts/parse-florida-best.mjs --json /tmp/ts.json
    python3 scripts/crosscheck-florida-best.py /tmp/ts.json
"""
from html.parser import HTMLParser
import json, re, sys, unicodedata

SRC = "sources/cpalms/Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc"
CODE = re.compile(r'^MA\.(K|\d{1,2}|K12|912)\.([A-Z]{1,4})\.(\d+)\.(\d+)$')
K5 = {'K', '1', '2', '3', '4', '5'}
BREAK = {'br', 'p', 'div', 'li', 'tr', 'td', 'th', 'table', 'ul', 'ol',
         'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}


class Reader(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.cell_buf = None
        self.cells = None
        self.tr_depth = 0
        self.td_depth = 0
        self.grade = None
        self.strand = None
        self.label_id = None
        self.label_buf = None
        self.section = None
        self.fmt_stack = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = {k.lower(): v for k, v in attrs}
        if tag == 'asp:label':
            self.label_id = a.get('id')
            self.label_buf = []
        if tag == 'tr':
            self.tr_depth += 1
            if self.tr_depth == 1:
                self.cells = []
        elif tag == 'td':
            self.td_depth += 1
            if self.tr_depth == 1 and self.td_depth == 1:
                self.cell_buf = []
                self.section = None
                self.fmt_stack = []
        elif tag in ('i', 'u') and self.cell_buf is not None:
            self.fmt_stack.append([tag, []])
        elif tag in BREAK and self.cell_buf is not None:
            self.cell_buf.append('\n')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == 'asp:label':
            if self.label_id == 'lblGradeLevelTitle':
                self.grade = ''.join(self.label_buf).replace('Grade:', '').strip()
            elif self.label_id == 'lblBOKDescription':
                self.strand = ''.join(self.label_buf).replace('Strand:', '').strip()
            self.label_id = None
            self.label_buf = None
        if tag in ('i', 'u') and self.cell_buf is not None and self.fmt_stack:
            _, buf = self.fmt_stack.pop()
            text = ''.join(buf).strip()
            # An i/u pair in either nesting order wrapping exactly this word ends
            # the statement. Read off the element stack, not off the markup.
            if not self.fmt_stack and re.fullmatch(r'Clarifications?|Examples?', text, re.I):
                if self.section is None:
                    self.section = text
            elif self.fmt_stack:
                self.fmt_stack[-1][1].append(''.join(buf))
            elif self.section is None:
                self.cell_buf.append(''.join(buf))
        elif tag == 'td':
            if self.tr_depth == 1 and self.td_depth == 1:
                self.cells.append(''.join(self.cell_buf))
                self.cell_buf = None
            self.td_depth = max(0, self.td_depth - 1)
        elif tag == 'tr':
            if self.tr_depth == 1 and self.cells is not None:
                self._finish_row(self.cells)
                self.cells = None
            self.tr_depth = max(0, self.tr_depth - 1)

    def handle_data(self, data):
        if self.label_buf is not None:
            self.label_buf.append(data)
        if self.cell_buf is None:
            return
        if self.fmt_stack:
            self.fmt_stack[-1][1].append(data)
        elif self.section is None:
            self.cell_buf.append(data)

    def _finish_row(self, cells):
        if len(cells) != 2:
            return
        code = re.sub(r'\s+', ' ', cells[0]).strip()
        m = CODE.match(code)
        if not m or m.group(1) not in K5:
            return
        text = '\n'.join(l.strip() for l in cells[1].replace(' ', ' ').split('\n'))
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text).strip()
        self.rows.append({'code': code, 'grade': self.grade, 'strand': m.group(2),
                          'statement': text})


def main(ts_json):
    reader = Reader()
    with open(SRC, encoding='utf-8') as fh:
        reader.feed(fh.read())
    mine = {r['code']: r for r in reader.rows}

    with open(ts_json) as fh:
        payload = json.load(fh)
    theirs = {r['source']['code']: {
        'code': r['source']['code'], 'grade': r['source']['grade'],
        'strand': r['source']['domainCode'], 'statement': r['source']['statement'],
    } for r in payload['rows']}

    def norm(value):
        return unicodedata.normalize('NFC', str(value))

    only_mine = sorted(set(mine) - set(theirs))
    only_theirs = sorted(set(theirs) - set(mine))
    diffs = []
    for code in sorted(set(mine) & set(theirs)):
        for field in ('grade', 'strand', 'statement'):
            if norm(mine[code][field]) != norm(theirs[code][field]):
                diffs.append((code, field, mine[code][field], theirs[code][field]))

    print(f"python (html.parser)      {len(mine)} benchmarks")
    print(f"typescript (depth scan)   {len(theirs)} benchmarks")
    print(f"only python:              {only_mine or 'none'}")
    print(f"only typescript:          {only_theirs or 'none'}")
    print(f"field disagreements:      {len(diffs)}")
    for code, field, a, b in diffs[:5]:
        print(f"  {code} {field}\n    python:     {a!r}\n    typescript: {b!r}")
    agreed = not only_mine and not only_theirs and not diffs
    print(f"\nVERDICT: {'IDENTICAL' if agreed else 'DISAGREEMENT - STOP'}")
    return 0 if agreed else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ts.json'))
