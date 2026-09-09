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

  it('escapes and unescapes JavaScript strings including escaped backslashes', () => {
    const raw = 'a\\nb' // literal 'a', '\', 'n', 'b'
    const escaped = escapeString(raw, 'javascript')
    expect(escaped).toBe('a\\\\nb')
    expect(unescapeString(escaped, 'javascript')).toBe(raw)

    const withNewline = 'a\nb'
    expect(unescapeString(escapeString(withNewline, 'javascript'), 'javascript')).toBe(withNewline)
  })
})
