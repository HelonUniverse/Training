import { test, expect, type Page } from '@playwright/test';

/**
 * STEP 6, from the family's side.
 *
 * The acceptance criterion for this whole step is not a feature. It is an
 * absence: a parent who never once looks at a standards code must be able to
 * use the entire learning system. So most of what follows checks that turning
 * standards off changes nothing except what is on the screen, and that the one
 * standards surface a family CAN see reads as a note rather than a target.
 */

const APP = process.env.BASE_URL ?? 'http://127.0.0.1:3100';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;
}

async function newParent(page: Page, child = 'Lucas') {
  const email = uniqueEmail('step6');
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Carla Melendez');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding\/role/);

  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await page.getByLabel('Legal first name').fill(child);
  await page.getByLabel('Legal last name').fill('Melendez');
  await page.getByLabel(/Preferred name/).fill(child);
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
  return email;
}

/** Language that would tell a homeschool parent their child is behind. */
const PACING_LANGUAGE = [
  /behind/i, /on track/i, /must complete/i, /required standard/i,
  /should already know/i, /grade[- ]level requirement/i, /catch up/i,
  /standards remaining/i, /% complete/i, /atrasad/i, /ponerse al día/i,
];

async function expectNoPacingLanguage(page: Page) {
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const pattern of PACING_LANGUAGE) {
    expect(body, `page must not say ${pattern}`).not.toMatch(pattern);
  }
}

test.describe('the learning system without standards', () => {
  test('D1: a parent can use Learn end to end without a single standard existing', async ({ page }) => {
    await newParent(page);
    await page.goto('/app/learning');

    // Add a curriculum. No standards catalogue is involved anywhere in this.
    // Straight to the form by URL. Learn offers this link twice (header action
    // and empty state) and which one a locator resolves is not what this test
    // is about - it is about the flow working with no standards in existence.
    await page.goto('/app/learning/add');
    await page.getByLabel('Who makes it?').fill('Our own materials');
    await page.getByLabel("What's it called?").fill('Our own fractions plan');
    await page.getByRole('button', { name: 'Save' }).click();

    // /learning$ and not /learning/, which the add page itself would match.
    await expect(page).toHaveURL(/app\/learning$/, { timeout: 20_000 });
    await expect(page.getByText('Our own fractions plan')).toBeVisible();

    // The whole surface renders, and says nothing about pace.
    await expectNoPacingLanguage(page);
  });

  test('D2: Learn never leads with a benchmark code', async ({ page }) => {
    await newParent(page);
    await page.goto('/app/learning');

    // Nothing that looks like a standards code appears on the main Learn page.
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\b[A-Z]{2}\.\d\.[A-Z]{2,3}\.\d\.\d\b/);
    await expectNoPacingLanguage(page);
  });

  test('D3: the standards preference is offered, and hiding it changes only display', async ({ page }) => {
    await newParent(page);
    await page.goto('/app/settings');

    const hide = page.getByRole('button', { name: /Don't show standards/i });
    await expect(hide).toBeVisible();
    await hide.click();
    await expect(hide).toHaveAttribute('aria-pressed', 'true');

    // Everything else still works with the preference off.
    await page.goto('/app/learning');
    await expect(page.getByRole('heading', { name: 'Learning', exact: true })).toBeVisible();
    await expectNoPacingLanguage(page);

    await page.goto('/app/portfolio');
    await expect(page.locator('body')).toBeVisible();
    await expectNoPacingLanguage(page);
  });

  test('D4: an ordinary parent sees nothing at all on the standards admin surface', async ({ page }) => {
    await newParent(page);
    await page.goto('/app/admin/standards');

    // RLS answers, not a client-side check: the page renders and is empty.
    await expect(page.getByText(/does not have it/i)).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/sha-?256:\s*[0-9a-f]{64}/i);
  });
});

test.describe('visual review', () => {
  for (const path of ['/app/learning', '/app/settings']) {
    test(`V: ${path} is calm and learning-centred`, async ({ page }, testInfo) => {
      await newParent(page);
      await page.goto(path);
      await expectNoPacingLanguage(page);

      // Nothing overflows horizontally at any of the three widths.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(1);

      await testInfo.attach(`step6${path.replace(/\//g, '-')}-${testInfo.project.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  }
});
