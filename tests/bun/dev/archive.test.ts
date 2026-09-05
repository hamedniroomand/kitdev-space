import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertSafeEntryPath,
  listTarEntries,
  readTarEntry
} from '../../../server/utils/dev/archive'

const fixture = new Uint8Array(
  readFileSync(join(import.meta.dir, 'fixtures/sample.tar'))
)

const gzipFixture = new Uint8Array(
  readFileSync(join(import.meta.dir, 'fixtures/sample.tar.gz'))
)

describe('archive helpers', () => {
  it('lists readme.txt', async () => {
    const entries = await listTarEntries(fixture)
    expect(entries.some(entry => entry.path === 'readme.txt')).toBe(true)
  })

  it('reads entry bytes', async () => {
    const bytes = await readTarEntry(fixture, 'readme.txt')
    expect(new TextDecoder().decode(bytes)).toBe('hello\n')
  })

  it('reads gzipped archives', async () => {
    const entries = await listTarEntries(gzipFixture)
    expect(entries.some(entry => entry.path === 'readme.txt')).toBe(true)
  })

  it('rejects unsafe entry paths', () => {
    expect(() => assertSafeEntryPath('../secret')).toThrow(/not safe/)
  })
})
