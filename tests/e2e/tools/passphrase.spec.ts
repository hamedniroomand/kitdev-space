import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates diceware passphrases', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/passphrase')

  const list = page.locator('ul.divide-y')
  const getItems = () => list.locator('li')

  await test.step('generates default 6-word hyphen-separated passphrases', async () => {
    await page.getByRole('button', { name: 'Generate' }).click()
    const items = getItems()
    await expect(items.first()).toBeVisible()
    expect(await items.count()).toBeGreaterThan(0)
    const text = (await items.first().textContent()) ?? ''
    const parts = text.trim().split('-')
    expect(parts.length).toBe(6)
  })

  await test.step('updates separator and regenerates', async () => {
    const sepInput = page.getByRole('textbox', { name: 'Separator' })
    await sepInput.fill('.')
    await page.getByRole('button', { name: 'Generate' }).click()

    const text = (await getItems().first().textContent()) ?? ''
    expect(text).toContain('.')
    expect(text).not.toContain('-')
  })

  await test.step('clears generated passphrases', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(list).not.toBeVisible()
  })
})
