import { describe, expect, it } from 'vitest'
import { escapeString, unescapeString } from '#shared/utils/dev/string-escape'

describe('string escape utility', () => {
  it('escapes and unescapes JSON strings', () => {
    const raw = 'Hello "World"\nNew line'
    const escaped = escapeString(raw, 'json')
    expect(escaped).toBe('Hello \\"World\\"\\nNew line')
    expect(unescapeString(escaped, 'json')).toBe(raw)
  })

  it('escapes and unescapes SQL single quotes', () => {
    const raw = 'O\'Reilly & Associates'
    const escaped = escapeString(raw, 'sql')
    expect(escaped).toBe('O\'\'Reilly & Associates')
    expect(unescapeString(escaped, 'sql')).toBe(raw)
  })

  it('escapes and unescapes HTML entities', () => {
    const raw = '<script>alert("XSS")</script>'
    const escaped = escapeString(raw, 'html')
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    expect(unescapeString(escaped, 'html')).toBe(raw)
  })
})
