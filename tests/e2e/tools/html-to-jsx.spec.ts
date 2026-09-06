import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('HTML to JSX Converter Tool', () => {
  test('converts HTML to JSX, updates name, and toggles component wrapper', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/html-to-jsx')

    const outputEditor = page.getByRole('textbox', { name: 'Output (JSX)' })

    await test.step('converts sample HTML to JSX component', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(outputEditor).toBeVisible()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export default function UserProfileCard()')
      expect(outputText).toContain('className="card"')
      expect(outputText).toContain('htmlFor="username-input"')
    })

    await test.step('updates component name', async () => {
      const nameInput = page.getByPlaceholder('ComponentName')
      await nameInput.fill('CustomCard')

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export default function CustomCard()')
    })

    await test.step('toggles wrap in component function', async () => {
      await page.getByLabel('Wrap in component function').uncheck()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).not.toContain('export default function')
      expect(outputText).toContain('<div className="card"')
    })
  })
})
