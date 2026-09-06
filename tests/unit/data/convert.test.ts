import { describe, expect, it } from 'vitest'
import { canConvertInBrowser, convertInBrowser } from '#shared/utils/data/convert'
import { DataError } from '#shared/utils/data/errors'

describe('canConvertInBrowser', () => {
  it('accepts json, yaml, toml, json5, and xml in both directions', () => {
    for (const from of ['json', 'yaml', 'toml', 'json5', 'xml'] as const) {
      for (const to of ['json', 'yaml', 'toml', 'json5', 'xml', 'typescript'] as const) {
        expect(canConvertInBrowser(from, to), `${from} to ${to}`).toBe(true)
      }
    }
  })

  it('rejects typescript as an input', () => {
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
        'yaml',
      ),
    ).toBe('name: KitDev\nlabs:\n  - data\n  - crypto\nmeta:\n  version: 1\n')
  })

  it('converts yaml to json', () => {
    const json = convertInBrowser('name: KitDev\nready: true\n', 'yaml', 'json')
    expect(JSON.parse(json)).toEqual({ name: 'KitDev', ready: true })
  })

  it('converts json to toml and back', () => {
    const toml = convertInBrowser('{"name":"KitDev","meta":{"version":1}}', 'json', 'toml')
    expect(toml).toContain('name = "KitDev"')
    expect(toml).toContain('[meta]')
    expect(JSON.parse(convertInBrowser(toml, 'toml', 'json')))
      .toEqual({ name: 'KitDev', meta: { version: 1 } })
  })

  it('converts json to json5 and back', () => {
    const json5 = convertInBrowser('{"name":"KitDev"}', 'json', 'json5')
    expect(json5).toContain('name')
    expect(JSON.parse(convertInBrowser(json5, 'json5', 'json'))).toEqual({ name: 'KitDev' })
  })

  it('reads the json5 forms that strict json rejects', () => {
    const json = convertInBrowser('{ /* note */ name: \'KitDev\', ready: true, }', 'json5', 'json')
    expect(JSON.parse(json)).toEqual({ name: 'KitDev', ready: true })
  })

  it('converts yaml to typescript', () => {
    expect(convertInBrowser('name: KitDev\n', 'yaml', 'typescript')).toContain('interface Root')
  })

  it('ends every text format with one newline', () => {
    for (const to of ['yaml', 'toml', 'json5'] as const) {
      const out = convertInBrowser('{"name":"KitDev"}', 'json', to)
      expect(out.endsWith('\n'), to).toBe(true)
      expect(out.endsWith('\n\n'), to).toBe(false)
    }
  })

  it('rejects empty input', () => {
    expect(() => convertInBrowser('   ', 'json', 'yaml')).toThrow(DataError)
  })

  it('reports invalid yaml', () => {
    expect(() => convertInBrowser('a: [1, 2\n', 'yaml', 'json')).toThrow(/Invalid YAML/)
  })

  it('reports invalid toml', () => {
    expect(() => convertInBrowser('name = = 1', 'toml', 'json')).toThrow(/Invalid TOML/)
  })

  it('refuses an array root for toml', () => {
    expect(() => convertInBrowser('[1,2]', 'json', 'toml')).toThrow(/object root/)
  })

  it('refuses typescript as an input', () => {
    expect(() => convertInBrowser('interface A {}', 'typescript', 'json')).toThrow(/output format/)
  })
})
