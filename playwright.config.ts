import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the Hidden Wordle E2E suite.
 *
 * Target: the STAGING deployment ONLY (a free static Vercel site).
 * Override with STAGING_URL=... if the staging host ever changes.
 *
 * NOTE: the suite never calls any backend / /ask / LLM endpoint and never
 * touches production (hiddenwordle.vercel.app). See e2e/README.md.
 */
const STAGING_URL =
  process.env.STAGING_URL ||
  'https://hidden-wordle-git-staging-hidden-wordle.vercel.app/'

export default defineConfig({
  testDir: './e2e',
  // Generous timeouts: the reveal animation alone is 350ms x 5 = 1750ms per
  // guess, and a full 6-guess loss run chains six of those.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // Serial: keeps the request rate to the free static site gentle AND removes
  // CPU contention that would otherwise widen the app's keyup-listener rebind
  // window (see fillGuess in the spec) and cause dropped-keystroke flakiness.
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: STAGING_URL,
    permissions: ['clipboard-read', 'clipboard-write'],
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
