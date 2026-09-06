import { defineConfig, devices } from '@playwright/test';

// The sandbox ships a pinned Chromium build; use it rather than downloading.
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './tests/e2e',
  // performance.spec.ts seeds two dozen real captures and takes minutes; it is
  // run on purpose, not as part of every suite.
  testIgnore: process.env.RUN_PERF ? [] : ['**/performance.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath: CHROME, args: ['--no-sandbox'] },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        launchOptions: { executablePath: CHROME, args: ['--no-sandbox'] },
      },
    },
    {
      // Built from Desktop Chrome rather than devices['iPhone 13']: that
      // descriptor declares defaultBrowserType 'webkit', which conflicts with
      // the pinned Chromium this sandbox provides. Same viewport and touch
      // behaviour, engine that actually runs here.
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: CHROME, args: ['--no-sandbox'] },
      },
    },
  ],
});
