import { describe, expect, it } from 'vitest'
import { resolveEditorLanguage } from '#shared/utils/dev/editor-lang'

describe('resolveEditorLanguage', () => {
  it('returns language support for known languages', () => {
    expect(resolveEditorLanguage('json')?.language.name).toBeTruthy()
    expect(resolveEditorLanguage('typescript')?.language.name).toBeTruthy()
    expect(resolveEditorLanguage('sql')?.language.name).toBeTruthy()
  })

  it('returns undefined for plain text', () => {
    expect(resolveEditorLanguage('text')).toBeUndefined()
    expect(resolveEditorLanguage()).toBeUndefined()
  })
})
