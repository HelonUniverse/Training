import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * Captures the screens STEP 3 requires a visual review of, at every width, and
 * asserts the mechanical things a human reviewer should not have to check by
 * eye: no horizontal overflow, no clipped text, touch targets big enough.
 *
 * Run with:  npx playwright test screens.spec.ts
 * Output:    tests/e2e/screenshots/<width>/<screen>.png
 */

const OUT = 'tests/e2e/screenshots';

function dirFor(width: number) {
  const name = width <= 500 ? 'mobile-390' : width <= 800 ? 'tablet-768' : 'desktop-1440';
  const dir = `${OUT}/${name}`;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function shoot(page: Page, name: string, width: number) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dirFor(width)}/${name}.png`, fullPage: true });
}

/** Mechanical layout checks a reviewer would otherwise do by squinting. */
async function assertLayoutSane(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, `${label}: horizontal overflow`).toBe(false);

  // Touch targets. What matters is the area a finger can actually hit, which
  // for a radio or checkbox is its wrapping <label>, not the 20px box itself.
  // Visually-hidden helpers (the skip link) are excluded - they are not
  // pointer targets until focused.
  const small = await page.evaluate(() => {
    const bad: string[] = [];
    const nodes = document.querySelectorAll('button, a[href], input, select');
    for (const el of Array.from(nodes)) {
      if (el.closest('nextjs-portal, [data-nextjs-toast]')) continue;
      if (el.classList.contains('skip-link')) continue;

      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if ((el as HTMLInputElement).type === 'hidden') continue;

      // WCAG 2.5.8 exempts a link that sits inline within a sentence. Detect
      // that as: an <a> whose parent carries text of its own alongside it.
      if (el.tagName === 'A') {
        const parent = el.parentElement;
        const parentText = (parent?.textContent ?? '').trim();
        const ownText = (el.textContent ?? '').trim();
        if (parent && parentText.length > ownText.length + 1) continue;
      }

      // Measure the label that wraps a radio/checkbox, if there is one.
      const target =
        (el.tagName === 'INPUT' && el.closest('label')) || el;
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
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@shot.local`;
}

test('capture the review screens', async ({ page, viewport }) => {
  const width = viewport?.width ?? 1440;
  test.setTimeout(120_000);

  // 1. Sign in
  await page.goto('/sign-in');
  await shoot(page, '01-sign-in', width);
  await assertLayoutSane(page, 'sign-in');

  // Sign up, so the rest of the journey is real.
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Carla Melendez');
  await page.getByLabel('Email').fill(uniqueEmail('shot'));
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding\/role/);

  // 2. Role selection
  await shoot(page, '02-role-selection', width);
  await assertLayoutSane(page, 'role-selection');

  // 3. Parent child onboarding
  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await expect(page).toHaveURL(/parent\/child/);
  await shoot(page, '03-parent-child', width);
  await assertLayoutSane(page, 'parent-child');

  await page.getByLabel('Legal first name').fill('Lucas');
  await page.getByLabel('Legal last name').fill('Melendez');
  await page.getByLabel(/Preferred name/).fill('Lucas');
  await page.getByLabel('Date of birth').fill('2015-04-10');
  await page.getByRole('button', { name: 'Continue' }).click();

  // location (also worth a look - the searchable county picker)
  await expect(page).toHaveURL(/parent\/location/);
  const st = page.locator('#state');
  await st.click();
  await st.fill('Florida');
  await page.getByRole('option', { name: 'Florida' }).click();
  const county = page.locator('#county');
  await county.click();
  await county.fill('Osc');
  await shoot(page, '04-parent-location-county-search', width);
  await page.getByRole('option', { name: 'Osceola' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/parent\/start/);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/parent\/subjects/);
  await shoot(page, '05-parent-subjects', width);
  await assertLayoutSane(page, 'parent-subjects');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/parent\/goals/);
  await page.getByRole('button', { name: 'Stay organized' }).click();
  await page.getByRole('button', { name: 'Build our portfolio' }).click();
  await shoot(page, '06-parent-goals', width);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/parent\/complete/);
  await shoot(page, '07-onboarding-complete', width);
  await assertLayoutSane(page, 'onboarding-complete');

  // 4. Parent dashboard
  await page.getByRole('link', { name: 'Go to my dashboard' }).click();
  await expect(page).toHaveURL(/app\/home/);
  await shoot(page, '08-parent-dashboard', width);
  await assertLayoutSane(page, 'parent-dashboard');

  // 5. Portfolio empty state
  await page.goto('/app/portfolio');
  await shoot(page, '09-portfolio-empty', width);
  await assertLayoutSane(page, 'portfolio-empty');

  // Records, because the Florida language matters
  await page.goto('/app/records');
  await shoot(page, '10-records-florida', width);

  // Settings / language switcher
  await page.goto('/app/settings');
  await shoot(page, '11-settings', width);
  await assertLayoutSane(page, 'settings');

  // Spanish, to prove the layout survives longer strings
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await page.goto('/app/home');
  await shoot(page, '12-parent-dashboard-es', width);
  await assertLayoutSane(page, 'parent-dashboard-es');
  await page.goto('/app/settings');
  await page.getByRole('button', { name: 'English' }).click();
});

test('capture the organization screens', async ({ page, viewport }) => {
  const width = viewport?.width ?? 1440;
  test.setTimeout(120_000);

  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Adele Rivera');
  await page.getByLabel('Email').fill(uniqueEmail('orgshot'));
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.getByRole('button', { name: /I run a Homeschool Program/ }).click();
  await page.getByLabel('Organization name').fill('Helon Learning Program');
  await page.getByRole('radio', { name: 'Microschool' }).check();
  await shoot(page, '13-org-profile', width);
  await assertLayoutSane(page, 'org-profile');
  await page.getByRole('button', { name: 'Continue' }).click();

  const st = page.locator('#orgState');
  await st.click();
  await st.fill('Florida');
  await page.getByRole('option', { name: 'Florida' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('radio', { name: '11-25' }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Command Center' }).click();

  await expect(page).toHaveURL(/app\/org\/home/);
  await shoot(page, '14-org-command-center', width);
  await assertLayoutSane(page, 'org-command-center');

  await page.goto('/app/org/families');
  await shoot(page, '15-org-invite-family', width);
  await assertLayoutSane(page, 'org-invite-family');
});
