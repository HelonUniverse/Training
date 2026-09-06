import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * STEP 4 security, from the browser.
 *
 * The database-level proofs live in tests/rls/08_step4_capture.sql. These are
 * the ones that only mean something through the running application: what a
 * signed-in person can reach by talking to the API directly, past the UI that
 * would never offer it.
 */

const APP = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = (seed: string) => Buffer.concat([PNG, Buffer.from(`<!-- ${seed} -->`)]);

/** The EICAR test signature. Not malware - the industry's agreed trigger. */
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const pdf = (body: string) => Buffer.from(`%PDF-1.4 ${body} %%EOF`);

const uniqueEmail = (p: string) =>
  `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

/* -------------------------------------------------------------------- setup */

async function signUp(page: Page, name: string, email: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding\/role/);
  return email;
}

async function onboardParent(page: Page, child: string) {
  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await page.getByLabel('Legal first name').fill(child);
  await page.getByLabel('Legal last name').fill('Test');
  await page.getByLabel(/Preferred name/).fill(child);
  await page.getByLabel('Date of birth').fill('2015-04-10');
  await page.getByRole('button', { name: 'Continue' }).click();

  const state = page.getByRole('combobox').first();
  await state.click();
  await state.fill('Florida');
  await page.getByRole('option', { name: 'Florida' }).click();
  const county = page.locator('#county');
  await county.click();
  await county.fill('Osceola');
  await page.getByRole('option', { name: 'Osceola' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Science' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Stay organized' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/onboarding\/parent\/complete/);
}

async function capture(
  page: Page,
  kind: string,
  title: string,
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
) {
  await page.goto(`/app/add/${kind}`);
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(files);
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole('textbox').first().fill(title);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/app\/(portfolio|documents)/, { timeout: 20_000 });
}

/**
 * A real access token for a user, obtained the way any client would: by signing
 * in. Deliberately NOT scraped out of the browser's session cookie - that
 * encoding is Supabase's business and changes between versions, and a test that
 * parses it fails for reasons that have nothing to do with the thing under
 * test.
 */
async function accessToken(page: Page, email: string): Promise<string> {
  const response = await page.request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, 'content-type': 'application/json' },
    data: { email, password: 'Password123' },
  });
  expect(response.ok(), 'could not obtain an access token').toBeTruthy();
  return (await response.json()).access_token as string;
}

/** Talk to the database API directly, exactly as a determined user could. */
function rest(request: APIRequestContext, token: string) {
  const headers = {
    apikey: ANON,
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  return {
    get: (path: string) => request.get(`${SUPABASE}/rest/v1/${path}`, { headers }),
    patch: (path: string, data: unknown) =>
      request.patch(`${SUPABASE}/rest/v1/${path}`, { headers, data }),
    rpc: (fn: string, args: unknown) =>
      request.post(`${SUPABASE}/rest/v1/rpc/${fn}`, { headers, data: args }),
  };
}

async function firstDocumentId(page: Page, token: string): Promise<string> {
  const response = await rest(page.request, token).get('documents?select=id&limit=1');
  const rows = (await response.json()) as Array<{ id: string }>;
  expect(rows.length).toBe(1);
  return rows[0]!.id;
}

async function runScanner(page: Page) {
  return page.request.post(`${APP}/api/cron/scan-documents`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

/* ==================================================================== tests */

test.describe('the scan gate', () => {
  test('S1-S4: an uploader cannot mark their own file clean, and pending bytes are not delivered', async ({
    page,
  }) => {
    const email = await signUp(page, 'Carla', uniqueEmail('scan'));
    await onboardParent(page, 'Lucas');
    await capture(page, 'schoolwork', 'Fractions', [
      { name: 'work.png', mimeType: 'image/png', buffer: png('s1') },
    ]);

    const token = await accessToken(page, email);
    const api = rest(page.request, token);
    const id = await firstDocumentId(page, token);

    // S1. It starts pending. Not clean, not "probably fine".
    const before = await (await api.get(`documents?select=scan_status&id=eq.${id}`)).json();
    expect(before[0].scan_status).toBe('pending');

    // S2. The uploader cannot write the scan state directly.
    const patched = await api.patch(`documents?id=eq.${id}`, { scan_status: 'clean' });
    expect(patched.status()).toBeGreaterThanOrEqual(400);
    const after = await (await api.get(`documents?select=scan_status&id=eq.${id}`)).json();
    expect(after[0].scan_status).toBe('pending');

    // S3. Nor through the RPC the worker uses.
    const rpc = await api.rpc('record_scan_result', { p_document: id, p_result: 'clean' });
    expect(rpc.status()).toBeGreaterThanOrEqual(400);

    // S4. And a pending document has no URL to hand out.
    const url = await page.request.get(`${APP}/api/documents/${id}/url`);
    expect(url.status()).toBe(409);
    expect((await url.json()).scanStatus).toBe('pending');
  });

  test('S5-S6: an infected file is never delivered, to anyone, including its uploader', async ({
    page,
  }) => {
    const email = await signUp(page, 'Carla', uniqueEmail('eicar'));
    await onboardParent(page, 'Lucas');
    // A structurally valid PDF whose body carries the EICAR test signature, so
    // it passes the client's content check and fails the scanner - which is
    // exactly the case that matters.
    await capture(page, 'document', 'Suspicious file', [
      { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: pdf(EICAR) },
    ]);

    const token = await accessToken(page, email);
    const id = await firstDocumentId(page, token);

    const scan = await runScanner(page);
    expect((await scan.json()).counts.infected).toBeGreaterThan(0);

    // S5. No signed URL, not even for the person who uploaded it.
    const url = await page.request.get(`${APP}/api/documents/${id}/url`);
    expect(url.status()).toBe(409);
    expect((await url.json()).scanStatus).toBe('infected');

    // S6. And the batch endpoint hands back nothing either.
    const batch = await page.request.post(`${APP}/api/documents/urls`, { data: { ids: [id] } });
    expect(Object.keys((await batch.json()).urls)).toHaveLength(0);

    await page.goto(`/app/documents/${id}`);
    await expect(page.getByText("This file isn't safe to open")).toBeVisible();
  });

  test('S7: the scan worker refuses a request without the cron secret', async ({ request }) => {
    expect((await request.post(`${APP}/api/cron/scan-documents`)).status()).toBe(401);
    expect(
      (
        await request.post(`${APP}/api/cron/scan-documents`, {
          headers: { authorization: 'Bearer not-the-secret' },
        })
      ).status(),
    ).toBe(401);
  });
});

test.describe('what one family can reach of another', () => {
  test('S8-S12: nothing - not the row, not the bytes, not the URL, not the hash', async ({
    browser,
  }) => {
    const aContext = await browser.newContext();
    const a = await aContext.newPage();
    const aEmail = await signUp(a, 'Family A', uniqueEmail('fam-a'));
    await onboardParent(a, 'Lucas');
    const shared = png('shared-between-families');
    await capture(a, 'schoolwork', 'A private worksheet', [
      { name: 'private.png', mimeType: 'image/png', buffer: shared },
    ]);

    const aToken = await accessToken(a, aEmail);
    const docId = await firstDocumentId(a, aToken);
    await runScanner(a);

    // Family A can see their own file once it is clean.
    const ownUrl = await a.request.get(`${APP}/api/documents/${docId}/url`);
    expect(ownUrl.status()).toBe(200);
    const signed = (await ownUrl.json()).url as string;
    expect(signed).toContain('token=');

    const bContext = await browser.newContext();
    const b = await bContext.newPage();
    const bEmail = await signUp(b, 'Family B', uniqueEmail('fam-b'));
    await onboardParent(b, 'Sofia');
    const bToken = await accessToken(b, bEmail);
    const bApi = rest(b.request, bToken);

    // S8. The row is not visible.
    const rows = await (await bApi.get(`documents?select=id,title&id=eq.${docId}`)).json();
    expect(rows).toHaveLength(0);

    // S9. Nor is the portfolio entry.
    const items = await (await bApi.get('portfolio_items?select=id,title')).json();
    expect(items.map((r: { title: string }) => r.title)).not.toContain('A private worksheet');

    // S10. The signed-URL route says not found - byte for byte the same answer
    // as for an id that never existed, so it cannot be used to test whether one
    // does.
    const other = await b.request.get(`${APP}/api/documents/${docId}/url`);
    expect(other.status()).toBe(404);
    const invented = await b.request.get(
      `${APP}/api/documents/00000000-0000-4000-8000-000000000000/url`,
    );
    expect(invented.status()).toBe(404);
    expect(await other.text()).toBe(await invented.text());

    // S11. The batch endpoint is not a way around it.
    const batch = await b.request.post(`${APP}/api/documents/urls`, { data: { ids: [docId] } });
    expect(Object.keys((await batch.json()).urls)).toHaveLength(0);

    // S12. THE DUPLICATE ORACLE. Family B uploads byte-identical content. It
    // must save normally and must NOT be reported as a duplicate, because that
    // would reveal that some other household holds this exact file.
    await b.goto('/app/add/schoolwork');
    await b
      .locator('input[type="file"][accept*="pdf"]')
      .setInputFiles([{ name: 'mine.png', mimeType: 'image/png', buffer: shared }]);
    await expect(b.getByText(/Checking/)).toHaveCount(0, { timeout: 15_000 });
    await expect(b.getByText("You've already saved this exact file.")).toHaveCount(0);
    await b.getByLabel('What is this?').fill('My own worksheet');
    await b.getByRole('button', { name: 'Save' }).click();
    await expect(b).toHaveURL(/\/app\/portfolio/, { timeout: 20_000 });
    await expect(b.getByText('My own worksheet')).toBeVisible();

    await aContext.close();
    await bContext.close();
  });
});

test.describe('uploads', () => {
  test('S13-S15: content decides, not the file name', async ({ page }) => {
    await signUp(page, 'Carla', uniqueEmail('valid'));
    await onboardParent(page, 'Lucas');
    await page.goto('/app/add/schoolwork');
    const input = page.locator('input[type="file"][accept*="pdf"]');

    // S13. A .png that is really text is refused, and says why in a sentence.
    await input.setInputFiles([
      { name: 'not-really.png', mimeType: 'image/png', buffer: Buffer.from('just some text') },
    ]);
    await expect(page.getByText(/handle this kind of file/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // S14. A DOCX is refused rather than accepted and quietly unopenable.
    await input.setInputFiles([
      {
        name: 'essay.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('PKfake docx'),
      },
    ]);
    await expect(page.getByText(/handle this kind of file/)).toHaveCount(2);

    // S15. An empty file is refused.
    await input.setInputFiles([
      { name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) },
    ]);
    await expect(page.getByText('This file is empty.')).toBeVisible();
  });

  test('S16: a duplicate within one family is reported, and not saved twice', async ({ page }) => {
    await signUp(page, 'Carla', uniqueEmail('dupe'));
    await onboardParent(page, 'Lucas');
    const bytes = png('same-bytes-twice');
    await capture(page, 'schoolwork', 'First save', [
      { name: 'work.png', mimeType: 'image/png', buffer: bytes },
    ]);

    await page.goto('/app/add/schoolwork');
    await page
      .locator('input[type="file"][accept*="pdf"]')
      .setInputFiles([{ name: 'work-again.png', mimeType: 'image/png', buffer: bytes }]);
    await expect(page.getByText("You've already saved this exact file.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('S17: an upload cannot be aimed at another family storage prefix', async ({ page }) => {
    const email = await signUp(page, 'Carla', uniqueEmail('prefix'));
    await onboardParent(page, 'Lucas');
    const token = await accessToken(page, email);

    const elsewhere = '22222222-2222-4222-8222-00000000000b';
    const response = await page.request.post(
      `${SUPABASE}/storage/v1/object/uploads-quarantine/${elsewhere}/steal.png`,
      {
        headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'image/png' },
        data: png('theft'),
      },
    );
    expect(response.status()).toBe(403);
  });
});

test.describe('links and permissions', () => {
  test('S18: no permanent URL - the signed one carries a token and a short life', async ({
    page,
  }) => {
    const email = await signUp(page, 'Carla', uniqueEmail('signed'));
    await onboardParent(page, 'Lucas');
    await capture(page, 'schoolwork', 'Signed URL check', [
      { name: 'work.png', mimeType: 'image/png', buffer: png('signed') },
    ]);
    const token = await accessToken(page, email);
    const id = await firstDocumentId(page, token);
    await runScanner(page);

    const response = await page.request.get(`${APP}/api/documents/${id}/url`);
    const body = await response.json();
    expect(body.url).toContain('token=');
    expect(body.expiresIn).toBeLessThanOrEqual(300);
    // Never cached, anywhere.
    expect(response.headers()['cache-control']).toContain('no-store');

    // A tampered token is refused rather than served.
    const tampered = String(body.url).replace(/token=[a-f0-9]+/, 'token=deadbeef');
    expect((await page.request.get(tampered)).status()).toBeGreaterThanOrEqual(400);
  });

  test('S19: an invitation link grants nothing on its own', async ({ request }) => {
    // A token that was never issued previews nothing and accepts nothing, and
    // looks identical to one that expired or was already used.
    const response = await request.get(`${APP}/invite/definitely-not-a-real-token`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Sign in');
  });

  test('S20: signed-out visitors reach nothing behind /app', async ({ request }) => {
    for (const path of ['/app/portfolio', '/app/documents', '/app/add/schoolwork', '/app/home']) {
      const response = await request.get(`${APP}${path}`, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      expect(response.headers()['location'], path).toContain('/sign-in');
    }
    // And the API routes do not answer either.
    expect((await request.post(`${APP}/api/documents/urls`, { data: { ids: [] } })).status()).toBe(
      401,
    );
  });
});
