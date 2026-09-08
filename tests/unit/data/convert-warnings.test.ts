import { describe, expect, it } from 'vitest'
import { detectConversionLossWarnings } from '#shared/utils/data/convert-warnings'

describe('detectConversionLossWarnings', () => {
  it('warns when YAML comments are lost during conversion', () => {
    const yaml = `# Top comment
name: KitDev # inline comment
ready: true`
    const warnings = detectConversionLossWarnings(yaml, 'yaml', 'json')
    expect(warnings).toContain('Comments are lost during conversion.')
  })

  it('warns when YAML anchors or aliases are lost during conversion', () => {
    const yaml = `defaults: &base
  timeout: 30
service:
  <<: *base
  port: 8080`
    const warnings = detectConversionLossWarnings(yaml, 'yaml', 'json')
    expect(warnings).toContain('YAML anchors and aliases are expanded. Anchor references are lost during conversion.')
  })

  it('warns when YAML dates are converted to JSON', () => {
    const yaml = 'created_at: 2026-09-08T20:00:00Z\nname: Test'
    const warnings = detectConversionLossWarnings(yaml, 'yaml', 'json')
    expect(warnings).toContain('Date values become strings during conversion to JSON.')
  })

  it('warns when TOML dates are converted to JSON', () => {
    const toml = 'date = 2026-09-08T12:00:00Z\ntitle = "Test"'
    const warnings = detectConversionLossWarnings(toml, 'toml', 'json')
    expect(warnings).toContain('Date values become strings during conversion to JSON.')
  })

  it('warns when null values are converted to TOML', () => {
    const json = '{\n  "name": "KitDev",\n  "optional": null\n}'
    const warnings = detectConversionLossWarnings(json, 'json', 'toml')
    expect(warnings).toContain('TOML does not support null values. Null values are lost or changed during conversion.')
  })

  it('returns no warnings for clean JSON to YAML conversion without special triggers', () => {
    const json = '{"name": "KitDev", "ready": true}'
    const warnings = detectConversionLossWarnings(json, 'json', 'yaml')
    expect(warnings).toHaveLength(0)
  })

  it('returns no warnings for empty input', () => {
    const warnings = detectConversionLossWarnings('', 'yaml', 'json')
    expect(warnings).toHaveLength(0)
  })
})
