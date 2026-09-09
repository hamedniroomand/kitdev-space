import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates random IDs and tokens', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/generator')

  const list = page.locator('ul.divide-y')
  const getItems = () => list.locator('li')

  await test.step('generates default IDs', async () => {
    await page.getByRole('button', { name: 'Generate' }).click()
    const items = getItems()
    await expect(items.first()).toBeVisible()
    expect(await items.count()).toBeGreaterThan(0)
  })

  await test.step('switches to random string mode with custom length', async () => {
    await page.getByRole('tab', { name: 'Random string' }).click()
    const lengthInput = page.getByRole('spinbutton', { name: 'Length' })
    await lengthInput.fill('16')
    await page.getByRole('button', { name: 'Generate' }).click()

    const text = (await getItems().first().textContent()) ?? ''
    expect(text.trim().length).toBe(16)
  })

  await test.step('excludes ambiguous characters', async () => {
    await page.getByRole('checkbox', { name: /Exclude ambiguous/ }).click()
    await page.getByRole('button', { name: 'Generate' }).click()

    const text = (await getItems().first().textContent()) ?? ''
    expect(text.trim()).not.toMatch(/[0Ol1I]/)
  })

  await test.step('clears generated items', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(list).not.toBeVisible()
  })
})
