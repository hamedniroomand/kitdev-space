import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('SVG to React Component Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/svg-component')
  })

  test('converts default SVG icon sample with props spread', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('export default function SvgIcon(props)')
    expect(outputText).toContain('{...props}')
    expect(outputText).toContain('strokeWidth="2"')
    expect(outputText).toContain('strokeLinecap="round"')
  })

  test('toggles spread props', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    // Uncheck spread props
    await page.getByLabel('Spread props').uncheck()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).not.toContain('{...props}')
    expect(outputText).toContain('export default function SvgIcon()')
  })
})
