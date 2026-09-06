# STEP 4 — Portfolio, capture, documents and delivery

*Capture first. Organize effortlessly.*

Twenty numbered answers, in the order asked.

---

## 1. What was built

Nine forward migrations (0056–0064, 64 total), 34 new application files, and a
capture path that runs end to end against real PostgreSQL, real RLS, real
storage and a real browser.

**Capture.** One universal *Add something*, as both a header menu and a page at
`/app/add`, leading to five flows — schoolwork, project, activity, book,
document. Files first, details second, one Save. There is no wizard: a
worksheet is one screen, because asking someone to page through four steps to
record it is how a portfolio ends up empty in March.

**Portfolio.** A dated story, not a file list. Months are headings, cards carry
the family's own photographs, and activities and reading that produced no file
are still on the timeline — a portfolio that only listed uploads would quietly
teach people that unphotographed learning does not count.

**Documents.** A filing cabinet, and allowed to look like one. Metadata search
that says in one line that it does not search inside a document. A viewer that
mints a two-minute signed URL per request. Human-worded visibility, and sharing
limited to people this child already has a relationship with.

**Delivery.** Invitation email through an `EmailProvider` interface (Resend,
Postmark, console), a real acceptance page, and resend.

## 2. Classification is the person's, not ours

Every category, subject, date and kind on every capture screen comes from the
person capturing. Nothing infers, guesses, or labels on their behalf.
`src/lib/capture/kinds.ts` is the single list of what can be chosen, used by
the chooser, the flows and the tests, so a kind cannot exist in one and not
another.

The Smart Intake placeholder is written in the future tense and makes no claim
about the present: *"Later, Homeschool OS will read what you upload and suggest
a title, a subject and a date. It doesn't yet — nothing here has been analyzed,
so what you type is what gets saved."* No spinner, no confidence score, no
"analyzing".

## 3. Where the bytes travel, and why not through a Server Action

Server Action request bodies are capped at 1MB and a phone photo is routinely
eight times that. The browser uploads straight to the quarantine bucket **with
the user's own session**, so the storage insert policy — the first path segment
must be a family or organization you belong to — is what authorises the write.
Only then does a Server Action record what was uploaded.

Nothing resizes, re-encodes or strips a photo. A child's work photographed at
full resolution stays at full resolution.

## 4. The scan gate, and the hole that was in it

`scan_status` is not a parameter of `register_document`; it is always
`'pending'`. The only way out is `app.record_scan_result`, granted to
`service_role` alone **and** refusing to run when `auth.uid()` is non-null.

**Test 2b found that this was not enough.** `documents_update` allows
`uploaded_by = auth.uid()` so a parent can fix a mistyped title, and RLS is
row-level: it has nothing to say about *which columns* an allowed update
touches. So this worked from an ordinary browser session:

```
PATCH /rest/v1/documents?id=eq.<mine>   {"scan_status": "clean"}
```

Upload the malware, clear it yourself, one request. Migration **0061** adds a
trigger that refuses any write to `scan_status` or `scanned_at` from a user
session. It has to be a trigger: a policy sees the proposed row, not the
columns the client named.

## 5. The default is to do nothing

With no scanner configured, nothing is scanned, nothing is marked clean, and no
bytes are delivered. That is the safe default and it is also the honest one —
silently marking unscanned files clean would turn the word "scanned" into a lie
the moment this ships.

`SCANNER_PROVIDER=dev` opts in to an adapter that does real work: it re-checks
the stored bytes against the same magic-byte rules the client used, and treats
the EICAR test signature as infected, so the infected path is exercised rather
than assumed.

## 6. No service role in a request path — and what that cost

Through STEP 3 the document buckets had no `SELECT` policy at all, on the
theory that a route handler would mint every signed URL under `service_role`.
STEP 4 rules that out. Migration **0060** authorises the read by deriving it:

> may I read these bytes? ⇔ can I see the `documents` row that owns them, and
> has it come back clean?

The subquery runs under `documents_select`, so the policy adds no authority; it
only narrows. A pending, failed or infected file has no readable bytes even for
the person who uploaded it.

**The trade-off, stated plainly.** `/api/documents/[id]/url` writes a
`document_viewed` audit row before minting, but a user who is *already
authorised* could call storage directly with their own session and read the
object without producing that row. Closing that gap means service-role
credentials in the request path, which is the larger risk. The audit trail
records views through the product; it is not the access control.

The only service-role use in the codebase is `src/lib/supabase/service.ts`,
imported only by `src/app/api/cron/scan-documents/route.ts`, which
authenticates against `CRON_SECRET` and refuses to run without one.

## 7. An infected upload must still be explainable

`can_read_document` and `documents_select` both excluded infected documents
outright. The intent was right, the effect was wrong: it stopped the bytes
**and** made the row vanish. A parent notified that their upload was refused
tapped through to a 404, and would reasonably conclude that this product loses
things.

Migration **0064** removes the clause from both. No byte becomes reachable —
the storage policy requires `scan_status = 'clean'` independently — but the
record is readable by exactly the people who could already read it, so the app
can say what happened. Found by browser test S5.

## 8. Duplicates, and the oracle they must not become

`documents_family_hash_idx` is unique on `(family_id, sha256)`.
`register_document` catches the violation and reports it, returning the id of
the row that already holds those bytes.

The index is scoped to one family and `find_duplicate_document` is
`SECURITY INVOKER`, so a hash held by another household matches nothing and
raises nothing. There is no observable difference — not a returned id, not an
error, not a different code path — between "no other family has this file" and
"some other family has this file". Test S12 uploads byte-identical content as a
second family and asserts it saves normally and is *not* reported as a
duplicate.

## 9. Validation is by content

The first bytes decide what a file is. A `.png` that is really text is refused
with a plain sentence, not accepted and left to fail later. DOCX is
deliberately absent from the accepted list — the current stack has no safe way
to preview or extract it, and pretending otherwise would produce files a parent
could save but never open.

## 10. Multiple files, one entry

An afternoon photographed six times is one afternoon. `log_activity` creates
exactly one portfolio item regardless of how many documents are attached, and
journey 2 asserts it: three photos, one card, "3 photos" on it.

## 11. Provenance survives editing

Who entered a record, when, through which route, and whether a human confirmed
it are facts about how the record came to exist. `updatePortfolioItem` writes
only the descriptive fields; the provenance columns are not in the patch and
cannot be reached through it. The edit screen offers no control for them —
offering one would suggest a portfolio's history is editable, which is exactly
the impression an evaluation cannot afford.

## 12. Nobody reads an enum

`src/lib/documents/visibility.ts` is the single translation point from
`app.document_visibility` to sentences. `academic_shared` is a precise thing to
store and a meaningless thing to read; a parent sees *"My child's teachers"*.
The visual-review suite fails if any enum label appears in rendered text.

Sharing options are filtered by what the caller can actually grant. A family
with no program and no evaluator sees no sharing controls and a sentence
explaining why — never a menu that fails on click.

## 13. Invitations grant nothing on their own

Only the SHA-256 of the token is stored. The plaintext exists for the
milliseconds between generating it and handing it to the provider, and is
deliberately absent from the outbox — a live token in a table is a credential
at rest.

`accept_invitation` additionally requires that the signed-in account's own
email match the invited address, so a forwarded link is useless to anyone else,
and the role granted is the one on the invitation, never a parameter. Wrong
token, expired, revoked and already-used all produce the same screen.

A signed-out visitor to `/invite/<token>` is asked to sign in and told nothing
else — the page never reveals whether the invited address has an account.
(Sign-up itself does report an email already in use; that is unavoidable if
people are to recover their own accounts, and is a different surface.)

## 14. The invite panel no longer claims what it did not do

It said *"Invitation sent to …"* whether or not anything was sent. With no
provider configured nothing is, and an admin would have waited for a reply to a
message that never existed. It now reports what the outbox recorded: sent,
created-but-not-emailed, or created-and-the-send-failed. Resend issues a new
token, which also stops a link that went astray from working.

## 15. Two notifications, and no more

Migration **0063**: a file that could not be kept, and something shared with
you. A clean scan is deliberately silent — it is the expected outcome, and
announcing it every time is how people learn to ignore the bell. Both are
written by triggers in the same transaction as the event, so a notification
cannot describe something that did not happen.

## 16. Two locales, and a guard that keeps them honest

598 keys in each of `en-US` and `es-US`, covering every new screen. The Spanish
is written for US Hispanic families — *"Guárdalo ahora. Después lo acomodas."*
— not translated word-for-word.

`scripts/check-i18n.mjs` walks the source, pairs each `useTranslations`
namespace with its `t()` calls, and fails on a key missing from either locale.
It is proven to fail: introducing `portfolio.addXYZ` produces two errors and
exit 1.

## 17. What the tests found

Everything below was found by a test in this step, not by reading.

| # | Found by | What was wrong |
|---|----------|----------------|
| 1 | SQL 2b | An uploader could `PATCH scan_status` to `clean` on their own document and make an unscanned file deliverable. |
| 2 | SQL 12c | `share_document` wrote its own audit row on top of 0042's trigger, so one share produced two audit entries. |
| 3 | Browser S5 | An infected document vanished from RLS entirely, so a parent notified about it landed on a 404. |
| 4 | Journey 4 | An invited teacher who accepted was bounced into "What best describes you?" and asked to create a family or program of their own, with no way past it. |
| 5 | Journeys 1–3 | Every capture failed on a correctly filled form: `new FormData(event.currentTarget)` ran after the upload, by which point React had cleared `currentTarget`. |
| 6 | Visual review | Every date on the timeline read "Invalid Date". |
| 7 | Lint step | ESLint was never a dependency and the config named no parser, so every rule in it — including the service-role import restriction it exists for — has been inert since STEP 2.5. Its globs also pointed at `app/`+`components/` while the code lives in `src/`. |
| 8 | Runner | A stale `next-server` from an earlier session was serving on the test port, so an earlier run's results described code that was not in the working tree. |
| 9 | Runner | `NEXT_PUBLIC_*` is inlined at build time and Next reuses cached chunks, so a build made without it produced a browser Supabase client with no URL — and a failure with nothing in any server log. |

Items 8 and 9 are now checks in `tests/e2e/run.sh`: it refuses to start if a
port is held by something else, and refuses to run if the client bundle does
not contain the configured Supabase URL. Item 7's ESLint rule is proven to fire.

One rule was also wrong on its own terms: it banned client components from
importing `**/server/actions/**`, which is the App Router's documented way to
call a Server Action. That check cannot be expressed by path anyway — it
depends on the first line of a file — so it stays in
`scripts/check-service-role.sh`, which greps for `'use client'` first.

## 18. Test results

Everything below was run in this session, against real PostgreSQL carrying all
64 migrations, with RLS enforced.

**Database (`bash tests/local/test.sh`)** — 8 suites, all PASS:

```
  01_access_matrix          PASS      05_evaluator_and_documents  PASS
  02_invariants             PASS      06_privilege_escalation     PASS
  03_write_policies         PASS      07_schema_invariants        PASS
  04_resource_authorization PASS      08_step4_capture            PASS  ← new
```

`08_step4_capture.sql` carries the **20 numbered security cases** for this step,
covering the scan gate, byte delivery, the duplicate oracle, capture
authorization, one-entry-per-afternoon, sharing, and invitations.

**Acceptance (`bash tests/acceptance/dryrun.sh`)** — 5 files, all PASS. Two of
them execute locally for the first time: the shim was missing
`storage.objects.owner_id`, the DML grants Supabase gives the API roles, and
`protect_delete`, so `04_storage_policies.sql` used to die on a missing column
before reaching a single assertion.

**Browser (`bash tests/e2e/run.sh`)** — 26 tests per width.

| Project | Result |
|---|---|
| desktop 1440 | 24 passed, 2 skipped (mobile-only tests) |
| tablet 768 | 26 passed |
| mobile 390 | 26 passed |
| performance (`RUN_PERF=1`) | 1 passed |

The **20 browser security cases** (S1–S20) are in `security.spec.ts`, the **four
journeys** in `capture.spec.ts`, and the visual review in
`step4-screens.spec.ts`, which shoots 16 screens per width and asserts no
horizontal overflow, no control under 40px, no control without an accessible
name, no "Invalid Date", no untranslated key, and no enum label anywhere in the
rendered text.

**Guards** — `npm run guard` (service-role boundary + i18n) passes, `npx eslint .`
passes with the rules actually running for the first time, `npx tsc --noEmit`
is clean.

## 19. Performance

Measured, not estimated: `RUN_PERF=1 npx playwright test performance.spec.ts`
seeds **24 real captures** through the UI — pick, validate, hash, upload, save —
and then measures the screens.

```
one capture: pick, upload, save, land on the timeline     536 ms   (budget 8000)
portfolio: server render, heading visible                 266 ms   (budget 4000)
portfolio: first photograph on screen                      85 ms   (budget 6000)
portfolio: signing round trips for a whole page             1 req  (budget 3)
documents: server render, heading visible                 139 ms   (budget 4000)
documents: metadata search                                191 ms   (budget 4000)
one signed URL, end to end (authorize, sign, audit)        88 ms   (budget 2000)
document detail: server render                            248 ms   (budget 4000)
dashboard: server render with real counts                 230 ms   (budget 4000)
```

The budgets are deliberately generous — this is Next in production mode against
local PostgreSQL on a shared sandbox CPU, so the absolute numbers are not a
production forecast. What they catch is the SHAPE of a mistake, which shows up
as an order of magnitude and survives the noise.

**The one that matters is the fourth row.** A page of two dozen photographs
costs ONE signing request, not one per thumbnail. That is the difference between
a scrapbook and a file manager loading, and it is now a test rather than an
intention.

Worth noting what the perf test itself found: it stalled at the ninth capture,
every time, deterministically. The seeding loop was generating dates in the
future, and the date field carries `max={today}` because you cannot record work
a child has not done yet — so the browser refused to submit. The product was
right and the test was wrong.

## 20. What is not done, and what I would check next

- **Migrations 0056–0064 are not deployed.** They are verified against local
  PostgreSQL 16 and the acceptance harness, but `homeschool-os-dev` is paused
  (you paused it deliberately) and I did not restart it to apply nine
  migrations you had not asked me to deploy. That is the obvious next step, and
  it is the same shape as STEP 3.1: apply, then re-run the acceptance suite
  under real Auth, real Storage and PostgreSQL 17.
- **HEIC has no preview.** It uploads, stores and scans correctly, and the UI
  says "no preview" rather than showing a broken image. Rendering it needs a
  decode step that does not exist yet.
- **The view audit is best-effort**, for the reason in §6. It records views
  through the product, not every possible read by an already-authorised user.
- **Smart Intake is a placeholder**, by instruction. Nothing has been analyzed
  and nothing claims to have been.
- **Sharing has no revocation notice.** Removing access is audited and takes
  effect immediately, but the person who had it is not told. Two notifications
  was the brief; a third may be worth it.

STOP. STEP 5 has not been started.
