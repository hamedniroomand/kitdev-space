import { expect, test } from '@playwright/test'

test('serves llms.txt with site tools', async ({ request }) => {
  const response = await request.get('/llms.txt')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('text/plain')

  const text = await response.text()
  expect(text).toContain('# KitDev Space')
  expect(text).toContain('## Data Lab')
  expect(text).toContain('## Crypto Lab')
  expect(text).toContain('/hub/data/json-formatter')
})
