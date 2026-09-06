import { describe, expect, it } from 'vitest'
import { canConvertInBrowser, convertInBrowser } from '#shared/utils/data/convert'
import { DataError } from '#shared/utils/data/errors'

describe('canConvertInBrowser', () => {
  it('accepts the json and yaml pairs', () => {
    expect(canConvertInBrowser('json', 'yaml')).toBe(true)
    expect(canConvertInBrowser('yaml', 'json')).toBe(true)
    expect(canConvertInBrowser('json', 'json')).toBe(true)
    expect(canConvertInBrowser('yaml', 'typescript')).toBe(true)
  })

  it('rejects the formats that need the server', () => {
    expect(canConvertInBrowser('json', 'toml')).toBe(false)
    expect(canConvertInBrowser('xml', 'json')).toBe(false)
    expect(canConvertInBrowser('json5', 'json')).toBe(false)
    expect(canConvertInBrowser('typescript', 'json')).toBe(false)
  })
})

describe('convertInBrowser', () => {
  it('converts json to yaml', () => {
    expect(convertInBrowser('{"name":"KitDev","ready":true}', 'json', 'yaml'))
      .toBe('name: KitDev\nready: true\n')
  })

  it('writes indented block yaml for nested json', () => {
    expect(
      convertInBrowser(
        '{"name":"KitDev","labs":["data","crypto"],"meta":{"version":1}}',
        'json',
        'yaml'
      )
    ).toBe('name: KitDev\nlabs:\n  - data\n  - crypto\nmeta:\n  version: 1\n')
  })

  it('converts yaml to json', () => {
    const json = convertInBrowser('name: KitDev\nready: true\n', 'yaml', 'json')
    expect(JSON.parse(json)).toEqual({ name: 'KitDev', ready: true })
  })

  it('converts yaml to typescript', () => {
    expect(convertInBrowser('name: KitDev\n', 'yaml', 'typescript'))
      .toContain('interface Root')
  })

  it('rejects empty input', () => {
    expect(() => convertInBrowser('   ', 'json', 'yaml')).toThrow(DataError)
  })

  it('reports invalid yaml', () => {
    expect(() => convertInBrowser('a: [1, 2\n', 'yaml', 'json')).toThrow(/Invalid YAML/)
  })

  it('refuses a format that needs the server', () => {
    expect(() => convertInBrowser('{"a":1}', 'json', 'toml')).toThrow(/server/)
  })
})
