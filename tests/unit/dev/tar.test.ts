import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  assertArchiveSize,
  assertSafeEntryPath,
  listTarEntries,
  readTarEntry,
} from '#shared/utils/dev/tar'

const tar = new Uint8Array(readFileSync('tests/bun/dev/fixtures/sample.tar'))
const targz = new Uint8Array(readFileSync('tests/bun/dev/fixtures/sample.tar.gz'))
// Written by bsdtar, so long names arrive in PAX extended headers.
const pax = new Uint8Array(readFileSync('tests/fixtures/pax.tar'))
const paxgz = new Uint8Array(readFileSync('tests/fixtures/pax.tar.gz'))

const LONG_PATH = 'src/deep/nested/a-very-long-file-name-that-definitely-exceeds-the-one-hundred-'
  + 'character-limit-of-the-ustar-header-format-for-sure.txt'

describe('listTarEntries', () => {
  it('lists the files of a tar archive', () => {
    const entries = listTarEntries(tar)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every(entry => entry.path.length > 0)).toBe(true)
  })

  it('gives the same list for the gzip archive', () => {
    const plain = listTarEntries(tar).map(entry => `${entry.path}:${entry.size}`)
    const zipped = listTarEntries(targz).map(entry => `${entry.path}:${entry.size}`)
    expect(zipped).toEqual(plain)
  })

  it('sorts the entries by path', () => {
    const paths = listTarEntries(tar).map(entry => entry.path)
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b)))
  })

  it('reports a file that is not an archive', () => {
    expect(() => listTarEntries(new Uint8Array(1024))).toThrow(/valid \.tar/)
  })
})

describe('readTarEntry', () => {
  it('reads the content of an entry', () => {
    const entry = listTarEntries(tar).find(item => item.type === 'file' && item.size > 0)!
    const content = readTarEntry(tar, entry.path)
    expect(content.byteLength).toBe(entry.size)
  })

  it('reads the same content from the gzip archive', () => {
    const entry = listTarEntries(targz).find(item => item.type === 'file' && item.size > 0)!
    expect(readTarEntry(targz, entry.path)).toEqual(readTarEntry(tar, entry.path))
  })

  it('rejects an entry that is not in the archive', () => {
    expect(() => readTarEntry(tar, 'missing.txt')).toThrow(/not found/)
  })
})

describe('guards', () => {
  it('rejects a path that leaves the archive', () => {
    expect(() => assertSafeEntryPath('../secret')).toThrow(/not safe/)
    expect(() => assertSafeEntryPath('/etc/passwd')).toThrow(/not safe/)
    expect(() => assertSafeEntryPath('a\\b')).toThrow(/not safe/)
    expect(() => assertSafeEntryPath('  ')).toThrow(/Enter an entry path/)
  })

  it('accepts a normal path', () => {
    expect(() => assertSafeEntryPath('dir/file.txt')).not.toThrow()
  })

  it('rejects an empty or oversize archive', () => {
    expect(() => assertArchiveSize(0)).toThrow(/Choose a tar/)
    expect(() => assertArchiveSize(26 * 1024 * 1024)).toThrow(/too large/)
  })
})

describe('pAX extended headers', () => {
  it('reads a path longer than the 100 byte name field', () => {
    const paths = listTarEntries(pax).map(entry => entry.path)
    expect(paths).toContain(LONG_PATH)
  })

  it('never reports the PAX header block as a file', () => {
    const paths = listTarEntries(pax).map(entry => entry.path)
    expect(paths.some(path => path.includes('PaxHeader'))).toBe(false)
  })

  it('strips the leading ./ that bsdtar writes', () => {
    const paths = listTarEntries(pax).map(entry => entry.path)
    expect(paths.some(path => path.startsWith('./'))).toBe(false)
    expect(paths).toContain('readme.md')
  })

  it('reads a nested directory and its files', () => {
    const entries = listTarEntries(pax)
    expect(entries.find(entry => entry.path === 'src/binary.bin')?.size).toBe(5000)
    expect(entries.find(entry => entry.path === 'src')?.type).toBe('directory')
  })

  it('reads the content of a binary entry byte for byte', () => {
    const content = readTarEntry(pax, 'src/binary.bin')
    expect(content.byteLength).toBe(5000)
    expect(readTarEntry(paxgz, 'src/binary.bin')).toEqual(content)
  })

  it('reads the content behind a long PAX path', () => {
    expect(new TextDecoder().decode(readTarEntry(pax, LONG_PATH))).toBe('x\n')
  })

  it('gives the same list for the gzip archive', () => {
    expect(listTarEntries(paxgz)).toEqual(listTarEntries(pax))
  })
})
