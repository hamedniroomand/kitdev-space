import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates Tailwind shades and configuration code', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/tailwind-shades')

  const output = page.getByRole('textbox', { name: 'Configuration Code' })

  await test.step('generates default brand palette configuration', async () => {
    await expect(output).toBeVisible()
    await expect(output).toContainText('--color-brand-500: #3b82f6')
  })

  await test.step('copies the whole scale as JSON', async () => {
    await expect(page.getByRole('button', { name: 'Copy all as CSS variables' })).toBeVisible()
    await page.getByRole('button', { name: 'Copy all as JSON' }).click()

    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  })

  await test.step('updates scale from preset button', async () => {
    await page.getByRole('button', { name: 'Emerald' }).click()
    await expect(output).toContainText('--color-brand-500: #10b981')
  })

  await test.step('updates token name and switches format to Tailwind v3', async () => {
    const tokenInput = page.getByPlaceholder('e.g. brand, primary, accent')
    await tokenInput.fill('accent')
    await page.getByRole('button', { name: 'Tailwind v3 (config)' }).click()

    await expect(output).toContainText('\'accent\': {')
    await expect(output).toContainText('\'500\': \'#10b981\'')
  })

  await test.step('moves the base color to another shade step', async () => {
    await page.getByRole('combobox', { name: 'Base shade' }).click()
    await page.getByRole('option', { name: '800', exact: true }).click()

    await expect(output).toContainText('\'800\': \'#10b981\'')
  })

  await test.step('keeps a shade override when the format changes', async () => {
    await page.getByLabel('Override shade 700').fill('#ff0000')
    await expect(output).toContainText('\'700\': \'#ff0000\'')

    await page.getByRole('button', { name: 'CSS Variables', exact: true }).click()
    await expect(output).toContainText('--accent-700: #ff0000')
  })
})
