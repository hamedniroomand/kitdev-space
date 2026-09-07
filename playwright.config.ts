import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const port = 3000

/**
 * `PLAYWRIGHT_BASE_URL` points the suite at a deployment, such as the staged
 * production deployment that the deploy workflow tests before it takes the
 * domain. Without it the suite starts the local production build.
 */
const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = remoteBaseURL ?? `http://127.0.0.1:${port}`

/** Vercel deployment protection lets automation through with this header. */
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

/**
 * The tests run against a production build, never the dev server. The dev
 * server compiles each page on its first visit, which made the suite slow and
 * flaky. `bun run test:e2e` builds first; `bun run test:e2e:run` skips the
 * build and reuses the last one, or a server that already listens on the port.
 */
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
    ...(bypassSecret
      ? {
          extraHTTPHeaders: {
            'x-vercel-protection-bypass': bypassSecret,
            'x-vercel-set-bypass-cookie': 'true',
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: remoteBaseURL
    ? undefined
    : {
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
