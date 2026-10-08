import { expect, test } from '@playwright/test'
import { tools } from '../../shared/utils/tools'

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

test('serves tools.json for every registry tool', async ({ request }) => {
  const response = await request.get('/tools.json')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('application/json')

  const body = await response.json()
  expect(body.version).toBe(1)
  expect(body.tools).toHaveLength(tools.length)
  expect(body.tools.some((tool: { route: string }) => tool.route === '/hub/data/json-formatter')).toBe(true)
})

test('serves markdown docs for a tool page', async ({ request }) => {
  const response = await request.get('/hub/data/json-formatter.md')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('text/markdown')
  const text = await response.text()
  expect(text).toContain('# JSON Formatter')
  expect(text).toContain('https://kitdev.space/hub/data/json-formatter')
})
