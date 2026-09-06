import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('cURL to Code Converter Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/curl-converter')
  })

  test('converts default sample cURL to Fetch code', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Output editor should contain fetch conversion
    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('fetch("https://api.example.com/v1/users"')
    expect(outputText).toContain('method: "POST"')
    expect(outputText).toContain('"Content-Type": "application/json"')
  })

  test('switches target language to Axios and Python', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    // Switch to Axios
    await page.getByRole('button', { name: 'Axios', exact: true }).click()
    let outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('axios({')
    expect(outputText).toContain('https://api.example.com/v1/users')

    // Switch to Python Requests
    await page.getByRole('button', { name: 'Python Requests' }).click()
    outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('requests.post(')
    expect(outputText).toContain('url = "https://api.example.com/v1/users"')
  })

  test('loads GET sample and updates conversion', async ({ page }) => {
    const outputEditor = page.locator('.cm-editor').nth(1)

    await page.getByRole('button', { name: 'Load GET Sample' }).click()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('api.example.com/v1/items?limit=10')
  })

  test('clears input and output', async ({ page }) => {
    const inputEditor = page.locator('.cm-editor').first()
    const outputEditor = page.locator('.cm-editor').nth(1)

    await page.getByRole('button', { name: 'Clear' }).click()

    const inputLines = inputEditor.locator('.cm-line')
    expect(await inputLines.count()).toBe(1)
    const inputLineText = (await inputLines.first().textContent()) ?? ''
    expect(inputLineText.replace('Paste curl command here...', '').trim()).toBe('')

    const outputLines = outputEditor.locator('.cm-line')
    expect(await outputLines.count()).toBe(1)
    const outputLineText = (await outputLines.first().textContent()) ?? ''
    expect(outputLineText.replace('Converted code appears here...', '').trim()).toBe('')
  })
})
