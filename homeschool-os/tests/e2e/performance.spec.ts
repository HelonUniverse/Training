import { test, expect, type Page } from '@playwright/test';

/**
 * STEP 4 performance, measured rather than remembered.
 *
 * Run explicitly:  npx playwright test performance.spec.ts --project=desktop
 *
 * The numbers come from an account with a realistic amount of material, not an
 * empty one: two dozen captures across a year, each with a photograph. An empty
 * portfolio renders instantly and tells you nothing.
 *
 * The budgets are deliberately generous. This runs Next in production mode
 * against local PostgreSQL on a shared sandbox CPU, so the absolute numbers are
 * not a production forecast. What they catch is the SHAPE of a mistake: a query
 * per row, a signing round trip per thumbnail, a page that waits for every
 * image before it paints. Those show up as an order of magnitude, not a few
 * milliseconds, and they survive the noise.
 */

const APP = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';
const ITEMS = 24;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = (seed: string) => Buffer.concat([PNG, Buffer.from(`<!-- ${seed} -->`)]);
const uniqueEmail = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@perf.local`;

type Measurement = { what: string; value: number; budget: number; unit: string };
const results: Measurement[] = [];

function record(what: string, value: number, budget: number, unit = 'ms') {
  results.push({ what, value: Math.round(value), budget, unit });
}

async function time(fn: () => Promise<unknown>): Promise<number> {
  const started = Date.now();
  await fn();
  return Date.now() - started;
}

/** Count requests to a path while something runs. */
async function countRequests(page: Page, path: string, run: () => Promise<void>) {
  let n = 0;
  const listener = (request: { url(): string }) => {
    if (request.url().includes(path)) n += 1;
  };
  page.on('request', listener);
  await run();
  page.off('request', listener);
  return n;
}

test('measure the STEP 4 screens under a year of material', async ({ page }) => {
  test.setTimeout(900_000);

  /* ------------------------------------------------------------- a family */

  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Perf Parent');
  await page.getByLabel('Email').fill(uniqueEmail('perf'));
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding\/role/);

  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await page.getByLabel('Legal first name').fill('Lucas');
  await page.getByLabel('Legal last name').fill('Perf');
  await page.getByLabel(/Preferred name/).fill('Lucas');
  await page.getByLabel('Date of birth').fill('2015-04-10');
  await page.getByRole('button', { name: 'Continue' }).click();
  const state = page.locator('#state');
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
  await expect(page).toHaveURL(/parent\/complete/);

  /* ------------------------------------- a year of captures, made for real */

  const captureTimes: number[] = [];
  for (let i = 0; i < ITEMS; i += 1) {
    captureTimes.push(await captureOne(page, i));
  }
  const median = [...captureTimes].sort((a, b) => a - b)[Math.floor(captureTimes.length / 2)]!;
  record('one capture: pick, upload, save, land on the timeline', median, 8000);

  // Drain the scan queue - the worker takes 25 documents at a time.
  for (let i = 0; i < Math.ceil(ITEMS / 25) + 1; i += 1) {
    await page.request.post(`${APP}/api/cron/scan-documents`, {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
  }

  /* ------------------------------------------------------------ the pages */

  record(
    'portfolio: server render, heading visible',
    await time(async () => {
      await page.goto('/app/portfolio', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Portfolio', exact: true }).waitFor();
    }),
    4000,
  );

  record(
    'portfolio: first photograph on screen',
    await time(async () => {
      await page.locator('img').first().waitFor({ state: 'attached', timeout: 60_000 });
    }),
    6000,
  );

  // THE ONE THAT MATTERS. A page of photographs must cost a small, constant
  // number of signing calls - not one per thumbnail.
  const signingCalls = await countRequests(page, '/api/documents/urls', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('img').first().waitFor({ state: 'attached', timeout: 60_000 });
    await page.waitForTimeout(2000);
  });
  record('portfolio: signing round trips for a whole page', signingCalls, 3, 'requests');

  record(
    'documents: server render, heading visible',
    await time(async () => {
      await page.goto('/app/documents', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor();
    }),
    4000,
  );

  record(
    'documents: metadata search',
    await time(async () => {
      await page.goto('/app/documents?q=Capture', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Documents', exact: true }).waitFor();
    }),
    4000,
  );

  const docHref = await page
    .locator('a[href^="/app/documents/"]')
    .first()
    .getAttribute('href');
  const docId = docHref?.split('/').pop();
  expect(docId).toBeTruthy();

  record(
    'one signed URL, end to end (authorize, sign, audit)',
    await time(async () => {
      const response = await page.request.get(`${APP}/api/documents/${docId}/url`);
      expect(response.status()).toBe(200);
    }),
    2000,
  );

  record(
    'document detail: server render',
    await time(async () => {
      await page.goto(`/app/documents/${docId}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading').first().waitFor();
    }),
    4000,
  );

  record(
    'dashboard: server render with real counts',
    await time(async () => {
      await page.goto('/app/home', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading').first().waitFor();
    }),
    4000,
  );

  /* --------------------------------------------------------------- report */

  const lines = results.map(
    (r) => `  ${r.what.padEnd(54)} ${String(r.value).padStart(6)} ${r.unit.padEnd(8)} (budget ${r.budget})`,
  );
  console.log(['', `STEP 4 performance - ${ITEMS} captures`, ...lines, ''].join('\n'));

  const over = results.filter((r) => r.value > r.budget);
  expect(over.map((r) => `${r.what} = ${r.value}${r.unit}`)).toEqual([]);
});

/** One capture, the way a family makes it. Returns how long it took. */
async function captureOne(page: Page, index: number): Promise<number> {
  const started = Date.now();
  await page.goto('/app/add/schoolwork');
  await page
    .locator('input[type="file"][accept*="pdf"]')
    .setInputFiles([
      { name: `capture-${index}.png`, mimeType: 'image/png', buffer: png(`perf-${index}`) },
    ]);
  // Poll until nothing is being inspected. `toHaveCount(0)` is right where
  // `waitFor({state:'detached'})` is not: if hashing finishes before the first
  // poll, "Checking" never renders at all and waiting for it to detach returns
  // instantly against a form that is not ready.
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 30_000 });
  await page.getByLabel('What is this?').fill(`Capture number ${index}`);
  // Spread backwards from today, a fortnight apart. It has to be the PAST: the
  // date field carries max={today} because you cannot record work a child has
  // not done yet, so a future date makes the form invalid and the browser
  // silently refuses to submit it. (That is how this test first stalled.)
  const when = new Date();
  when.setDate(when.getDate() - index * 14);
  await page.getByLabel('When was this done?').fill(when.toISOString().slice(0, 10));
  // Only now can Save be enabled: it needs a file AND a title.
  const save = page.getByRole('button', { name: 'Save' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  await save.click();
  // toHaveURL polls the URL; waitForURL waits for a load event, which a
  // client-side router.push never fires - so it hangs on a navigation that
  // has already happened.
  await expect(page).toHaveURL(/app\/portfolio/, { timeout: 60_000 });
  return Date.now() - started;
}
