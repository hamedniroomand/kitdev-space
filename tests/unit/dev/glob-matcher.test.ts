import { describe, expect, it } from 'vitest'
import { testGlobMatch } from '#shared/utils/dev/glob-matcher'

describe('glob matcher', () => {
  it('matches simple wildcards', () => {
    expect(testGlobMatch('*.ts', 'app.ts')).toBe(true)
    expect(testGlobMatch('*.ts', 'src/app.ts')).toBe(true)
    expect(testGlobMatch('*.ts', 'app.js')).toBe(false)
  })

  it('matches globstar patterns', () => {
    expect(testGlobMatch('src/**/*.vue', 'src/components/Header.vue')).toBe(true)
    expect(testGlobMatch('src/**/*.vue', 'src/Button.vue')).toBe(true)
    expect(testGlobMatch('src/**/*.vue', 'docs/README.md')).toBe(false)
  })

  it('handles negative patterns', () => {
    expect(testGlobMatch('!*.md', 'file.ts')).toBe(true)
    expect(testGlobMatch('!*.md', 'README.md')).toBe(false)
  })
})
