import { expect, test } from '@playwright/test'
import { fillCodeMirror, getCodeMirrorValue, gotoHydrated } from '../utils'

test.describe('CSS Unit Converter tool', () => {
  test('converts CSS units and updates on input change', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/css-units')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default 16px conversions
    await expect(page.locator('main').getByText('1rem', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('1em', { exact: true })).toBeVisible()

    // Change input value to 32
    const input = page.locator('input[type="number"]').first()
    await input.fill('32')

    // Expect updated values
    await expect(page.locator('main').getByText('2rem', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('2em', { exact: true })).toBeVisible()

    // Reset
    await page.getByRole('button', { name: 'Reset Defaults', exact: true }).click()
    await expect(page.locator('main').getByText('1rem', { exact: true })).toBeVisible()
  })

  test('calculates em from the parent font size', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/css-units')

    await page.getByRole('spinbutton', { name: 'Parent Font Size (px)', exact: true }).fill('8')

    await expect(page.locator('main').getByText('1rem', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('2em', { exact: true })).toBeVisible()
  })

  test('converts px lengths of a CSS snippet to rem', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/css-units')

    await fillCodeMirror(page, 'CSS Snippet', '.card { padding: 24px; border: 1px solid; margin: 0px }')

    await expect
      .poll(() => getCodeMirrorValue(page, 'Converted CSS'))
      .toBe('.card { padding: 1.5rem; border: 1px solid; margin: 0 }')
  })
})
