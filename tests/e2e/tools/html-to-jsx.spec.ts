import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('HTML to JSX Converter Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/html-to-jsx')
  })

  test('converts sample HTML to JSX component', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('export default function UserProfileCard()')
    expect(outputText).toContain('className="card"')
    expect(outputText).toContain('htmlFor="username-input"')
  })

  test('toggles wrap in component function', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    // Uncheck wrap component
    await page.getByLabel('Wrap in component function').uncheck()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).not.toContain('export default function')
    expect(outputText).toContain('<div className="card"')
  })

  test('updates component name', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    const nameInput = page.getByPlaceholder('ComponentName')
    await nameInput.fill('CustomCard')

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('export default function CustomCard()')
  })
})
