import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('HTML & SVG to JSX / Vue Tool', () => {
  test('converts HTML and SVG to multiple frameworks and clears', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/html-converter')

    const outputEditor = page.getByRole('textbox', { name: /Output/ })

    await test.step('converts default HTML card sample to JSX', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(outputEditor).toBeVisible()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export default function UserProfileCard()')
      expect(outputText).toContain('className="card"')
      expect(outputText).toContain('htmlFor="username-input"')
    })

    await test.step('switches target format to Vue Template and Vue SFC', async () => {
      await page.getByRole('button', { name: 'Vue Template' }).click()
      let outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('class="card"')
      expect(outputText).not.toContain('<template>')

      await page.getByRole('button', { name: 'Vue SFC' }).click()
      outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('<template>')
      expect(outputText).toContain('class="card"')
      expect(outputText).toContain('</template>')
    })

    await test.step('loads SVG sample', async () => {
      await page.getByRole('button', { name: 'SVG Icon' }).click()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export default function SvgIcon(props)')
      expect(outputText).toContain('{...props}')
      expect(outputText).toContain('strokeWidth="2"')
    })

    await test.step('clears input and output', async () => {
      const inputEditor = page.getByRole('textbox', { name: 'HTML Source' })

      await page.getByRole('button', { name: 'Clear' }).click()

      expect((await inputEditor.textContent()) ?? '').toBe('')
      expect((await outputEditor.textContent()) ?? '').toBe('')
    })
  })
})
