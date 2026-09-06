import { describe, expect, it } from 'vitest'
import { svgToComponent } from '../../../shared/utils/dev/svg-component'

describe('svg component converter', () => {
  const sample = `<svg xmlns="http://www.w3.org/2000/svg" stroke-width="2" class="icon"><circle cx="12" cy="12" r="10"/></svg>`

  it('converts kebab-case attributes for React', () => {
    const output = svgToComponent(sample, 'react')
    expect(output).toContain('strokeWidth="2"')
    expect(output).toContain('className="icon"')
    expect(output).toContain('<svg {...props}')
    expect(output).toContain('export function SvgIcon')
  })

  it('wraps Vue output in a template', () => {
    const output = svgToComponent(sample, 'vue')
    expect(output.startsWith('<template>')).toBe(true)
    expect(output).toContain('stroke-width="2"')
    expect(output).toContain('</template>')
  })
})
