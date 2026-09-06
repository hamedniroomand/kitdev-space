export type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u' | 'y' | 'd'

export interface RegexTokenExplanation {
  token: string
  meaning: string
  index: number
}

export interface RegexGroupMatch {
  name: string | null
  index: number
  value: string | undefined
  start: number | null
  end: number | null
}

export interface RegexMatchResult {
  index: number
  match: string
  start: number
  end: number
  groups: RegexGroupMatch[]
}

export interface RegexHighlightSegment {
  text: string
  matched: boolean
  matchIndex: number | null
}

export interface RegexTestResult {
  pattern: string
  flags: string
  valid: boolean
  error: string | null
  matches: RegexMatchResult[]
  highlights: RegexHighlightSegment[]
  explanations: RegexTokenExplanation[]
}

const FLAG_SET = new Set<RegexFlag>(['g', 'i', 'm', 's', 'u', 'y', 'd'])

export function normalizeRegexFlags(input: string): string {
  const unique = new Set<string>()
  for (const char of input) {
    if (FLAG_SET.has(char as RegexFlag)) {
      unique.add(char)
    }
  }
  return [...unique].sort().join('')
}

export function compileRegex(pattern: string, flagsInput = ''): {
  regex: RegExp | null
  flags: string
  error: string | null
} {
  const flags = normalizeRegexFlags(flagsInput)
  if (!pattern) {
    return { regex: null, flags, error: 'Enter a regular expression.' }
  }

  try {
    const withIndices = flags.includes('d') ? flags : `${flags}d`
    return { regex: new RegExp(pattern, withIndices), flags, error: null }
  } catch (cause) {
    try {
      return { regex: new RegExp(pattern, flags), flags, error: null }
    } catch (inner) {
      const message = inner instanceof Error
        ? inner.message
        : cause instanceof Error
          ? cause.message
          : 'Invalid regular expression.'
      return {
        regex: null,
        flags,
        error: message.replace(/^Invalid regular expression:\s*/i, 'Invalid regular expression.\n\n')
      }
    }
  }
}

function readClass(pattern: string, start: number): { token: string, end: number } {
  let i = start + 1
  if (pattern[i] === '^') {
    i += 1
  }
  while (i < pattern.length) {
    if (pattern[i] === '\\') {
      i += 2
      continue
    }
    if (pattern[i] === ']') {
      return { token: pattern.slice(start, i + 1), end: i + 1 }
    }
    i += 1
  }
  return { token: pattern.slice(start), end: pattern.length }
}

function readGroup(pattern: string, start: number): { token: string, end: number, meaning: string } {
  const rest = pattern.slice(start)
  if (rest.startsWith('(?:')) {
    return { token: '(?:', end: start + 3, meaning: 'Non-capturing group start.' }
  }
  if (rest.startsWith('(?=')) {
    return { token: '(?=', end: start + 3, meaning: 'Positive lookahead. The next text must match, but it is not consumed.' }
  }
  if (rest.startsWith('(?!')) {
    return { token: '(?!', end: start + 3, meaning: 'Negative lookahead. The next text must not match.' }
  }
  if (rest.startsWith('(?<=')) {
    return { token: '(?<=', end: start + 4, meaning: 'Positive lookbehind. The previous text must match.' }
  }
  if (rest.startsWith('(?<!')) {
    return { token: '(?<!', end: start + 4, meaning: 'Negative lookbehind. The previous text must not match.' }
  }
  if (rest.startsWith('(?<')) {
    const close = pattern.indexOf('>', start + 3)
    if (close > start) {
      const name = pattern.slice(start + 3, close)
      return {
        token: pattern.slice(start, close + 1),
        end: close + 1,
        meaning: `Named capturing group "${name}".`
      }
    }
  }
  return { token: '(', end: start + 1, meaning: 'Capturing group start.' }
}

function explainEscape(token: string): string {
  switch (token) {
    case '\\d':
      return 'Digit character (0-9).'
    case '\\D':
      return 'Non-digit character.'
    case '\\w':
      return 'Word character (letter, digit, or underscore).'
    case '\\W':
      return 'Non-word character.'
    case '\\s':
      return 'Whitespace character.'
    case '\\S':
      return 'Non-whitespace character.'
    case '\\b':
      return 'Word boundary.'
    case '\\B':
      return 'Not a word boundary.'
    case '\\n':
      return 'Newline character.'
    case '\\t':
      return 'Tab character.'
    case '\\r':
      return 'Carriage return character.'
    default:
      if (/^\\[1-9]\d*$/.test(token)) {
        return `Backreference to group ${token.slice(1)}.`
      }
      return `Escaped character ${token.slice(1)}.`
  }
}

export function explainRegex(pattern: string): RegexTokenExplanation[] {
  const explanations: RegexTokenExplanation[] = []
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]!
    const index = i

    if (char === '\\' && i + 1 < pattern.length) {
      const token = pattern.slice(i, i + 2)
      explanations.push({ token, meaning: explainEscape(token), index })
      i += 2
      continue
    }

    if (char === '[') {
      const { token, end } = readClass(pattern, i)
      const negated = token.startsWith('[^')
      explanations.push({
        token,
        meaning: negated
          ? 'Negated character class. Matches one character that is not listed.'
          : 'Character class. Matches one character from the listed set.',
        index
      })
      i = end
      continue
    }

    if (char === '(') {
      const group = readGroup(pattern, i)
      explanations.push({ token: group.token, meaning: group.meaning, index })
      i = group.end
      continue
    }

    if (char === ')') {
      explanations.push({ token: ')', meaning: 'Group end.', index })
      i += 1
      continue
    }

    if (char === '{') {
      const close = pattern.indexOf('}', i)
      if (close > i) {
        const token = pattern.slice(i, close + 1)
        explanations.push({
          token,
          meaning: `Quantifier ${token}. Controls how many times the previous item can match.`,
          index
        })
        i = close + 1
        continue
      }
    }

    const map: Record<string, string> = {
      '^': 'Start anchor. Matches the start of the string or line.',
      '$': 'End anchor. Matches the end of the string or line.',
      '.': 'Dot. Matches any character except line breaks, unless the s flag is set.',
      '*': 'Quantifier. Matches the previous item zero or more times.',
      '+': 'Quantifier. Matches the previous item one or more times.',
      '?': 'Quantifier. Matches the previous item zero or one time. After a quantifier, makes it lazy.',
      '|': 'Alternation. Matches the left side or the right side.',
      ']': 'End of a character class (orphan token).'
    }

    if (map[char]) {
      explanations.push({ token: char, meaning: map[char]!, index })
      i += 1
      continue
    }

    explanations.push({
      token: char,
      meaning: `Literal character "${char}".`,
      index
    })
    i += 1
  }

  return explanations
}

function collectMatches(regex: RegExp, sample: string): RegexMatchResult[] {
  const matches: RegexMatchResult[] = []
  const global = regex.global
  regex.lastIndex = 0

  let guard = 0
  while (guard < 10_000) {
    guard += 1
    const result = regex.exec(sample)
    if (!result) {
      break
    }

    const start = result.index
    const end = start + result[0].length
    const groups: RegexGroupMatch[] = []

    for (let i = 1; i < result.length; i += 1) {
      const indices = result.indices?.[i]
      groups.push({
        name: null,
        index: i,
        value: result[i],
        start: indices ? indices[0] : null,
        end: indices ? indices[1] : null
      })
    }

    if (result.groups) {
      for (const [name, value] of Object.entries(result.groups)) {
        const existing = groups.find(group => group.value === value && group.name === null)
        if (existing) {
          existing.name = name
        } else {
          groups.push({
            name,
            index: groups.length + 1,
            value,
            start: null,
            end: null
          })
        }
      }
    }

    matches.push({
      index: matches.length,
      match: result[0],
      start,
      end,
      groups
    })

    if (!global) {
      break
    }
    if (result[0].length === 0) {
      regex.lastIndex += 1
    }
  }

  return matches
}

export function buildHighlights(sample: string, matches: RegexMatchResult[]): RegexHighlightSegment[] {
  if (matches.length === 0) {
    return sample ? [{ text: sample, matched: false, matchIndex: null }] : []
  }

  const segments: RegexHighlightSegment[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({
        text: sample.slice(cursor, match.start),
        matched: false,
        matchIndex: null
      })
    }
    segments.push({
      text: sample.slice(match.start, match.end),
      matched: true,
      matchIndex: match.index
    })
    cursor = match.end
  }

  if (cursor < sample.length) {
    segments.push({
      text: sample.slice(cursor),
      matched: false,
      matchIndex: null
    })
  }

  return segments
}

export function testRegex(pattern: string, sample: string, flagsInput = 'g'): RegexTestResult {
  const { regex, flags, error } = compileRegex(pattern, flagsInput)
  const explanations = explainRegex(pattern)

  if (!regex || error) {
    return {
      pattern,
      flags,
      valid: false,
      error,
      matches: [],
      highlights: sample ? [{ text: sample, matched: false, matchIndex: null }] : [],
      explanations
    }
  }

  const matches = collectMatches(regex, sample)
  return {
    pattern,
    flags,
    valid: true,
    error: null,
    matches,
    highlights: buildHighlights(sample, matches),
    explanations
  }
}
