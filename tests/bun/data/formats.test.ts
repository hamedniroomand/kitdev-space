import { describe, expect, it } from 'bun:test'
import { parseWithBun, serializeWithBun, transformWithBun } from '../../../server/utils/data/formats'

describe('bun format engine', () => {
  it('converts json to yaml and back', () => {
    const yamlText = transformWithBun('{"name":"KitDev","ready":true}', 'json', 'yaml')
    expect(yamlText).toBe('name: KitDev\nready: true')
    const jsonText = transformWithBun(yamlText, 'yaml', 'json')
    expect(JSON.parse(jsonText)).toEqual({ name: 'KitDev', ready: true })
  })

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

  it('converts json object to xml and back', () => {
    const xmlText = transformWithBun('{"name":"KitDev"}', 'json', 'xml')
    expect(xmlText).toContain('name')
    const value = parseWithBun(xmlText, 'xml')
    expect(value).toEqual({ name: 'KitDev' })
  })

  it('wraps multi-key json in an xml root element', () => {
    const xmlText = transformWithBun('{"name":"KitDev","ready":true}', 'json', 'xml')
    expect(xmlText).toContain('<root>')
    expect(xmlText).toContain('<name>KitDev</name>')
    expect(xmlText).toContain('<ready>true</ready>')
    expect(parseWithBun(xmlText, 'xml')).toEqual({
      root: { name: 'KitDev', ready: 'true' }
    })
  })

  it('preserves invalid keys as item key attributes', () => {
    const xmlText = transformWithBun(
      '{"dependencies":{"@nuxt/ui":"^4.11.0","vue":"^3.5.42"}}',
      'json',
      'xml'
    )
    expect(xmlText).toContain('<item key="@nuxt/ui">^4.11.0</item>')
    expect(xmlText).toContain('<vue>^3.5.42</vue>')
  })

  it('converts package.json shaped json to xml', async () => {
    const input = await Bun.file(new URL('../../../package.json', import.meta.url)).text()
    const xmlText = transformWithBun(input, 'json', 'xml')
    expect(xmlText).toContain('<root>')
    expect(xmlText).toContain('<name>kitdev-space</name>')
    expect(xmlText).toContain('<item key="@iconify-json/lucide">')
    expect(xmlText).toContain('<item key="test:watch">')
    expect(xmlText).toContain('<item key="*.{ts,mts,cts,js,mjs,cjs,vue}">')
    expect(() => parseWithBun(xmlText, 'xml')).not.toThrow()
  })

  it('rejects xml arrays without an object root', () => {
    expect(() => serializeWithBun([1, 2], 'xml')).toThrow(/object root/)
  })
})
