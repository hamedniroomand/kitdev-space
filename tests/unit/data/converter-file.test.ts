import { describe, expect, it } from 'vitest'

function getDownloadFilename(baseDownloadName: string, targetFormat: string): string {
  const base = baseDownloadName.replace(/\.[^.]+$/, '') || 'converted'
  return `${base}.${targetFormat}`
}

function detectFormatFromFilename(filename: string): string | null {
  const name = filename.toLowerCase()
  if (name.endsWith('.yaml') || name.endsWith('.yml')) {
    return 'yaml'
  }
  if (name.endsWith('.toml')) {
    return 'toml'
  }
  if (name.endsWith('.json')) {
    return 'json'
  }
  if (name.endsWith('.xml')) {
    return 'xml'
  }
  if (name.endsWith('.csv')) {
    return 'csv'
  }
  return null
}

describe('converter file handling', () => {
  it('computes download filename matching target format', () => {
    expect(getDownloadFilename('converted.yaml', 'json')).toBe('converted.json')
    expect(getDownloadFilename('converted.yaml', 'yaml')).toBe('converted.yaml')
    expect(getDownloadFilename('converted.toml', 'json')).toBe('converted.json')
    expect(getDownloadFilename('converted.toml', 'toml')).toBe('converted.toml')
  })

  it('detects format from file extension on drop', () => {
    expect(detectFormatFromFilename('test.yaml')).toBe('yaml')
    expect(detectFormatFromFilename('test.yml')).toBe('yaml')
    expect(detectFormatFromFilename('test.toml')).toBe('toml')
    expect(detectFormatFromFilename('test.json')).toBe('json')
    expect(detectFormatFromFilename('test.xml')).toBe('xml')
    expect(detectFormatFromFilename('test.csv')).toBe('csv')
    expect(detectFormatFromFilename('unknown.txt')).toBeNull()
  })
})
