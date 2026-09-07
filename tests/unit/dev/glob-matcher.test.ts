import { describe, expect, it } from 'vitest'
import { testGlobMatch } from '#shared/utils/dev/glob-matcher'

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
    expect(testGlobMatch('*.ts', 'src/app.ts')).toBe(true)
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
})
