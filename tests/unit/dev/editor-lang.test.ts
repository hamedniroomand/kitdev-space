import { describe, expect, it } from 'vitest'
import { resolveEditorLanguage } from '#shared/utils/dev/editor-lang'

describe('resolveEditorLanguage', () => {
  it('returns language support for known languages', async () => {
    expect((await resolveEditorLanguage('json'))?.language.name).toBeTruthy()
    expect((await resolveEditorLanguage('typescript'))?.language.name).toBeTruthy()
    expect((await resolveEditorLanguage('sql'))?.language.name).toBeTruthy()
  })

  it('returns undefined for plain text', async () => {
    expect(await resolveEditorLanguage('text')).toBeUndefined()
    expect(await resolveEditorLanguage()).toBeUndefined()
  })
})
