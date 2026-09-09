import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { dropFile, gotoHydrated } from '../utils'

async function selectOption(page: Page, field: string, option: string) {
  await page.getByRole('combobox', { name: field }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.describe('Code Minifier and Beautifier Tool', () => {
  test('minifies, beautifies, and clears code editors', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/code-minifier')

    const outputEditor = page.getByRole('textbox', { name: 'Output' })

    await test.step('minifies JavaScript sample', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Minify' }).click()
      await expect(outputEditor).toBeVisible()
      await expect(async () => {
        const outputText = (await outputEditor.textContent()) ?? ''
        expect(outputText).toContain('function ')
        expect(outputText).toContain('console.log')
      }).toPass({ timeout: 10_000 })
    })

    await test.step('shows the raw and the gzipped byte counts', async () => {
      await expect(page.getByLabel('Raw output bytes')).toBeVisible()
      await expect(page.getByLabel('Gzipped output bytes')).toBeVisible()
      await expect(page.getByLabel('Size change')).toBeVisible()
    })

    await test.step('beautifies minified code', async () => {
      await selectOption(page, 'Action', 'Beautify')

      const beautifyBtn = page.getByRole('button', { name: 'Beautify' })
      await expect(beautifyBtn).toBeVisible()
      await beautifyBtn.click()
      await expect(outputEditor).toBeVisible()

      await expect(async () => {
        const outputText = (await outputEditor.textContent()) ?? ''
        expect(outputText).toContain('greet("world")')
      }).toPass({ timeout: 10_000 })
    })

    await test.step('clears input and output', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()

      const inputEditor = page.getByRole('textbox', { name: 'Input' })
      const inputText = (await inputEditor.textContent()) ?? ''
      expect(inputText.replace('Paste code here, or drop a file', '').trim()).toBe('')

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText.replace('Result appears here', '').trim()).toBe('')
    })
  })

  test('names the download after the dropped file', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/code-minifier')

    const input = page.getByRole('textbox', { name: 'Input' })
    const download = page.getByRole('button', { name: 'Download' })

    await test.step('minifies app.js into app.min.js', async () => {
      await dropFile(page, '.tool-editor', {
        name: 'app.js',
        mimeType: 'text/javascript',
        content: 'const total = 1 + 2;\nconsole.log(total);\n',
      })
      await expect(input).toContainText('console.log(total)')

      await page.getByRole('button', { name: 'Minify' }).click()
      await expect(download).toBeEnabled()

      const started = page.waitForEvent('download')
      await download.click()
      expect((await started).suggestedFilename()).toBe('app.min.js')
    })

    await test.step('beautifies app.min.js into app.pretty.js', async () => {
      await dropFile(page, '.tool-editor', {
        name: 'app.min.js',
        mimeType: 'text/javascript',
        content: 'const total=1+2;console.log(total);',
      })
      await expect(input).toContainText('const total=1+2')

      await selectOption(page, 'Action', 'Beautify')
      await page.getByRole('button', { name: 'Beautify' }).click()
      await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('const total = 1 + 2;')
      await expect(download).toBeEnabled()

      const started = page.waitForEvent('download')
      await download.click()
      expect((await started).suggestedFilename()).toBe('app.pretty.js')
    })
  })

  test('formats SQL in the browser', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/code-minifier')

    await selectOption(page, 'Language', 'SQL')
    await page.getByRole('button', { name: 'Beautify' }).click()

    const outputEditor = page.getByRole('textbox', { name: 'Output' })
    await expect(outputEditor).toContainText('SELECT')
    await expect(outputEditor).toContainText('ORDER BY')
  })
})
