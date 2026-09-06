import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('HTML & SVG to JSX / Vue Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/html-converter')
  })

  test('converts default HTML card sample to JSX', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('export default function UserProfileCard()')
    expect(outputText).toContain('className="card"')
    expect(outputText).toContain('htmlFor="username-input"')
  })

  test('switches target format to Vue Template and Vue SFC', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    // Switch to Vue Template
    await page.getByRole('button', { name: 'Vue Template' }).click()
    let outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('class="card"')
    expect(outputText).not.toContain('<template>')

    // Switch to Vue SFC
    await page.getByRole('button', { name: 'Vue SFC' }).click()
    outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('<template>')
    expect(outputText).toContain('class="card"')
    expect(outputText).toContain('</template>')
  })

  test('loads SVG sample', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    await page.getByRole('button', { name: 'SVG Icon' }).click()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('export default function SvgIcon(props)')
    expect(outputText).toContain('{...props}')
    expect(outputText).toContain('strokeWidth="2"')
  })

  test('clears input and output', async ({ page }) => {
    const inputEditor = page.locator('.cm-editor').first()
    const outputEditor = page.locator('.cm-editor').nth(1)

    await page.getByRole('button', { name: 'Clear' }).click()

    const inputLines = inputEditor.locator('.cm-line')
    expect(await inputLines.count()).toBe(1)
    expect((await inputLines.first().textContent()) ?? '').toBe('')

    const outputLines = outputEditor.locator('.cm-line')
    expect(await outputLines.count()).toBe(1)
    expect((await outputLines.first().textContent()) ?? '').toBe('')
  })
})
