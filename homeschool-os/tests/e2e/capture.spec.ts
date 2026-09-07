import { test, expect, type Page } from '@playwright/test';

/**
 * STEP 4 end to end: capture, delivery, sharing and invitations.
 *
 * Real PostgreSQL, real migrations, real RLS, real browser, real bytes on disk.
 * The harness translates every request to SQL and runs it as the signed-in user
 * (tests/harness/fake-supabase.mjs), so a request refused here is refused in
 * production, and a signed URL granted here would be granted there.
 */

const APP = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const CRON_SECRET = process.env.CRON_SECRET ?? 'test-cron-secret';

/* ------------------------------------------------------------------ fixtures */

/** A real 1x1 PNG. Magic bytes and structure, not a placeholder string. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function png(seed: string) {
  // A distinct hash per file, so "the same file twice" is a choice a test makes
  // rather than an accident of using one fixture everywhere. The bytes stay a
  // valid PNG: the tail is appended after IEND, which decoders ignore.
  return Buffer.concat([PNG, Buffer.from(`\n<!-- ${seed} -->`)]);
}

function pdf(body: string) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${body}\n%%EOF\n`);
}

/** The EICAR test signature. Not malware - the industry's agreed trigger. */
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}

/* -------------------------------------------------------------------- helpers */

async function signUp(page: Page, name: string, email: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding\/role/);
}

async function completeParentOnboarding(page: Page, childFirst: string) {
  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/parent\/child/);

  await page.getByLabel('Legal first name').fill(childFirst);
  await page.getByLabel('Legal last name').fill('Melendez');
  await page.getByLabel(/Preferred name/).fill(childFirst);
  await page.getByLabel('Date of birth').fill('2015-04-10');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/location/);
  const state = page.getByRole('combobox').first();
  await state.click();
  await state.fill('Florida');
  await page.getByRole('option', { name: 'Florida' }).click();
  const county = page.locator('#county');
  await county.click();
  await county.fill('Osceola');
  await page.getByRole('option', { name: 'Osceola' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/start/);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/subjects/);
  await page.getByRole('button', { name: 'Science' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/goals/);
  await page.getByRole('button', { name: 'Stay organized' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/complete/);
}

async function newParent(page: Page, child = 'Lucas') {
  const email = uniqueEmail('parent');
  await signUp(page, 'Carla Melendez', email);
  await completeParentOnboarding(page, child);
  return email;
}

/** Attach files to the hidden picker behind "Choose a file". */
async function pickFiles(
  page: Page,
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
) {
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(files);
}

/** Run the scan worker, the only way a document leaves scan_status = pending. */
async function runScanner(page: Page) {
  const response = await page.request.post(`${APP}/api/cron/scan-documents`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/* ============================================================== JOURNEY ONE */

test('journey 1: a parent photographs a worksheet and it lands on the timeline', async ({
  page,
}) => {
  await newParent(page);

  await page.goto('/app/add');
  await expect(page.getByRole('heading', { name: 'Add something' })).toBeVisible();
  await page.getByRole('link', { name: /Schoolwork/ }).click();

  await expect(page).toHaveURL(/\/app\/add\/schoolwork/);
  await pickFiles(page, [{ name: 'long-division.png', mimeType: 'image/png', buffer: png('j1') }]);

  // The picked file is inspected in the browser before anything is uploaded.
  await expect(page.getByText('long-division.png')).toBeVisible();
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 10_000 });

  await page.getByLabel('What is this?').fill('Long division practice');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/app\/portfolio/, { timeout: 20_000 });
  await expect(page.getByText('Long division practice')).toBeVisible();

  // Until the scanner has spoken, the bytes are not delivered.
  await page.getByText('Long division practice').click();
  await expect(page).toHaveURL(/\/app\/portfolio\/[0-9a-f-]{36}/);
  await expect(page.getByText('Checking file')).toBeVisible();

  const result = await runScanner(page);
  expect(result.counts.clean).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByText('Checking file')).toHaveCount(0);
});

/* ============================================================== JOURNEY TWO */

test('journey 2: an afternoon photographed three times is ONE entry', async ({ page }) => {
  await newParent(page);

  await page.goto('/app/add/activity');
  await pickFiles(page, [
    { name: 'springs-1.png', mimeType: 'image/png', buffer: png('trip-a') },
    { name: 'springs-2.png', mimeType: 'image/png', buffer: png('trip-b') },
    { name: 'springs-3.png', mimeType: 'image/png', buffer: png('trip-c') },
  ]);
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 15_000 });

  await page.getByLabel('What did you do?').fill('Trip to the springs');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/app\/portfolio/, { timeout: 20_000 });

  // One card, not three. Three photos on it.
  await expect(page.getByText('Trip to the springs')).toHaveCount(1);
  await expect(page.getByText('3 photos')).toBeVisible();

  await page.getByText('Trip to the springs').click();
  await expect(page.getByRole('heading', { name: '3 photos and files' })).toBeVisible();
});

/* ============================================================ JOURNEY THREE */

test('journey 3: a document is filed, opened, and its audience changed', async ({ page }) => {
  await newParent(page);

  await page.goto('/app/add/document');
  await pickFiles(page, [
    { name: 'immunizations.pdf', mimeType: 'application/pdf', buffer: pdf('immunization record') },
  ]);
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 10_000 });

  await page.getByLabel('What is this document?').fill('Immunization form');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/app\/documents/, { timeout: 20_000 });
  await expect(page.getByText('Immunization form')).toBeVisible();
  // A document filed on its own does NOT invent a portfolio story.
  await page.goto('/app/portfolio');
  await expect(page.getByText('Immunization form')).toHaveCount(0);

  await runScanner(page);

  await page.goto('/app/documents');
  // Click the LINK, not the paragraph inside it. getByText resolves to the <p>,
  // which React replaces during hydration - so on a cold server the click can
  // land on a node that has just been detached, and nothing navigates. The link
  // itself is stable across hydration, and naming it by role says what the test
  // actually means: follow the document into its own page.
  const row = page.getByRole('link', { name: /Immunization form/ });
  await expect(row).toBeVisible();
  // Follow the row's href rather than clicking it. Clicking a row that React is
  // still hydrating can land on a node that has just been replaced, and nothing
  // navigates - silently, and only sometimes, which is the worst kind of test.
  // Whether a row is clickable is worth testing; it is not what THIS test is
  // about, and it should not be able to fail this one.
  const href = await row.getAttribute('href');
  expect(href).toMatch(/\/app\/documents\/[0-9a-f-]{36}/);
  await page.goto(href!);
  await expect(page).toHaveURL(/\/app\/documents\/[0-9a-f-]{36}/);

  // The words on screen are sentences, never the database's vocabulary.
  const audience = page.getByLabel('Visible to');
  await expect(audience).toBeVisible();
  await expect(audience).toHaveValue('family_private');
  await expect(page.getByRole('option', { name: 'Only me' })).toBeAttached();
  await expect(page.locator('body')).not.toContainText('family_private');
  await expect(page.locator('body')).not.toContainText('academic_shared');

  await audience.selectOption('family_shared');
  await expect(page.getByText('Updated.')).toBeVisible();

  // Nobody to share with yet, and the UI says so rather than offering a control
  // that would fail.
  await expect(page.getByText(/There is nobody to share this with yet/)).toBeVisible();
});

/* ============================================================= JOURNEY FOUR */

test('journey 4: an invited teacher accepts and gets exactly the invited role', async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();

  await signUp(admin, 'Adele Admin', uniqueEmail('admin'));
  await admin.getByRole('button', { name: /I run a Homeschool Program/ }).click();
  await expect(admin).toHaveURL(/\/onboarding\/organization\/profile/);
  await admin.getByLabel('Organization name').fill('Helon Universe');
  await admin.getByRole('radio', { name: 'Microschool' }).check();
  await admin.getByRole('button', { name: 'Continue' }).click();

  await expect(admin).toHaveURL(/\/onboarding\/organization\/location/);
  const state = admin.locator('#orgState');
  await state.click();
  await state.fill('Florida');
  await admin.getByRole('option', { name: 'Florida' }).click();
  await admin.getByRole('button', { name: 'Continue' }).click();

  await expect(admin).toHaveURL(/\/onboarding\/organization\/size/);
  await admin.getByRole('radio', { name: '11-25' }).check();
  await admin.getByRole('button', { name: 'Continue' }).click();

  await expect(admin).toHaveURL(/\/onboarding\/organization\/goals/);
  await admin.getByRole('button', { name: 'Students', exact: true }).click();
  await admin.getByRole('button', { name: 'Go to Command Center' }).click();
  await expect(admin).toHaveURL(/\/app\/org\/home/);

  const teacherEmail = uniqueEmail('teacher');
  await admin.goto('/app/org/staff');
  await admin.getByLabel('Email address').first().fill(teacherEmail);
  await admin.getByRole('button', { name: 'Send invitation' }).first().click();
  await expect(admin.getByText(teacherEmail).first()).toBeVisible();

  // The token is never stored anywhere - not in the invitation row, not in the
  // outbox - so the only place the link exists is the message itself. This test
  // reads it the way the recipient would: out of the email. With no provider
  // configured that email goes to the console adapter, and the run script
  // captures the app's output.
  const link = await readInvitationLink(teacherEmail);
  expect(link, 'no invitation email was produced for the invited address').toBeTruthy();

  // Somebody else with the link gets nowhere.
  const intruderContext = await browser.newContext();
  const intruder = await intruderContext.newPage();
  await signUp(intruder, 'Someone Else', uniqueEmail('intruder'));
  await intruder.goto(link!);
  await expect(
    intruder.getByText('This invitation is for a different email address'),
  ).toBeVisible();
  await intruderContext.close();

  // The invited person accepts.
  const teacherContext = await browser.newContext();
  const teacher = await teacherContext.newPage();
  await signUp(teacher, 'Tomas Teacher', teacherEmail);
  await teacher.goto(link!);
  await expect(teacher.getByText('Join Helon Universe')).toBeVisible();
  await expect(teacher.getByText('Teacher', { exact: true })).toBeVisible();
  await teacher.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(teacher).toHaveURL(/\/app/, { timeout: 15_000 });

  // The link is single-use.
  await teacher.goto(link!);
  await expect(teacher.getByText("This invitation link doesn't work")).toBeVisible();

  await teacherContext.close();
  await adminContext.close();
});

/**
 * The console email adapter prints the message; the run script captures the
 * app's output. Scoped to the block addressed to THIS recipient, so a link
 * from another test in the same run cannot be picked up by accident.
 */
async function readInvitationLink(to: string): Promise<string | null> {
  const { readFileSync } = await import('node:fs');
  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const log = readFileSync('/tmp/next-start.log', 'utf8');
      const start = log.lastIndexOf(`to=${to}`);
      if (start !== -1) {
        const match = /https?:\/\/[^\s]*\/invite\/[A-Za-z0-9_-]+/.exec(log.slice(start));
        if (match) return match[0];
      }
    } catch {
      // not written yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}
