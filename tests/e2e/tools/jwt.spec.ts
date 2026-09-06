import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('decodes JSON Web Tokens', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/jwt')

  const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.G'
  await fillCodeMirror(page, 'JWT', validJwt)
  await page.getByRole('button', { name: 'Decode' }).click()

  const header = page.getByRole('textbox', { name: 'Header' })
  await expect(header).toContainText('"HS256"')

  const payload = page.getByRole('textbox', { name: 'Payload' })
  await expect(payload).toContainText('"John Doe"')
})
