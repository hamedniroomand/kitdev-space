import { describe, expect, it } from 'vitest'
import { fileFormat } from '#shared/utils/analytics/file-format'

describe('fileFormat', () => {
  it('returns a known extension in lowercase', () => {
    expect(fileFormat('report.JSON')).toBe('json')
    expect(fileFormat('clean-photo.jpeg')).toBe('jpeg')
    expect(fileFormat('archive.tar.gz')).toBe('gz')
    expect(fileFormat('site.webmanifest')).toBe('webmanifest')
  })

  it('never returns the file name', () => {
    expect(fileFormat('my-secret-file.xyz')).toBe('other')
    expect(fileFormat('noextension')).toBe('other')
    expect(fileFormat('')).toBe('other')
  })
})
