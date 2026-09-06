import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const port = 3000
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A GitHub runner has four cores. Locally, Playwright picks half of the cores.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun .output/server/index.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NUXT_TELEMETRY_DISABLED: '1',
    },
  },
})
