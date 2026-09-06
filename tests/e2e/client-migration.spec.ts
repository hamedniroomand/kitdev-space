import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

/**
 * These tests prove that the migrated work stays in the browser.
 *
 * A unit test cannot prove it. Vitest runs in the node environment, so an
 * import of `csso` there says nothing about the client bundle. Only a real
 * page load shows that the lazy chunk arrives and that no request reaches the
 * server route.
 */

test('minifies CSS in the browser, with no server call', async ({ page }) => {
  const serverCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/dev/code-format')) {
      serverCalls.push(request.url())
    }
  })

  await gotoHydrated(page, '/hub/dev/code-minifier')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'CSS', exact: true }).click()
  await page.getByRole('textbox', { name: 'Input' }).fill('body { color: red; }')
  await page.getByRole('button', { name: 'Minify' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('body{color:red}', { timeout: 10_000 })
  expect(serverCalls).toEqual([])
})

test('converts JSON to YAML in the browser, with no server call', async ({ page }) => {
  const serverCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/data/transform')) {
      serverCalls.push(request.url())
    }
  })

  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  await page.getByRole('textbox', { name: 'Input' }).fill('{"name":"KitDev","ready":true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('name: KitDev', { timeout: 10_000 })
  expect(serverCalls).toEqual([])
})

test('bumps a semver version in the browser, with no server call', async ({ page }) => {
  const serverCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/dev/semver')) {
      serverCalls.push(request.url())
    }
  })

  await gotoHydrated(page, '/hub/dev/semver')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: 'Bump version', exact: true }).click()
  await page.getByRole('button', { name: 'Run' }).click()

  await expect(page.getByRole('textbox', { name: 'Result' })).toContainText('1.2.4', { timeout: 10_000 })
  expect(serverCalls).toEqual([])
})
