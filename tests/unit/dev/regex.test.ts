import { describe, expect, it } from 'vitest'
import {
  applyReplacement,
  explainRegex,
  normalizeRegexFlags,
  parseRegexTestCases,
  serializeRegexTestCases,
  testRegex,
} from '#shared/utils/dev/regex'

function replace(pattern: string, sample: string, template: string, flags = 'g'): string {
  return applyReplacement(sample, testRegex(pattern, sample, flags).matches, template)
}

describe('normalizeRegexFlags', () => {
  it('keeps unique supported flags', () => {
    expect(normalizeRegexFlags('gigiu')).toBe('giu')
  })

  it('keeps the v flag and the d flag', () => {
    expect(normalizeRegexFlags('gvdz')).toBe('dgv')
  })
})

describe('explainRegex', () => {
  it('explains classes, quantifiers, and lookarounds', () => {
    const explanations = explainRegex('(?<=@)\\w+\\d*')
    expect(explanations.some(item => item.token === '(?<=' && item.meaning.includes('lookbehind'))).toBe(true)
    expect(explanations.some(item => item.token === '\\w')).toBe(true)
    expect(explanations.some(item => item.token === '+')).toBe(true)
  })
})

describe('testRegex', () => {
  it('matches and reports named groups', () => {
    const result = testRegex('(?<word>[A-Z][a-z]+)', 'Hello world and Kit', 'g')
    expect(result.valid).toBe(true)
    expect(result.matches).toHaveLength(2)
    expect(result.matches[0]?.groups.some(group => group.name === 'word' && group.value === 'Hello')).toBe(true)
  })

  it('correctly maps named groups when matched text is identical to anonymous group', () => {
    const result = testRegex('(x)(?<a>x)', 'xx', 'g')
    expect(result.valid).toBe(true)
    expect(result.matches).toHaveLength(1)
    const groups = result.matches[0]?.groups
    expect(groups).toBeDefined()
    expect(groups?.[0]?.name).toBeNull()
    expect(groups?.[0]?.value).toBe('x')
    expect(groups?.[1]?.name).toBe('a')
    expect(groups?.[1]?.value).toBe('x')
  })

  it('returns a clear error for invalid syntax', () => {
    const result = testRegex('(', 'abc', 'g')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid regular expression')
  })
})

describe('explainRegex unicode properties', () => {
  it('reads a property escape as one token', () => {
    const explanations = explainRegex('\\p{Script=Greek}\\P{L}\\k<a>')
    expect(explanations[0]?.token).toBe('\\p{Script=Greek}')
    expect(explanations[0]?.meaning).toContain('with the property "Script=Greek"')
    expect(explanations[1]?.token).toBe('\\P{L}')
    expect(explanations[1]?.meaning).toContain('without the property "L"')
    expect(explanations[2]?.meaning).toContain('named group "a"')
  })
})

describe('applyReplacement', () => {
  it('substitutes numbered groups', () => {
    expect(replace('(\\w+)@(\\w+)', 'me@host', '$2/$1')).toBe('host/me')
  })

  it('substitutes named groups', () => {
    expect(replace('(?<n>\\d)', 'a1b', '[$<n>]')).toBe('a[1]b')
  })

  it('gives an empty string for an unknown group name', () => {
    expect(replace('(?<n>\\d)', 'a1b', '[$<zz>]')).toBe('a[]b')
  })

  it('keeps $<name> literal when the pattern holds no named group', () => {
    expect(replace('(\\d)', 'a1b', '[$<n>]')).toBe('a[$<n>]b')
  })

  it('substitutes the whole match and an escaped dollar sign', () => {
    expect(replace('(\\d)', 'a1b', '$$-$&-$1')).toBe('a$-1-1b')
  })

  it('keeps an out-of-range group reference literal', () => {
    expect(replace('(\\d)', 'a1b', '$7')).toBe('a$7b')
  })

  it('reads a two-digit group reference', () => {
    expect(replace('(\\d)', 'a1b', '$01')).toBe('a1b')
    expect(replace('(\\d)', 'a1b', '$10')).toBe('a10b')
  })

  it('substitutes the text before and after the match', () => {
    expect(replace('b', 'abc', '$`|$\'')).toBe('aa|cc')
  })

  it('replaces only the first match without the g flag', () => {
    expect(replace('a', 'aaa', 'b', '')).toBe('baa')
  })

  it('returns the sample when nothing matches', () => {
    expect(replace('z', 'abc', 'x')).toBe('abc')
  })
})

describe('parseRegexTestCases', () => {
  it('reads a valid file', () => {
    const json = serializeRegexTestCases({
      pattern: '\\d+',
      flags: 'g',
      cases: [{ text: '42', expectMatch: true }],
    })
    const { file, error } = parseRegexTestCases(json)
    expect(error).toBeNull()
    expect(file?.pattern).toBe('\\d+')
    expect(file?.cases).toEqual([{ text: '42', expectMatch: true }])
  })

  it('reports a malformed file', () => {
    expect(parseRegexTestCases('{ not json').error).toBe('The file is not valid JSON.')
    expect(parseRegexTestCases('[]').error).toBe('The file must hold a JSON object.')
    expect(parseRegexTestCases('{"cases":{}}').error).toBe('The file must hold a "cases" array.')
    expect(parseRegexTestCases('{"cases":[{"text":1,"expectMatch":true}]}').error)
      .toBe('Each test case needs a "text" string and an "expectMatch" boolean.')
    expect(parseRegexTestCases('{"cases":[{"text":"a"}]}').error)
      .toBe('Each test case needs a "text" string and an "expectMatch" boolean.')
  })
})

describe('match indices', () => {
  it('reads group positions only with the d flag', () => {
    expect(testRegex('(a)', 'xax', 'g').matches[0]?.groups[0]?.start).toBeNull()
    expect(testRegex('(a)', 'xax', 'gd').matches[0]?.groups[0]?.start).toBe(1)
    expect(testRegex('(a)', 'xax', 'gd').matches[0]?.groups[0]?.end).toBe(2)
  })
})
