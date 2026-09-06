# 15 — Capture, and how a file becomes viewable

STEP 4. The product principle is *capture first, organize effortlessly*; this
document is about what has to be true underneath for that to be safe.

## The pipeline

```
  browser                          database                       worker
  ───────                          ────────                       ──────
  pick / photograph
  validate by MAGIC BYTES
  hash (SHA-256)
  ask: already saved?  ─────────►  find_duplicate_document
                                   (INVOKER: only your own rows)
  upload  ───────────────────────► storage.objects INSERT
                                   "quarantine insert own scope"
  register  ─────────────────────► register_document
                                   documents(scan_status='pending')
                                   + document_versions(1)
                                                                  ▼
                                   app.record_scan_result  ◄────── scan
                                   (service_role only)
  view  ─────────────────────────► storage.objects SELECT
                                   "read own clean document bytes"
```

Three properties hold at every step, and each is enforced by the database
rather than by the code that happens to call it.

### 1. The client never decides whether a file is safe

`scan_status` is not a parameter of `register_document`; it is always
`'pending'`. The only way out of `pending` is `app.record_scan_result`, which
is granted to `service_role` alone **and** refuses to run when `auth.uid()` is
non-null — two independent locks, so a future mistake in grants is not enough
on its own.

Migration 0061 closed the gap that made this necessary to state twice.
`documents_update` allows `uploaded_by = auth.uid()` so a parent can correct a
title they mistyped, and RLS is row-level: it has nothing to say about *which
columns* an allowed update touches. So this worked, from an ordinary browser
session:

```
PATCH /rest/v1/documents?id=eq.<mine>   {"scan_status": "clean"}
```

Uploading the malware and then clearing it yourself was one request. A trigger
now refuses any write to `scan_status` or `scanned_at` from a user session.
This is a column-level rule, so it cannot be a policy: a policy sees the
proposed row, not the columns the client named.

### 2. Unscanned bytes are not readable, by anyone

Through STEP 3 the document buckets had no `SELECT` policy at all, on the
theory that a route handler would mint every signed URL under `service_role`.
STEP 4 rules that out — service-role credentials must not sit in a normal
request path, where one mistake reads every family's files.

Migration 0060 authorises the read the way every other read is authorised, by
deriving it rather than restating it:

> may I read these bytes? ⇔ can I see the `documents` row that owns them, and
> has it come back clean?

The subquery runs under `documents_select`, which calls
`app.can_read_document`. So the policy adds no authority of its own; it only
narrows. A pending, failed or infected file has no readable bytes even for the
person who uploaded it — though they can still see its row, and be told it is
still processing.

**The trade-off, stated plainly.** `/api/documents/[id]/url` writes a
`document_viewed` audit row before minting a signed URL, but a user who is
*already authorised* could call storage directly with their own session and
read the object without producing that row. Closing that gap means putting
service-role credentials in the request path, which is the larger risk. The
audit trail records views through the product; it is not the access control.

### 3. The default is to do nothing

With no scanner configured, `getScanner()` returns the null adapter, the cron
route records nothing, documents stay `pending`, and their bytes stay
unreadable. Nothing is ever marked clean without being scanned — which would
turn the word "scanned" into a lie the moment this ships.

`SCANNER_PROVIDER=dev` opts in to a development adapter that does real, if
modest, work: it re-checks the stored bytes against the same magic-byte rules
the client used and treats the EICAR test signature as infected, so the
infected path is genuinely exercised rather than assumed.

## Where the bytes travel

The file never passes through a Server Action. Action requests are capped at
1MB by default and a phone photo is routinely eight times that, so the browser
uploads straight to the quarantine bucket **with the user's own session** —
which means the storage insert policy ("the first path segment must be a family
or organization you belong to") is what authorises the write. Only then does a
Server Action record what was uploaded.

Nothing resizes, re-encodes or strips a photo. A child's work photographed at
full resolution stays at full resolution; a portfolio that quietly degraded its
own evidence would be worth less every year.

## Duplicates, and what they must not reveal

`documents_family_hash_idx` is unique on `(family_id, sha256)`, so re-saving
byte-identical content inside one family raises `unique_violation`.
`register_document` catches it and reports the duplicate, returning the id of
the row that already holds those bytes.

Note what this **cannot** do. The index is scoped to one family and the lookup
runs under RLS, so a hash held by another household matches nothing and raises
nothing. There is no observable difference — not a timing, not an error, not a
returned id — between "no other family has this file" and "some other family
has this file". `find_duplicate_document` is `SECURITY INVOKER` for the same
reason.

## Vocabulary

`app.document_visibility` is precise and belongs in the schema. It is not
language anybody outside this codebase speaks, and it must never reach a
screen. `src/lib/documents/visibility.ts` is the single translation point, and
the visual-review suite fails if any enum label appears in rendered text.

The options offered are also filtered by what the caller can actually grant.
Offering a parent "Share with my program" when they belong to no program
teaches people that our controls are decorative — and the first time one of
them matters, they will not read it.

## Notifications

Two, and no more (migration 0063): a file that could not be kept, and something
shared with you. A clean scan is deliberately silent — it is the expected
outcome, and announcing it every time is how people learn to ignore the bell.
The first notification they then miss is the one that mattered.

## Testing

- `tests/rls/08_step4_capture.sql` — the database-level proofs, as real users
  through the real policies.
- `tests/e2e/security.spec.ts` — what a signed-in person can reach by talking to
  the API directly, past the UI that would never offer it.
- `tests/e2e/capture.spec.ts` — the four journeys.
- `tests/e2e/step4-screens.spec.ts` — the visual review, plus the mechanical
  checks (overflow, touch targets, accessible names, enum leakage).
- `tests/e2e/performance.spec.ts` — run explicitly with `RUN_PERF=1`.

`tests/harness/fake-supabase.mjs` is not a mock. Every request is translated to
SQL and executed against real PostgreSQL carrying the real migrations, as the
real role — `authenticated` with the caller's claims, or `service_role` with
none. A request refused there is refused in production.
