import { test, expect, type Page } from '@playwright/test';

/**
 * The STEP 3 demo journeys, end to end against a real PostgreSQL carrying the
 * real migrations. RLS is genuinely enforced (see tests/harness/fake-supabase.mjs),
 * so a test that passes here is a test that passes against the real policies.
 */

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.local`;
}

async function signUp(page: Page, name: string, email: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding\/role/);
}

async function completeParentOnboarding(page: Page, childFirst = 'Lucas') {
  await page.getByRole('button', { name: /I'm a Parent/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/parent\/child/);

  // Step 1 - child
  await page.getByLabel('Legal first name').fill(childFirst);
  await page.getByLabel('Legal last name').fill('Melendez');
  await page.getByLabel(/Preferred name/).fill(childFirst);
  await page.getByLabel('Date of birth').fill('2015-04-10');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2 - Florida / Osceola
  await expect(page).toHaveURL(/\/onboarding\/parent\/location/);
  await page.getByRole('combobox').first().click();
  await page.getByRole('combobox').first().fill('Florida');
  await page.getByRole('option', { name: 'Florida' }).click();
  const county = page.locator('#county');
  await county.click();
  await county.fill('Osceola');
  await page.getByRole('option', { name: 'Osceola' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3 - start date
  await expect(page).toHaveURL(/\/onboarding\/parent\/start/);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4 - subjects
  await expect(page).toHaveURL(/\/onboarding\/parent\/subjects/);
  await page.getByRole('button', { name: 'Science' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 5 - goals
  await expect(page).toHaveURL(/\/onboarding\/parent\/goals/);
  await page.getByRole('button', { name: 'Stay organized' }).click();
  await page.getByRole('button', { name: 'Build our portfolio' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding\/parent\/complete/);
}

test.describe('parent journey', () => {
  test('sign up through dashboard, add a second child, switch, sign out', async ({ page }) => {
    const email = uniqueEmail('parent');
    await signUp(page, 'Carla Melendez', email);
    await completeParentOnboarding(page);

    // Transition screen never claims compliance. Assert on VISIBLE text: the
    // RSC payload legitimately embeds the whole message catalogue, which does
    // contain the word (in the records copy that promises we will never say it).
    await expect(page.getByRole('heading', { name: "You're ready." })).toBeVisible();
    const visible = (await page.locator('main').innerText()).toLowerCase();
    expect(visible).not.toContain('compliant');
    expect(visible).toContain('florida homeschool organization tools');

    await page.getByRole('link', { name: 'Go to my dashboard' }).click();
    await expect(page).toHaveURL(/\/app\/home/);

    // Dashboard greets the real user and shows the real child.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Carla');
    await expect(page.getByRole('button', { name: /Change child/ })).toContainText('Lucas');

    // No meaningless percentages on an empty account.
    const dash = await page.locator('main').innerText();
    expect(dash).not.toContain('0%');
    expect(dash).toContain('No evidence yet');

    // Add a second child.
    await page.getByRole('button', { name: /Change child/ }).click();
    await page.getByRole('menuitem', { name: /Add another child/ }).click();
    await expect(page).toHaveURL(/\/app\/children\/new/);
    await page.getByLabel('Legal first name').fill('Marla');
    await page.getByLabel('Legal last name').fill('Melendez');
    await page.getByLabel('Date of birth').fill('2017-09-22');
    await page.locator('#main').getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/home/);

    // Both children are now selectable, and switching changes context.
    await page.getByRole('button', { name: /Change child/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Marla' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Marla' }).click();
    await expect(page.getByRole('button', { name: /Change child/ })).toContainText('Marla');

    // Portfolio shows an intentional empty state, not a blank table.
    await page.goto('/app/portfolio');
    await expect(page.getByText('Your portfolio starts here.')).toBeVisible();
    expect(await page.locator('table').count()).toBe(0);

    // Home, then sign out.
    await page.goto('/app/home');
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('onboarding resumes where it stopped', async ({ page }) => {
    const email = uniqueEmail('resume');
    await signUp(page, 'Resume Tester', email);

    await page.getByRole('button', { name: /I'm a Parent/ }).click();
    await page.getByLabel('Legal first name').fill('Half');
    await page.getByLabel('Legal last name').fill('Finished');
    await page.getByLabel('Date of birth').fill('2016-01-01');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/onboarding\/parent\/location/);

    // Leave and come back: /app bounces to the saved step, not the dashboard.
    await page.goto('/app');
    await expect(page).toHaveURL(/\/onboarding\/parent\/location/);

    // The earlier answers survived.
    await page.goto('/onboarding/parent/child');
    await expect(page.getByLabel('Legal first name')).toHaveValue('Half');
  });
});

test.describe('organization journey', () => {
  test('sign up, create organization, reach Command Center, invite a family', async ({ page }) => {
    const email = uniqueEmail('org');
    await signUp(page, 'Adele Rivera', email);

    await page.getByRole('button', { name: /I run a Homeschool Program/ }).click();
    await expect(page).toHaveURL(/\/onboarding\/organization\/profile/);

    await page.getByLabel('Organization name').fill('Helon Learning Program');
    await page.getByRole('radio', { name: 'Microschool' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organization\/location/);
    const st = page.locator('#orgState');
    await st.click();
    await st.fill('Florida');
    await page.getByRole('option', { name: 'Florida' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organization\/size/);
    await page.getByRole('radio', { name: '11-25' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/onboarding\/organization\/goals/);
    await page.getByRole('button', { name: 'Students', exact: true }).click();
    await page.getByRole('button', { name: 'Go to Command Center' }).click();

    await expect(page).toHaveURL(/\/app\/org\/home/);
    // The name appears in both the sidebar switcher and the heading, which is
    // correct - scope to the main region.
    await expect(page.locator('#main').getByText('Helon Learning Program')).toBeVisible();
    await expect(page.getByText('Organization setup')).toBeVisible();

    // Empty states are intentional, and no alert is fabricated.
    await expect(page.getByText('Everything looks good.')).toBeVisible();

    // Invite a family.
    await page.goto('/app/org/families');
    await page.getByLabel('Email address').fill('newfamily@test.local');
    await page.getByRole('button', { name: 'Send invitation' }).click();
    // STEP 4 made this message truthful. The invitation IS created, but this
    // installation has no email provider configured, so nothing was sent - and
    // the screen has to say so. It used to read "Invitation sent", which would
    // have left an admin waiting for a reply to a message that never existed.
    await expect(
      page.getByText(/Invitation created for newfamily@test.local, but no email went out/),
    ).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();

    // Resending issues a NEW token, which is also what stops a link that went
    // astray from being useful. The invitation stays the same invitation.
    await page.getByRole('button', { name: 'Resend' }).click();
    await expect(page.getByText('newfamily@test.local', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });
});

test.describe('security', () => {
  test('protected routes redirect an unauthenticated visitor', async ({ page }) => {
    for (const path of ['/app', '/app/home', '/app/org/home', '/onboarding/role', '/app/settings']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });

  test('a signed-in user cannot see another family data', async ({ browser }) => {
    // Two separate browser contexts - two genuinely different people, rather
    // than one browser signing in and out.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await signUp(pageA, 'Family A', uniqueEmail('famA'));
    await completeParentOnboarding(pageA, 'ChildA');
    await pageA.goto('/app/home');
    await expect(pageA.getByRole('button', { name: /Change child/ })).toContainText('ChildA');

    await signUp(pageB, 'Family B', uniqueEmail('famB'));
    await completeParentOnboarding(pageB, 'ChildB');
    await pageB.goto('/app/home');

    // B must not see A's child anywhere, and RLS - not the UI - is what stops it.
    const bodyB = await pageB.locator('body').innerText();
    expect(bodyB).not.toContain('ChildA');
    await expect(pageB.getByRole('button', { name: /Change child/ })).toContainText('ChildB');

    // A is unaffected and still sees only their own.
    await pageA.reload();
    const bodyA = await pageA.locator('body').innerText();
    expect(bodyA).not.toContain('ChildB');

    await ctxA.close();
    await ctxB.close();
  });

  test('the anon key is public but the service role never reaches the browser', async ({ page }) => {
    await page.goto('/sign-in');
    const html = await page.content();
    expect(html).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(html).not.toMatch(/service_role["'\s]*:/);
  });
});

test.describe('localisation', () => {
  test('switching to Spanish changes the interface', async ({ page }) => {
    const email = uniqueEmail('locale');
    await signUp(page, 'Locale Tester', email);
    await completeParentOnboarding(page, 'Nino');
    await page.goto('/app/settings');

    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    await page.goto('/app/portfolio');
    await expect(page.getByText('Aquí empieza tu portafolio.')).toBeVisible();

    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});

test.describe('mobile', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 9999) > 500, 'mobile only');

  test('bottom navigation reaches the core tasks without hunting', async ({ page }) => {
    await signUp(page, 'Mobile Parent', uniqueEmail('mobile'));
    await completeParentOnboarding(page, 'Mobi');
    await page.goto('/app/home');

    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();
    // Exactly five items, per the mobile rule.
    await expect(nav.getByRole('link')).toHaveCount(5);

    // Every target is a real page.
    for (const label of ['Learn', 'Calendar', 'Portfolio']) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }

    // The universal action is reachable from the header on mobile too, and
    // since STEP 4 every entry in it leads to a capture flow that saves.
    await page.goto('/app/home');
    await page.getByRole('button', { name: /Add|\+/ }).first().click();
    const capture = page.getByRole('menuitem', { name: 'Add schoolwork' });
    await expect(capture).toBeVisible();
    await capture.click();
    await expect(page).toHaveURL(/\/app\/add\/schoolwork/);
    await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible();

    // More holds the overflow, including sign out.
    await nav.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('link', { name: 'Homeschool Records' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('no horizontal overflow on the key screens', async ({ page }) => {
    await signUp(page, 'Overflow Check', uniqueEmail('overflow'));
    await completeParentOnboarding(page, 'Wide');
    for (const path of ['/app/home', '/app/portfolio', '/app/settings', '/app/records']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow, `horizontal overflow at ${path}`).toBe(false);
    }
  });
});
