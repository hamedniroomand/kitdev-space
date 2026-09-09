import { describe, expect, it } from 'vitest'
import { evaluateGlobRules, testGlobMatch } from '#shared/utils/dev/glob-matcher'

describe('testGlobMatch', () => {
  it('matches brace expansion patterns like **/*.{json,md}', () => {
    const pattern = '**/*.{json,md}'
    expect(testGlobMatch(pattern, 'docs/readme.md')).toBe(true)
    expect(testGlobMatch(pattern, 'package.json')).toBe(true)
    expect(testGlobMatch(pattern, 'src/data/config.json')).toBe(true)
    expect(testGlobMatch(pattern, 'src/index.ts')).toBe(false)
  })

  it('matches single star within a segment', () => {
    expect(testGlobMatch('*.ts', 'app.ts')).toBe(true)
    // A standard glob matches the whole path, so `*.ts` stops at the folder separator.
    expect(testGlobMatch('*.ts', 'src/app.ts')).toBe(false)
    expect(testGlobMatch('src/*.ts', 'src/app.ts')).toBe(true)
    expect(testGlobMatch('src/*.ts', 'src/nested/app.ts')).toBe(false)
  })

  it('matches double star across directories', () => {
    expect(testGlobMatch('src/**/*.vue', 'src/components/Header.vue')).toBe(true)
    expect(testGlobMatch('src/**/*.vue', 'src/Button.vue')).toBe(true)
    expect(testGlobMatch('src/**/*.vue', 'tests/Header.vue')).toBe(false)
  })

  it('matches negation pattern', () => {
    expect(testGlobMatch('!tests/**', 'src/app.ts')).toBe(true)
    expect(testGlobMatch('!tests/**', 'tests/unit/app.test.ts')).toBe(false)
  })

  it('matches question mark single character', () => {
    expect(testGlobMatch('file?.txt', 'file1.txt')).toBe(true)
    expect(testGlobMatch('file?.txt', 'file12.txt')).toBe(false)
  })

  it('matches character class ranges [a-z] and negated classes [!0-9]', () => {
    expect(testGlobMatch('file[0-9].txt', 'file3.txt')).toBe(true)
    expect(testGlobMatch('file[0-9].txt', 'filea.txt')).toBe(false)
    expect(testGlobMatch('file[!0-9].txt', 'filea.txt')).toBe(true)
    expect(testGlobMatch('file[!0-9].txt', 'file3.txt')).toBe(false)
    expect(testGlobMatch('*.test.[jt]s', 'app.test.js')).toBe(true)
    expect(testGlobMatch('*.test.[jt]s', 'app.test.ts')).toBe(true)
    expect(testGlobMatch('*.test.[jt]s', 'app.test.css')).toBe(false)
  })

  it('hides dot files from a standard glob and shows them to a gitignore rule', () => {
    expect(testGlobMatch('**/*.log', '.cache/debug.log')).toBe(false)
    expect(testGlobMatch('**/*.log', '.cache/debug.log', 'gitignore')).toBe(true)
  })

  it('matches a gitignore pattern with no slash at any depth', () => {
    expect(testGlobMatch('*.ts', 'src/app.ts', 'gitignore')).toBe(true)
    expect(testGlobMatch('node_modules', 'app/node_modules/pkg/index.js', 'gitignore')).toBe(true)
    expect(testGlobMatch('node_modules', 'src/node_modules_old.ts', 'gitignore')).toBe(false)
  })

  it('anchors a gitignore pattern that starts with a slash', () => {
    expect(testGlobMatch('/build', 'build/app.js', 'gitignore')).toBe(true)
    expect(testGlobMatch('/build', 'src/build/app.js', 'gitignore')).toBe(false)
  })

  it('matches a directory only for a gitignore pattern that ends with a slash', () => {
    expect(testGlobMatch('build/', 'build/app.js', 'gitignore')).toBe(true)
    expect(testGlobMatch('build/', 'build/', 'gitignore')).toBe(true)
    expect(testGlobMatch('build/', 'build', 'gitignore')).toBe(false)
  })

  it('reads braces and extglobs as literal text in a gitignore rule', () => {
    expect(testGlobMatch('*.{json,md}', 'package.json', 'gitignore')).toBe(false)
    expect(testGlobMatch('+(a|b).ts', 'a.ts', 'gitignore')).toBe(false)
    expect(testGlobMatch('+(a|b).ts', 'a.ts', 'minimatch')).toBe(true)
  })

  it('skips a gitignore comment line', () => {
    expect(testGlobMatch('#*.ts', 'app.ts', 'gitignore')).toBe(false)
  })

  it('reads an empty pattern or an empty path as no match', () => {
    expect(testGlobMatch('', 'app.ts')).toBe(false)
    expect(testGlobMatch('*.ts', '   ')).toBe(false)
  })
})

describe('evaluateGlobRules', () => {
  it('lets a later exclude rule override an earlier include rule', () => {
    const [result] = evaluateGlobRules(['src/**/*.ts', '!src/**/*.test.ts'], ['src/app.test.ts'])
    expect(result).toEqual({
      path: 'src/app.test.ts',
      included: false,
      decidedBy: '!src/**/*.test.ts',
      ruleIndex: 1,
    })
  })

  it('lets a later include rule re-include an excluded path', () => {
    const patterns = ['src/**/*.ts', '!src/**/*.test.ts', 'src/keep.test.ts']
    const [result] = evaluateGlobRules(patterns, ['src/keep.test.ts'])
    expect(result).toEqual({
      path: 'src/keep.test.ts',
      included: true,
      decidedBy: 'src/keep.test.ts',
      ruleIndex: 2,
    })
  })

  it('excludes a path that no rule matches', () => {
    const [result] = evaluateGlobRules(['src/**/*.ts'], ['docs/README.md'])
    expect(result).toEqual({
      path: 'docs/README.md',
      included: false,
      decidedBy: null,
      ruleIndex: -1,
    })
  })

  it('keeps the order when a negative pattern comes first', () => {
    const patterns = ['!**/*.test.ts', 'src/**/*.ts']
    expect(evaluateGlobRules(patterns, ['src/app.test.ts', 'docs/a.test.ts'])).toEqual([
      { path: 'src/app.test.ts', included: true, decidedBy: 'src/**/*.ts', ruleIndex: 1 },
      { path: 'docs/a.test.ts', included: false, decidedBy: '!**/*.test.ts', ruleIndex: 0 },
    ])
  })

  it('reports the position of the deciding rule after it skips a blank line', () => {
    const [result] = evaluateGlobRules(['', '  ', 'src/**/*.ts'], ['src/app.ts'])
    expect(result?.ruleIndex).toBe(2)
    expect(result?.decidedBy).toBe('src/**/*.ts')
  })

  it('keeps the other rules when one pattern is malformed', () => {
    const [result] = evaluateGlobRules(['*.ts', '[', '!app.ts'], ['app.ts'])
    expect(result?.included).toBe(false)
    expect(result?.decidedBy).toBe('!app.ts')
  })

  it('evaluates gitignore rules in order', () => {
    const patterns = ['# build output', 'dist/', '!dist/keep.txt']
    expect(evaluateGlobRules(patterns, ['dist/app.js', 'dist/keep.txt', 'src/app.ts'], 'gitignore')).toEqual([
      { path: 'dist/app.js', included: true, decidedBy: 'dist/', ruleIndex: 1 },
      { path: 'dist/keep.txt', included: false, decidedBy: '!dist/keep.txt', ruleIndex: 2 },
      { path: 'src/app.ts', included: false, decidedBy: null, ruleIndex: -1 },
    ])
  })
})
