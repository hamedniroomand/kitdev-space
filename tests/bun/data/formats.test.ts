import { describe, expect, it } from 'bun:test'
import { transformWithBun } from '#server/utils/data/formats'

describe('bun format engine', () => {
  it('converts json to yaml and back', () => {
    const yamlText = transformWithBun('{"name":"KitDev","ready":true}', 'json', 'yaml')
    expect(yamlText).toBe('name: KitDev\nready: true')
    const jsonText = transformWithBun(yamlText, 'yaml', 'json')
    expect(JSON.parse(jsonText)).toEqual({ name: 'KitDev', ready: true })
  })

  // The json-yaml tool uses shared/utils/data/convert.ts. This test pins the
  // Bun engine, which the server transform route still uses.
  it('writes indented block yaml for nested json', () => {
    const yamlText = transformWithBun(
      '{"name":"KitDev","labs":["data","crypto"],"meta":{"version":1}}',
      'json',
      'yaml'
    )
    expect(yamlText).toBe('name: KitDev\nlabs: \n  - data\n  - crypto\nmeta: \n  version: 1')
  })

  it('converts json to toml and back', () => {
    const tomlText = transformWithBun('{"name":"KitDev"}', 'json', 'toml')
    expect(tomlText).toContain('name')
    const jsonText = transformWithBun(tomlText, 'toml', 'json')
    expect(JSON.parse(jsonText)).toEqual({ name: 'KitDev' })
  })

  it('converts json to json5 and back', () => {
    const json5Text = transformWithBun('{"name":"KitDev"}', 'json', 'json5')
    expect(json5Text).toContain('name')
    const jsonText = transformWithBun(json5Text, 'json5', 'json')
    expect(JSON.parse(jsonText)).toEqual({ name: 'KitDev' })
  })
})
