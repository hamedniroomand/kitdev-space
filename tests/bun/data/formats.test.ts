import { describe, expect, it } from 'bun:test'
import { parseWithBun, serializeWithBun, transformWithBun } from '../../../server/utils/data/formats'

describe('bun format engine', () => {
  it('converts json to yaml and back', () => {
    const yamlText = transformWithBun('{"name":"KitDev"}', 'json', 'yaml')
    expect(yamlText).toContain('name')
    const jsonText = transformWithBun(yamlText, 'yaml', 'json')
    expect(JSON.parse(jsonText)).toEqual({ name: 'KitDev' })
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

  it('converts json object to xml and back', () => {
    const xmlText = transformWithBun('{"name":"KitDev"}', 'json', 'xml')
    expect(xmlText).toContain('name')
    const value = parseWithBun(xmlText, 'xml')
    expect(value).toEqual({ name: 'KitDev' })
  })

  it('rejects xml arrays without an object root', () => {
    expect(() => serializeWithBun([1, 2], 'xml')).toThrow(/object root/)
  })
})
