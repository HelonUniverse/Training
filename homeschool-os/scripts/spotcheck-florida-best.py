#!/usr/bin/env python3
"""Open the artifact at each locator the database claims, and check.

This is the check a person does by hand, done for every sampled row: go to the
line the record says it came from, and see whether the document there carries
that code, that wording, under that grade heading and that strand heading.

It reads the RAW BYTES. It does not call the adapter, so an adapter that is
confidently wrong cannot confirm itself here.

Usage:
    psql ... --csv -t -f sample.sql > sample.csv
    python3 scripts/spotcheck-florida-best.py sample.csv
"""
import csv, html as H, re, sys, unicodedata

SRC = "sources/cpalms/Mathematics(B.E.S.T.)_StandardsReportWithoutAccessPoints.doc"
GRADE_HEADING = re.compile(r'lblGradeLevelTitle[^>]*>\s*Grade:\s*([^<]+?)\s*</asp:Label>')
STRAND_HEADING = re.compile(r'lblBOKDescription[^>]*>\s*Strand:\s*([^<]+?)\s*</asp:Label>')


def flat(text):
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', text)).strip()


def main(sample_csv):
    doc = open(SRC, encoding='utf-8').read()
    lines = doc.split('\n')

    rows = list(csv.reader(open(sample_csv)))
    failures = []
    print(f"{'CODE':<15} {'GR':<3} {'DOM':<4} {'LINE':>5} {'CHAR':>8}  RESULT")
    print("-" * 88)
    for code, grade, domain, locator, statement in rows:
        line_no = int(re.search(r'line (\d+)', locator).group(1))
        # The CHARACTER offset, not the line, is what identifies the row. This
        # document puts up to 26 benchmarks on one line and can change strand
        # halfway along one, so a line-scoped window answers the wrong question.
        char_at = int(re.search(r'char (\d+)', locator).group(1))
        window = doc[max(0, char_at - 400): char_at + 1200]
        readable = flat(re.sub(r'<[^>]+>', ' ', H.unescape(window)))
        before = doc[:char_at]
        grades = GRADE_HEADING.findall(before)
        strands = STRAND_HEADING.findall(before)

        checks = {
            'code at that offset': code in doc[max(0, char_at - 400): char_at],
            'wording at that offset': flat(statement) in readable,
            'governing grade heading': bool(grades) and grades[-1].strip() == grade,
            'governing strand heading': bool(strands) and strands[-1].strip() in locator,
            'code strand agrees': code.split('.')[2] == domain,
        }
        bad = [name for name, passed in checks.items() if not passed]
        if bad:
            failures.append((code, bad))
        print(f"{code:<15} {grade:<3} {domain:<4} {line_no:>5} {char_at:>8}  "
              f"{'PASS' if not bad else 'FAIL: ' + ', '.join(bad)}")

    print("-" * 88)
    print(f"{len(rows) - len(failures)}/{len(rows)} spot checks pass against the raw artifact")
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'sample.csv'))
