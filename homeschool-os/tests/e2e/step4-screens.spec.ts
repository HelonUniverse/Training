import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * The twelve STEP 4 screens, at every width, with the mechanical checks a human
 * reviewer should not have to do by eye: no horizontal overflow, every control
 * big enough for a thumb, and - specific to this step - no database vocabulary
 * anywhere on the page.
 *
 * Output: tests/e2e/screenshots/<width>/step4-<screen>.png
 */

const OUT = 'tests/e2e/screenshots';

/**
 * Enum labels that must never reach a screen. If any of these appears in the
 * rendered text, some code path is showing the database's vocabulary to a
 * parent instead of a sentence.
 */
const FORBIDDEN = [
  'family_private',
  'family_shared',
  'academic_shared',
  'assigned_staff',
  'evaluator_shared',
  'organization_operational',
  'system_compliance',
  'work_sample',
  'field_trip',
  'read_aloud',
  'notice_of_intent',
  'student_educational',
  'scan_status',
];

function dirFor(width: number) {
  const name = width <= 500 ? 'mobile-390' : width <= 800 ? 'tablet-768' : 'desktop-1440';
  const dir = `${OUT}/${name}`;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function shoot(page: Page, name: string, width: number) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dirFor(width)}/step4-${name}.png`, fullPage: true });
}

async function review(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, `${label}: horizontal overflow`).toBe(false);

  const small = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, a[href], input, select'))) {
      if (el.closest('nextjs-portal, [data-nextjs-toast]')) continue;
      // Not pointer targets: the skip link (until focused) and the visually
      // hidden file inputs, which are driven by the labelled buttons beside
      // them. Measuring those would be measuring the wrong element.
      if (el.classList.contains('skip-link')) continue;
      if (el.classList.contains('sr-only')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if ((el as HTMLInputElement).type === 'hidden') continue;
      if (el.tagName === 'A') {
        const parent = el.parentElement;
        const parentText = (parent?.textContent ?? '').trim();
        const ownText = (el.textContent ?? '').trim();
        if (parent && parentText.length > ownText.length + 1) continue;
      }
      const target = (el.tagName === 'INPUT' && el.closest('label')) || el;
      const r = target.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 40 || r.width < 40) {
        bad.push(
          `${el.tagName}.${(el.className || '').toString().slice(0, 24)} -> ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
      }
    }
    return bad;
  });
  expect(small, `${label}: controls below the touch-target minimum`).toEqual([]);

  // Every heading and label must be reachable by a screen reader.
  const unlabelled = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, a[href]'))) {
      if (el.closest('nextjs-portal, [data-nextjs-toast]')) continue;
      const name =
        (el.getAttribute('aria-label') ?? '') +
        (el.getAttribute('title') ?? '') +
        (el.textContent ?? '');
      if (name.trim().length === 0) bad.push(el.outerHTML.slice(0, 60));
    }
    return bad;
  });
  expect(unlabelled, `${label}: controls with no accessible name`).toEqual([]);

  // A date that failed to parse renders as "Invalid Date" and no assertion
  // about layout or labels would ever notice. It is worth its own check.
  const body = await page.locator('body').innerText();
  expect(body, `${label}: a date failed to render`).not.toContain('Invalid Date');
  // An i18n key that reached the screen instead of its translation. Named
  // prefixes rather than a general pattern, so a filename like "work.png" or a
  // sentence with an abbreviation cannot trip it.
  expect(body, `${label}: an untranslated key reached the screen`).not.toMatch(
    /\b(capture|documents|portfolio|sharing|visibility|scan|vocab|upload|invitations|notifications)\.[a-zA-Z.]+/,
  );

  const text = body.toLowerCase();
  const leaked = FORBIDDEN.filter((token) => text.includes(token));
  expect(leaked, `${label}: database vocabulary on screen`).toEqual([]);
}

const uniqueEmail = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@shot.local`;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const png = (seed: string) => Buffer.concat([PNG, Buffer.from(`<!-- ${seed} -->`)]);
const pdf = (body: string) => Buffer.from(`%PDF-1.4 ${body} %%EOF`);

test('the twelve STEP 4 screens', async ({ page, viewport }) => {
  const width = viewport?.width ?? 1440;
  test.setTimeout(180_000);

  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Carla Melendez');
  await page.getByLabel('Email').fill(uniqueEmail('step4'));
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding\/role/);

  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await page.getByLabel('Legal first name').fill('Lucas');
  await page.getByLabel('Legal last name').fill('Melendez');
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

  /* 1. The chooser --------------------------------------------------------- */
  await page.goto('/app/add');
  await shoot(page, '01-add-something', width);
  await review(page, 'add-something');

  /* 2. Schoolwork capture, empty ------------------------------------------- */
  await page.goto('/app/add/schoolwork');
  await shoot(page, '02-capture-schoolwork-empty', width);
  await review(page, 'capture-schoolwork-empty');

  /* 3. Schoolwork capture, with files picked ------------------------------- */
  const picker = page.locator('input[type="file"][accept*="pdf"]');
  await picker.setInputFiles([
    { name: 'division.png', mimeType: 'image/png', buffer: png('shot-1') },
    { name: 'division-2.png', mimeType: 'image/png', buffer: png('shot-2') },
  ]);
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 15_000 });
  await page.getByLabel('What is this?').fill('Long division practice');
  await shoot(page, '03-capture-schoolwork-filled', width);
  await review(page, 'capture-schoolwork-filled');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/app\/portfolio/, { timeout: 20_000 });

  /* 4. A rejected file ----------------------------------------------------- */
  await page.goto('/app/add/schoolwork');
  await picker.setInputFiles([
    { name: 'pretend.png', mimeType: 'image/png', buffer: Buffer.from('not an image at all') },
  ]);
  await expect(page.getByText(/handle this kind of file/)).toBeVisible();
  await shoot(page, '04-capture-rejected-file', width);
  await review(page, 'capture-rejected-file');

  /* 5. Activity capture ---------------------------------------------------- */
  await page.goto('/app/add/activity');
  await page.getByLabel('What did you do?').fill('Trip to the springs');
  await shoot(page, '05-capture-activity', width);
  await review(page, 'capture-activity');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/app\/portfolio/, { timeout: 20_000 });

  /* 6. Book capture -------------------------------------------------------- */
  await page.goto('/app/add/book');
  await page.getByLabel('Book title').fill('Because of Winn-Dixie');
  await shoot(page, '06-capture-book', width);
  await review(page, 'capture-book');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/app\/portfolio/, { timeout: 20_000 });

  /* 7. Document capture ---------------------------------------------------- */
  await page.goto('/app/add/document');
  await picker.setInputFiles([
    { name: 'immunizations.pdf', mimeType: 'application/pdf', buffer: pdf('immunizations') },
  ]);
  await expect(page.getByText(/Checking/)).toHaveCount(0, { timeout: 15_000 });
  await page.getByLabel('What is this document?').fill('Immunization form');
  await shoot(page, '07-capture-document', width);
  await review(page, 'capture-document');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/app\/documents/, { timeout: 20_000 });

  // Let the scanner clear everything, so the timeline shows real photographs.
  await page.request.post(
    `${process.env.BASE_URL ?? 'http://127.0.0.1:3100'}/api/cron/scan-documents`,
    { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? 'test-cron-secret'}` } },
  );

  /* 8. The portfolio timeline ---------------------------------------------- */
  await page.goto('/app/portfolio');
  await shoot(page, '08-portfolio-timeline', width);
  await review(page, 'portfolio-timeline');

  /* 9. A portfolio entry --------------------------------------------------- */
  await page.getByText('Long division practice').first().click();
  await expect(page).toHaveURL(/app\/portfolio\/[0-9a-f-]{36}/);
  await shoot(page, '09-portfolio-item', width);
  await review(page, 'portfolio-item');

  /* 10. Editing an entry --------------------------------------------------- */
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit/);
  await shoot(page, '10-portfolio-edit', width);
  await review(page, 'portfolio-edit');

  /* 11. The documents list ------------------------------------------------- */
  await page.goto('/app/documents');
  await shoot(page, '11-documents-list', width);
  await review(page, 'documents-list');

  /* 12. A document, with its audience -------------------------------------- */
  await page.getByText('Immunization form').first().click();
  await expect(page).toHaveURL(/app\/documents\/[0-9a-f-]{36}/);
  await shoot(page, '12-document-detail', width);
  await review(page, 'document-detail');

  /* And the dashboard, now that it has something real to show. ------------- */
  await page.goto('/app/home');
  await shoot(page, '13-dashboard-with-captures', width);
  await review(page, 'dashboard-with-captures');

  /* Spanish, to prove the layout survives longer strings. ------------------ */
  await page.goto('/app/settings');
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();

  await page.goto('/app/add');
  await shoot(page, '14-add-something-es', width);
  await review(page, 'add-something-es');

  await page.goto('/app/portfolio');
  await shoot(page, '15-portfolio-timeline-es', width);
  await review(page, 'portfolio-timeline-es');

  await page.goto('/app/add/activity');
  await shoot(page, '16-capture-activity-es', width);
  await review(page, 'capture-activity-es');
});
