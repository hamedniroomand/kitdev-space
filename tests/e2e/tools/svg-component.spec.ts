import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('SVG to React Component Tool', () => {
  test('converts default SVG icon sample and toggles spread props', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/svg-component')

    const outputEditor = page.locator('.cm-editor').nth(1)

    await test.step('converts default SVG icon sample with props spread', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(outputEditor).toBeVisible()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export default function SvgIcon(props)')
      expect(outputText).toContain('{...props}')
      expect(outputText).toContain('strokeWidth="2"')
      expect(outputText).toContain('strokeLinecap="round"')
    })

    await test.step('toggles spread props', async () => {
      await page.getByLabel('Spread props').uncheck()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).not.toContain('{...props}')
      expect(outputText).toContain('export default function SvgIcon()')
    })
  })
})
