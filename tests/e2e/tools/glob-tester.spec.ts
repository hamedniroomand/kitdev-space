import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

async function selectFlavor(page: Page, flavor: string) {
  await page.getByRole('combobox', { name: 'Matcher flavor' }).click()
  await page.getByRole('option', { name: flavor, exact: true }).click()
}

test.describe('Glob Tester tool', () => {
  test('evaluates ordered patterns and names the deciding rule', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/glob-tester')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const results = page.getByLabel('Match results')
    const patterns = page.getByRole('textbox', { name: 'Patterns (one per line, in order)' })

    await test.step('shows the rule that decided each default path', async () => {
      await expect(page.locator('main').getByText('3 of 9 included')).toBeVisible()
      await expect(results.getByText('Rule 1: src/**/*.ts').first()).toBeVisible()
      await expect(results.getByText('Rule 3: !src/**/*.test.ts')).toBeVisible()
      await expect(results.getByText('No rule matched').first()).toBeVisible()
    })

    await test.step('applies a preset', async () => {
      await page.getByRole('button', { name: 'Configs and docs' }).click()
      await expect(page.locator('main').getByText('2 of 9 included')).toBeVisible()
      await expect(results.getByText('Rule 1: **/*.{json,md}').first()).toBeVisible()
    })

    await test.step('lets a later rule override an earlier rule', async () => {
      await patterns.fill('**/*.ts\n!**/*.test.ts\nsrc/utils/math.test.ts')
      await expect(page.locator('main').getByText('3 of 9 included')).toBeVisible()
      await expect(results.getByText('Rule 3: src/utils/math.test.ts')).toBeVisible()
    })

    await test.step('changes the result with the matcher flavor', async () => {
      await patterns.fill('# build output\ndist/\n*.log')
      await selectFlavor(page, 'Standard glob')
      await expect(page.locator('main').getByText('0 of 9 included')).toBeVisible()

      await selectFlavor(page, '.gitignore')
      await expect(page.locator('main').getByText('2 of 9 included')).toBeVisible()
      await expect(results.getByText('Rule 2: dist/')).toBeVisible()
      await expect(results.getByText('Rule 3: *.log')).toBeVisible()
    })
  })
})
