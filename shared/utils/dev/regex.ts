export type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u' | 'v' | 'y' | 'd'

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

export interface RegexTestResult {
  pattern: string
  flags: string
  valid: boolean
  error: string | null
  matches: RegexMatchResult[]
  explanations: RegexTokenExplanation[]
}

const FLAG_SET = new Set<RegexFlag>(['g', 'i', 'm', 's', 'u', 'v', 'y', 'd'])

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

  // The caller sets the d flag to read group positions. The page offers that
  // flag only when the engine supports it, so no fallback is needed here.
  try {
    return { regex: new RegExp(pattern, flags), flags, error: null }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Invalid regular expression.'
    return {
      regex: null,
      flags,
      error: message.replace(/^Invalid regular expression:\s*/i, 'Invalid regular expression.\n\n'),
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
        meaning: `Named capturing group "${name}".`,
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

    if (char === '\\' && (pattern[i + 1] === 'p' || pattern[i + 1] === 'P') && pattern[i + 2] === '{') {
      const close = pattern.indexOf('}', i + 3)
      if (close > i) {
        const property = pattern.slice(i + 3, close)
        const negated = pattern[i + 1] === 'P'
        explanations.push({
          token: pattern.slice(i, close + 1),
          meaning: negated
            ? `Unicode property escape. Matches one character without the property "${property}". Set the u flag or the v flag.`
            : `Unicode property escape. Matches one character with the property "${property}". Set the u flag or the v flag.`,
          index,
        })
        i = close + 1
        continue
      }
    }

    if (char === '\\' && pattern[i + 1] === 'k' && pattern[i + 2] === '<') {
      const close = pattern.indexOf('>', i + 3)
      if (close > i) {
        explanations.push({
          token: pattern.slice(i, close + 1),
          meaning: `Backreference to the named group "${pattern.slice(i + 3, close)}".`,
          index,
        })
        i = close + 1
        continue
      }
    }

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
        index,
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
          index,
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
      ']': 'End of a character class (orphan token).',
    }

    if (map[char]) {
      explanations.push({ token: char, meaning: map[char]!, index })
      i += 1
      continue
    }

    explanations.push({
      token: char,
      meaning: `Literal character "${char}".`,
      index,
    })
    i += 1
  }

  return explanations
}

export function extractGroupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = []
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    if (char === '\\') {
      i += 2
      continue
    }
    if (char === '[') {
      i = readClass(pattern, i).end
      continue
    }
    if (char === '(') {
      const rest = pattern.slice(i)
      if (
        rest.startsWith('(?:')
        || rest.startsWith('(?=')
        || rest.startsWith('(?!')
        || rest.startsWith('(?<=')
        || rest.startsWith('(?<!')
      ) {
        i += rest.startsWith('(?<=') || rest.startsWith('(?<!') ? 4 : 3
        continue
      }
      if (rest.startsWith('(?<')) {
        const close = pattern.indexOf('>', i + 3)
        if (close > i) {
          const name = pattern.slice(i + 3, close)
          names.push(name)
          i = close + 1
          continue
        }
      }
      names.push(null)
      i += 1
      continue
    }
    i += 1
  }
  return names
}

function collectMatches(regex: RegExp, sample: string, pattern = ''): RegexMatchResult[] {
  const matches: RegexMatchResult[] = []
  const global = regex.global
  const groupNames = pattern ? extractGroupNames(pattern) : []
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
        name: groupNames[i - 1] ?? null,
        index: i,
        value: result[i],
        start: indices ? indices[0] : null,
        end: indices ? indices[1] : null,
      })
    }

    // If indices.groups exists, backfill any group names if needed
    const namedIndices = (result.indices as { groups?: Record<string, [number, number]> } | undefined)?.groups
    if (namedIndices) {
      for (const [name, range] of Object.entries(namedIndices)) {
        if (range) {
          const matchingGroup = groups.find(g => g.start === range[0] && g.end === range[1] && g.name === null)
          if (matchingGroup) {
            matchingGroup.name = name
          }
        }
      }
    }

    matches.push({
      index: matches.length,
      match: result[0],
      start,
      end,
      groups,
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

/**
 * Expands one replacement template against one match.
 *
 * It follows the rules of `String.prototype.replace`. A group reference that
 * points past the last group stays literal. `$<name>` stays literal when the
 * pattern holds no named group.
 */
function expandTemplate(template: string, sample: string, match: RegexMatchResult): string {
  const hasNames = match.groups.some(group => group.name !== null)
  let out = ''
  let i = 0

  while (i < template.length) {
    const char = template[i]!
    if (char !== '$' || i + 1 >= template.length) {
      out += char
      i += 1
      continue
    }

    const next = template[i + 1]!

    if (next === '$') {
      out += '$'
      i += 2
      continue
    }
    if (next === '&') {
      out += match.match
      i += 2
      continue
    }
    if (next === '`') {
      out += sample.slice(0, match.start)
      i += 2
      continue
    }
    if (next === '\'') {
      out += sample.slice(match.end)
      i += 2
      continue
    }
    if (next === '<' && hasNames) {
      const close = template.indexOf('>', i + 2)
      if (close > i) {
        const name = template.slice(i + 2, close)
        out += match.groups.find(group => group.name === name)?.value ?? ''
        i = close + 1
        continue
      }
    }
    if (next >= '0' && next <= '9') {
      const two = Number(template.slice(i + 1, i + 3))
      if (template.length > i + 2 && Number.isInteger(two) && two >= 1 && two <= match.groups.length) {
        out += match.groups[two - 1]?.value ?? ''
        i += 3
        continue
      }
      const one = Number(next)
      if (one >= 1 && one <= match.groups.length) {
        out += match.groups[one - 1]?.value ?? ''
        i += 2
        continue
      }
    }

    out += char
    i += 1
  }

  return out
}

/**
 * Builds the replacement preview from matches that are already collected.
 *
 * It reads the matches, so the pattern never runs again. This keeps every
 * regular expression inside the worker.
 *
 * ponytail: `collectMatches` stops after 10,000 matches, so the preview
 * leaves later matches unchanged. Raise the guard in `collectMatches` and
 * stream the result if a user ever needs more.
 */
export function applyReplacement(
  sample: string,
  matches: RegexMatchResult[],
  template: string,
): string {
  if (matches.length === 0) {
    return sample
  }

  let out = ''
  let cursor = 0

  for (const match of matches) {
    if (match.start < cursor) {
      continue
    }
    out += sample.slice(cursor, match.start)
    out += expandTemplate(template, sample, match)
    cursor = match.end
  }

  return out + sample.slice(cursor)
}

export interface RegexTestCase {
  text: string
  expectMatch: boolean
}

export interface RegexTestCaseFile {
  pattern: string
  flags: string
  cases: RegexTestCase[]
}

export function serializeRegexTestCases(file: RegexTestCaseFile): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

/** Reads a dropped test case file. It never throws. */
export function parseRegexTestCases(json: string): {
  file: RegexTestCaseFile | null
  error: string | null
} {
  let data: unknown
  try {
    data = JSON.parse(json)
  }
  catch {
    return { file: null, error: 'The file is not valid JSON.' }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { file: null, error: 'The file must hold a JSON object.' }
  }

  const record = data as Record<string, unknown>
  if (!Array.isArray(record.cases)) {
    return { file: null, error: 'The file must hold a "cases" array.' }
  }

  const cases: RegexTestCase[] = []
  for (const entry of record.cases) {
    if (
      typeof entry !== 'object'
      || entry === null
      || typeof (entry as RegexTestCase).text !== 'string'
      || typeof (entry as RegexTestCase).expectMatch !== 'boolean'
    ) {
      return {
        file: null,
        error: 'Each test case needs a "text" string and an "expectMatch" boolean.',
      }
    }
    cases.push({
      text: (entry as RegexTestCase).text,
      expectMatch: (entry as RegexTestCase).expectMatch,
    })
  }

  return {
    file: {
      pattern: typeof record.pattern === 'string' ? record.pattern : '',
      flags: typeof record.flags === 'string' ? normalizeRegexFlags(record.flags) : '',
      cases,
    },
    error: null,
  }
}

export interface RegexSyntaxNote {
  title: string
  syntax: string
  meaning: string
  example: string
}

/** Modern syntax that the browser engine supports. */
export const REGEX_SYNTAX_NOTES: RegexSyntaxNote[] = [
  {
    title: 'Unicode properties',
    syntax: '\\p{…} and \\P{…}',
    meaning: 'Matches one character by a Unicode property. Set the u flag or the v flag.',
    example: '\\p{Script=Greek} matches α',
  },
  {
    title: 'Lookbehind',
    syntax: '(?<=…) and (?<!…)',
    meaning: 'Tests the text before the current position. The engine does not consume that text.',
    example: '(?<=\\$)\\d+ matches 42 in $42',
  },
  {
    title: 'Named groups',
    syntax: '(?<name>…)',
    meaning: 'Gives a name to a capture group. Read the group back with \\k<name> or $<name>.',
    example: '(?<year>\\d{4}) captures 2026',
  },
]

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
      explanations,
    }
  }

  const matches = collectMatches(regex, sample, pattern)
  return {
    pattern,
    flags,
    valid: true,
    error: null,
    matches,
    explanations,
  }
}
