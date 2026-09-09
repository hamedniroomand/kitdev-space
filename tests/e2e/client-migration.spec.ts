import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from './utils'

/**
 * These tests prove that the migrated work stays in the browser.
 *
 * A unit test cannot prove it. Vitest runs in the node environment, so an
 * import of `confbox` or `csso` there says nothing about the client bundle.
 * Only a real page load shows that the lazy chunk arrives and that no request
 * reaches the server route. The per-tool specs check the output; these check
 * that the network stays quiet.
 */

/** Records every request to a server route, so a test can assert none happened. */
function watchRoute(page: import('@playwright/test').Page, route: string): string[] {
  const calls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes(route)) {
      calls.push(request.url())
    }
  })
  return calls
}

test('converts JSON to YAML in the browser, with no server call', async ({ page }) => {
  const calls = watchRoute(page, '/api/data/transform')
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  await fillCodeMirror(page, 'Input', '{"name":"KitDev","ready":true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('name: KitDev')
  expect(calls).toEqual([])
})

test('converts JSON to TOML in the browser, with no server call', async ({ page }) => {
  const calls = watchRoute(page, '/api/data/transform')
  await gotoHydrated(page, '/hub/data/converters/json-toml')

  await fillCodeMirror(page, 'Input', '{"name":"KitDev","meta":{"version":1}}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('name = "KitDev"')
  await expect(output).toContainText('[meta]')
  expect(calls).toEqual([])
})

test('converts XML in the browser with DOMParser', async ({ page }) => {
  const calls = watchRoute(page, '/api/data/transform')
  await gotoHydrated(page, '/hub/data/converters/json-xml')

  await fillCodeMirror(page, 'Input', '{"name":"KitDev"}')
  await page.getByRole('button', { name: 'Convert' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('KitDev')
  expect(calls).toEqual([])
})

test('minifies CSS in the browser, with no server call', async ({ page }) => {
  const calls = watchRoute(page, '/api/dev/code-format')
  await gotoHydrated(page, '/hub/dev/code-minifier')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'CSS', exact: true }).click()
  await fillCodeMirror(page, 'Input', 'body { color: red; }')
  await page.getByRole('button', { name: 'Minify' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('body{color:red}')
  expect(calls).toEqual([])
})

test('bumps a semver version in the browser, with no server call', async ({ page }) => {
  const calls = watchRoute(page, '/api/dev/semver')
  await gotoHydrated(page, '/hub/dev/semver')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'Bump version', exact: true }).click()
  await page.getByRole('button', { name: 'Run' }).click()

  await expect(page.getByRole('textbox', { name: 'Result' })).toContainText('1.2.4')
  expect(calls).toEqual([])
})

/**
 * `useImage` calls `new Image()`, so it must not run during the server render.
 * The page uses `immediate: false` and relies on the watcher inside `useImage`.
 * A wrong fix here shows no error — it shows no preview.
 */
test('hashes MD5 in the browser, with no server call', async ({ page }) => {
  const calls = watchRoute(page, '/api/crypto/hash')
  await gotoHydrated(page, '/hub/crypto/hash-generator')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'MD5 (Legacy)' }).click()
  await fillCodeMirror(page, 'Input', 'hello')
  await page.getByRole('button', { name: 'Hash' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' }))
    .toContainText('5d41402abc4b2a76b9719d911017c592')
  expect(calls).toEqual([])
})

test('shows image dimensions from the client-only preview', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))

  await gotoHydrated(page, '/hub/image/base64')
  await page.getByRole('button', { name: 'Load Sample' }).click()

  await expect(page.getByText('32 × 32 px')).toBeVisible()
  expect(pageErrors).toEqual([])
})
