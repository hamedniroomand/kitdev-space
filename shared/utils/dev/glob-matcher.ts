import picomatch from 'picomatch/posix'

export type GlobFlavor = 'standard' | 'gitignore' | 'minimatch'

export const GLOB_FLAVORS: { label: string, value: GlobFlavor }[] = [
  { label: 'Standard glob', value: 'standard' },
  { label: '.gitignore', value: 'gitignore' },
  { label: 'minimatch', value: 'minimatch' },
]

/**
 * `windows: false` pins the POSIX separator, so the result is the same on every operating system.
 * `posix: true` makes `[!0-9]` a negated bracket. Without it picomatch reads the `!` as a literal.
 */
const BASE_OPTIONS = { windows: false, posix: true }

/** Git reads a pattern with fnmatch(3). It expands no braces and no extglobs, and it hides no dot files. */
const GITIGNORE_OPTIONS = { ...BASE_OPTIONS, dot: true, nobrace: true, noextglob: true }

interface GlobRule {
  raw: string
  index: number
  negated: boolean
  isMatch: (path: string) => boolean
}

export interface GlobRuleDecision {
  path: string
  included: boolean
  /** The pattern that decided the result. It is `null` when no pattern matched. */
  decidedBy: string | null
  /** The position of the deciding pattern in the input list. It is `-1` when no pattern matched. */
  ruleIndex: number
}

/**
 * Build a `.gitignore` matcher.
 *
 * A pattern with no slash matches at any depth. A leading slash anchors the pattern to the root.
 * A trailing slash matches a directory only. Git tests the path and each parent folder of the
 * path, so an ignored folder also ignores its content.
 */
function gitignoreMatcher(pattern: string): (path: string) => boolean {
  const directoryOnly = pattern.endsWith('/')
  const body = directoryOnly ? pattern.slice(0, -1) : pattern
  const anchored = body.includes('/')
  const isMatch = picomatch(anchored ? body.replace(/^\/+/, '') : `**/${body}`, GITIGNORE_OPTIONS)

  return (path) => {
    const clean = path.replace(/\/+$/, '')
    const endsWithSlash = path !== clean
    const parts = clean.split('/')

    for (let depth = parts.length; depth > 0; depth--) {
      // The tool has no filesystem. A prefix is a directory when the path continues after it,
      // or when the user wrote a trailing slash.
      const isDirectory = depth < parts.length || endsWithSlash
      if (directoryOnly && !isDirectory) {
        continue
      }
      if (isMatch(parts.slice(0, depth).join('/'))) {
        return true
      }
    }

    return false
  }
}

function compileRule(raw: string, index: number, flavor: GlobFlavor): GlobRule | null {
  const trimmed = raw.trim()
  if (!trimmed || (flavor === 'gitignore' && trimmed.startsWith('#'))) {
    return null
  }

  const negated = trimmed.startsWith('!')
  const body = negated ? trimmed.slice(1) : trimmed
  if (!body) {
    return null
  }

  try {
    return {
      raw: trimmed,
      index,
      negated,
      isMatch: flavor === 'gitignore' ? gitignoreMatcher(body) : picomatch(body, BASE_OPTIONS),
    }
  }
  catch {
    return null
  }
}

/** Test one pattern against one path. A leading `!` inverts the result. */
export function testGlobMatch(pattern: string, path: string, flavor: GlobFlavor = 'standard'): boolean {
  const rule = compileRule(pattern, 0, flavor)
  const clean = path.trim()
  if (!rule || !clean) {
    return false
  }
  return rule.negated ? !rule.isMatch(clean) : rule.isMatch(clean)
}

/**
 * Test ordered patterns against paths.
 *
 * The tool reads the patterns from the top down and keeps the order the user wrote. The last
 * pattern that matches decides the result. A pattern with a leading `!` excludes the path. A path
 * that no pattern matches is excluded.
 */
export function evaluateGlobRules(
  patterns: string[],
  paths: string[],
  flavor: GlobFlavor = 'standard',
): GlobRuleDecision[] {
  const rules = patterns
    .map((raw, index) => compileRule(raw, index, flavor))
    .filter((rule): rule is GlobRule => rule !== null)

  return paths.map((path) => {
    let decided: GlobRule | null = null
    for (const rule of rules) {
      if (rule.isMatch(path)) {
        decided = rule
      }
    }

    return {
      path,
      included: decided ? !decided.negated : false,
      decidedBy: decided ? decided.raw : null,
      ruleIndex: decided ? decided.index : -1,
    }
  })
}
