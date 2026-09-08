# Florida B.E.S.T. Mathematics K-5 — deployment record

The same ingestion, run twice, proved equal rather than assumed equal.

| | local (`hos_test`, PG 16.13) | managed (`homeschool-os-dev`, PG 17.6) |
|---|---|---|
| migrations | 0079, 0080 applied | 0079, 0080 applied |
| rows seen in artifact | 642 | 642 |
| rows in scope (K-5) | 184 | 184 |
| rows staged | 184 | 184 |
| staged-row content digest | `b0c0d24c365da8ac39524aa30640d229` | `b0c0d24c365da8ac39524aa30640d229` |
| staged-row digest incl. status | `414afb602269d5ca067aaff8863d4ead` | `414afb602269d5ca067aaff8863d4ead` |
| rows approved by a person | 184 | 184 |
| rows published | 184 | 184 |
| rows skipped | 0 | 0 |
| K / 1 / 2 / 3 / 4 / 5 | 22 / 26 / 27 / 34 / 39 / 36 | 22 / 26 / 27 / 34 / 39 / 36 |
| distinct codes | 184 | 184 |
| distinct locators | 184 | 184 |
| empty wording | 0 | 0 |
| untraceable rows | 0 | 0 |
| official texts (en-US) | 184 | 184 |
| out-of-scope grades published | 0 | 0 |
| skill↔standard mappings created | 0 | 0 |
| prerequisites created by import | 0 | 0 |
| standards columns on `skills` | 0 | 0 |
| `app.assert_schema_invariants()` | passes | passes |

## The digest is the point

`b0c0d24c365da8ac39524aa30640d229` is an md5 over every column each staged row
asserts about the DOCUMENT — code, statement, grade, strand, language,
normalization, aliases, warnings, locator and the raw parse — for all 184 rows
in order. Local and managed agree on it.

**Use this one, not a digest that includes `status`.** The first version of this
check folded `status` in, and that value (`f8161bec912af5c59970fd9756def1e6`)
is real but only comparable at one instant: publication legitimately rewrites
every row's status from `staged` to `published`, so the digest changes to
`414afb602269d5ca067aaff8863d4ead` on both sides. Two deployments at different
points in the lifecycle would then look like corrupted copies of each other,
which is exactly the false alarm a parity check must not raise. Both values are
recorded above so either can be reproduced; the content digest is the one that
means "these are the same 184 benchmarks".

That matters because the two deployments are reached by different channels. The
local one applies a generated SQL file over a socket. The managed one crosses a
channel that wraps every call in its own transaction and where the SQL text is
retyped, so a single altered character inside a benchmark statement would be
invisible: the row count would still be right and the wording would be a state's
wording with one word changed. Each transmitted chunk therefore carried the md5
of what it was supposed to write and checked it after writing — a corrupted
chunk raises `data_corrupted` and rolls back rather than publishing quietly.
That guard was tested by deliberately corrupting one character, which it caught.

## The identity that ran it

`standards-operator@nestra.test`, holding `standards.administer` on the platform
scope and nothing else. Not a guardian, not a teacher, not an organization
administrator, member of no family. Every statement ran as that account under
RLS (`current_user` = `authenticated`, `is_superuser` = off), through the same
RPCs a person would use. No service-role key was used at any point.

## Reproducing

    bash tests/local/test.sh          # migrations, fixtures, the real ingestion, 12 suites

For managed, regenerate the managed dialect and apply the chunks in order:

    node --import ./scripts/ts-register.mjs scripts/ingest-florida-best.mjs \
      --admin <operator uuid> --managed --chunk 16
