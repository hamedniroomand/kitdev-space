import { readFileSync } from 'node:fs'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  assertArchiveSize,
  assertSafeEntryPath,
  buildPathTree,
  detectArchiveFormat,
  listTarEntries,
  openArchive,
  packEntries,
  previewFor,
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
    expect(() => assertArchiveSize(0)).toThrow(/Choose an archive/)
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

const zip = zipSync({
  'readme.md': strToU8('# hi\n'),
  'src/': new Uint8Array(0),
  'src/index.ts': strToU8('export const a = 1\n'),
  'src/deep/nested/note.txt': strToU8('note\n'),
})

describe('detectArchiveFormat', () => {
  it('reads the format from the magic bytes', () => {
    expect(detectArchiveFormat(tar)).toBe('tar')
    expect(detectArchiveFormat(targz)).toBe('gzip')
    expect(detectArchiveFormat(zip)).toBe('zip')
  })

  it('reports bzip2 and xz as unsupported', () => {
    const bz2 = new Uint8Array([0x42, 0x5A, 0x68, 0x39, 0x31])
    const xz = new Uint8Array([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00, 0x00])
    expect(() => detectArchiveFormat(bz2)).toThrow(/Unsupported compression format/)
    expect(() => detectArchiveFormat(xz)).toThrow(/Unsupported compression format/)
    expect(() => openArchive(bz2)).toThrow(/Unsupported compression format/)
    expect(() => openArchive(xz)).toThrow(/Unsupported compression format/)
  })
})

describe('openArchive with a zip', () => {
  it('lists the entries', () => {
    const archive = openArchive(zip)
    expect(archive.format).toBe('zip')
    expect(archive.entries.map(entry => entry.path)).toEqual([
      'readme.md',
      'src',
      'src/deep/nested/note.txt',
      'src/index.ts',
    ])
  })

  it('reports the uncompressed size and the type', () => {
    const archive = openArchive(zip)
    expect(archive.entries.find(entry => entry.path === 'readme.md')?.size).toBe(5)
    expect(archive.entries.find(entry => entry.path === 'src')?.type).toBe('directory')
  })

  it('reads one entry', () => {
    const bytes = openArchive(zip).read('src/index.ts')
    expect(new TextDecoder().decode(bytes)).toBe('export const a = 1\n')
  })

  it('rejects an entry that is not in the archive', () => {
    expect(() => openArchive(zip).read('missing.txt')).toThrow(/not found/)
  })
})

describe('buildPathTree', () => {
  it('nests the files under their folder', () => {
    const tree = buildPathTree([
      { path: 'readme.md', size: 5, type: 'file' },
      { path: 'src', size: 0, type: 'directory' },
      { path: 'src/index.ts', size: 19, type: 'file' },
    ])
    expect(tree.map(node => node.name)).toEqual(['readme.md', 'src'])
    const src = tree.find(node => node.name === 'src')!
    expect(src.type).toBe('directory')
    expect(src.children.map(node => node.path)).toEqual(['src/index.ts'])
    expect(src.children[0]?.size).toBe(19)
  })

  it('builds a folder that the archive does not list', () => {
    const tree = buildPathTree([{ path: 'a/b/c.txt', size: 3, type: 'file' }])
    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('a')
    expect(tree[0]?.type).toBe('directory')
    expect(tree[0]?.children[0]?.path).toBe('a/b')
    expect(tree[0]?.children[0]?.children[0]?.path).toBe('a/b/c.txt')
  })

  it('gives an empty tree for an empty list', () => {
    expect(buildPathTree([])).toEqual([])
  })
})

describe('previewFor', () => {
  it('previews code, markdown, and text', () => {
    expect(previewFor('src/index.ts', 20)).toEqual({ kind: 'text', lang: 'typescript' })
    expect(previewFor('readme.md', 20)).toEqual({ kind: 'text', lang: 'markdown' })
    expect(previewFor('a/notes.txt', 20)).toEqual({ kind: 'text', lang: 'text' })
    expect(previewFor('LICENSE', 20)).toEqual({ kind: 'text', lang: 'text' })
    expect(previewFor('.gitignore', 20)).toEqual({ kind: 'text', lang: 'text' })
  })

  it('previews the image formats', () => {
    expect(previewFor('a.png', 20)).toEqual({ kind: 'image', mime: 'image/png' })
    expect(previewFor('a.JPG', 20)).toEqual({ kind: 'image', mime: 'image/jpeg' })
    expect(previewFor('a.jpeg', 20)).toEqual({ kind: 'image', mime: 'image/jpeg' })
    expect(previewFor('a.svg', 20)).toEqual({ kind: 'image', mime: 'image/svg+xml' })
    expect(previewFor('a.webp', 20)).toEqual({ kind: 'image', mime: 'image/webp' })
  })

  it('previews no binary and nothing of 1 MB or more', () => {
    expect(previewFor('src/binary.bin', 20)).toEqual({ kind: 'none' })
    expect(previewFor('a.out', 20)).toEqual({ kind: 'none' })
    expect(previewFor('big.txt', 1024 * 1024)).toEqual({ kind: 'none' })
    expect(previewFor('big.png', 1024 * 1024)).toEqual({ kind: 'none' })
  })
})

describe('packEntries', () => {
  it('packs the chosen entries into a zip', () => {
    const archive = openArchive(pax)
    const picked = {
      'readme.md': archive.read('readme.md'),
      'src/binary.bin': archive.read('src/binary.bin'),
    }
    const packed = packEntries(picked)
    expect(detectArchiveFormat(packed)).toBe('zip')
    const unpacked = openArchive(packed)
    expect(unpacked.entries.map(entry => entry.path)).toEqual(['readme.md', 'src/binary.bin'])
    expect(unpacked.read('src/binary.bin')).toEqual(picked['src/binary.bin'])
  })

  it('rejects an empty selection', () => {
    expect(() => packEntries({})).toThrow(/Select one file or more/)
  })

  it('rejects a selection of more than 25 MB', () => {
    expect(() => packEntries({ 'big.bin': new Uint8Array(26 * 1024 * 1024) }))
      .toThrow(/too large/)
  })
})
