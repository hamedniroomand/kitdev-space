import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates UUIDs', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/uuid')

  const list = page.locator('ul.divide-y')
  const getItems = () => list.locator('li')

  await test.step('generates UUID v4 items', async () => {
    await page.getByRole('button', { name: 'Generate' }).click()
    const items = getItems()
    await expect(items.first()).toBeVisible()
    const text = (await items.first().textContent()) ?? ''
    expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  })

  await test.step('switches to NanoID format', async () => {
    const typeSelect = page.locator('select, [role="combobox"]').first()
    await typeSelect.click()
    await page.getByRole('option', { name: 'NanoID' }).click()
    await page.getByRole('button', { name: 'Generate' }).click()

    const text = (await getItems().first().textContent()) ?? ''
    // NanoID default length is 21
    expect(text.trim()).toMatch(/^[\w-]{21}$/)
  })

  await test.step('clears generated IDs', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(list).not.toBeVisible()
  })
})
