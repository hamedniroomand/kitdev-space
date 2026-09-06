import YAML from 'yaml'
import { DataError } from './errors'

/**
 * YAML in the browser.
 *
 * The `yaml` package is an installed dependency, and it runs in the browser.
 * `shared/utils/data/yaml-validator.ts` already uses it on the client, so this
 * module adds no bundle weight to a page that loads either one.
 *
 * The output is not byte-equal to `Bun.YAML.stringify`. Bun writes a space
 * after a key that opens a block, and Bun writes no final newline. This module
 * writes no such space, and it writes a final newline.
 */

export function parseYaml(text: string): unknown {
  try {
    return YAML.parse(text)
  } catch (cause) {
    throw new DataError('Invalid YAML.\n\nCheck the syntax and try again.', { cause })
  }
}

export function stringifyYaml(value: unknown): string {
  try {
    return YAML.stringify(value, { indent: 2, lineWidth: 0 })
  } catch (cause) {
    throw new DataError('Could not write YAML.', { cause })
  }
}
