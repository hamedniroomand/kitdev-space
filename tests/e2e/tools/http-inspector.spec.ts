import { expect, test } from '@playwright/test'
import httpInspectorFixture from '../fixtures/http-inspector.json' with { type: 'json' }
import { fillCodeMirror, gotoHydrated } from '../utils'

/** A prior report where the CSP finding was still a problem. */
const priorReport = {
  tool: 'http-inspector',
  checkedAt: '2026-01-01T00:00:00.000Z',
  requestedUrl: 'https://example.com',
  finalUrl: 'https://example.com',
  method: 'HEAD',
  requestOrigin: null,
  status: 200,
  statusText: 'OK',
  headers: {},
  hops: [],
  security: {
    score: 40,
    grade: 'F',
    findings: [
      {
        id: 'hsts',
        level: 'error',
        header: 'Strict-Transport-Security',
        title: 'HSTS is missing',
        detail: 'No Strict-Transport-Security header was returned.',
        fix: 'Add Strict-Transport-Security.',
        present: false,
        value: null,
      },
    ],
    cors: {
      allowOrigin: null,
      allowMethods: null,
      allowHeaders: null,
      allowCredentials: null,
      exposeHeaders: null,
      maxAge: null,
      findings: [],
    },
  },
}

test.describe('HTTP Inspector tool', () => {
  test('inspects headers and security policy with mock response', { tag: '@smoke' }, async ({ page }) => {
    // Mock the HTTP inspect API endpoint
    await page.route('/api/network/headers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(httpInspectorFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/http-inspector')

    const input = page.locator('main').getByPlaceholder('https://example.com')
    await input.fill('https://example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.locator('main').getByText('59/100 · Grade D')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('main').getByText('CSP is missing')).toBeVisible()

    // NET-12: the findings sit in severity groups.
    await expect(page.locator('main').getByText('Critical', { exact: true })).toBeVisible()

    // NET-13: the report goes out as a JSON file.
    await expect(page.locator('main').getByRole('button', { name: 'Download JSON result file' })).toBeVisible()

    // Switch to Headers tab
    await page.locator('main').getByRole('tab', { name: 'Headers' }).click()
    await expect(page.locator('main').getByText('text/html; charset=utf-8')).toBeVisible()

    // Switch to Redirects tab
    await page.locator('main').getByRole('tab', { name: 'Redirects' }).click()
    await expect(page.locator('main').getByRole('cell', { name: 'https://example.com' })).toBeVisible()
    // NET-17: each hop shows its own time.
    await expect(page.locator('main').getByRole('columnheader', { name: 'Time' })).toBeVisible()

    // NET-14: a prior report gives the added, resolved, and modified findings.
    await page.locator('main').getByRole('tab', { name: 'Compare' }).click()
    await fillCodeMirror(page, 'Prior report', JSON.stringify(priorReport))
    await expect(page.locator('main').getByText('Resolved', { exact: true })).toBeVisible()
  })

  test('sends the preflight method with the request Origin', async ({ page }) => {
    let body: Record<string, unknown> = {}

    await page.route('/api/network/headers', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(httpInspectorFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/http-inspector')

    await page.locator('main').getByPlaceholder('https://example.com').fill('https://example.com')
    await page.locator('main').getByPlaceholder('https://app.example.com').fill('https://app.example.com')
    await page.getByRole('combobox', { name: 'Request Method' }).click()
    await page.getByRole('option', { name: 'DELETE', exact: true }).click()
    await page.locator('main').getByRole('switch').click()
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.locator('main').getByText('59/100 · Grade D')).toBeVisible({ timeout: 10_000 })
    expect(body).toMatchObject({ method: 'OPTIONS', requestMethod: 'DELETE' })
  })
})
