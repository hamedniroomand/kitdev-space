import type { ToolEditorLang } from './editor-lang'
import { gunzipSync, unzipSync, zipSync } from 'fflate'

/**
 * An archive reader for the browser.
 *
 * fflate covers gzip and zip only, so this walks the tar blocks. A tar file is
 * a list of 512-byte header blocks. Each header is followed by the file
 * content, padded to a multiple of 512.
 * @see https://www.gnu.org/software/tar/manual/html_node/Standard.html
 */

export type TarEntryType = 'file' | 'directory' | 'other'

export interface TarEntry {
  path: string
  size: number
  type: TarEntryType
}

export type ArchiveFormat = 'tar' | 'gzip' | 'zip'

export interface Archive {
  format: ArchiveFormat
  entries: TarEntry[]
  /** Inflates one entry. The rest of the archive stays packed. */
  read: (path: string) => Uint8Array
}

const BLOCK = 512
export const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024
const INVALID_ARCHIVE = 'The archive could not be read.\n\nUse a valid .tar, .tar.gz, or .zip file.'
const UNSUPPORTED_FORMAT = 'Unsupported compression format.\n\nUse a .tar, .tar.gz, .tgz, or .zip file.'
const ENTRY_NOT_FOUND = 'The entry was not found in the archive.'

export function assertArchiveSize(byteLength: number): void {
  if (byteLength <= 0) {
    throw new Error('Choose an archive file before you run the tool.')
  }
  if (byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error('The archive is too large.\n\nUse a file that is 25 MB or smaller.')
  }
}

export function assertSafeEntryPath(path: string): void {
  const value = path.trim()
  if (!value) {
    throw new Error('Enter an entry path.')
  }
  if (value.includes('..') || value.startsWith('/') || value.includes('\\')) {
    throw new Error('The entry path is not safe.')
  }
}

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte)
}

/**
 * Reads the format from the first bytes.
 *
 * bzip2 and xz need a decoder that no browser gives, so they report an error
 * instead of a failed tar walk.
 */
export function detectArchiveFormat(bytes: Uint8Array): ArchiveFormat {
  if (hasMagic(bytes, [0x1F, 0x8B])) {
    return 'gzip'
  }
  if (hasMagic(bytes, [0x50, 0x4B, 0x03, 0x04])) {
    return 'zip'
  }
  if (hasMagic(bytes, [0x42, 0x5A, 0x68])) {
    throw new Error(UNSUPPORTED_FORMAT)
  }
  if (hasMagic(bytes, [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
    throw new Error(UNSUPPORTED_FORMAT)
  }
  return 'tar'
}

const decoder = new TextDecoder()

/** Reads a NUL-padded UTF-8 field. */
function text(bytes: Uint8Array, offset: number, length: number): string {
  const end = Math.min(offset + length, bytes.length)
  let stop = offset
  while (stop < end && bytes[stop] !== 0) {
    stop += 1
  }
  return decoder.decode(bytes.subarray(offset, stop))
}

/**
 * Reads a PAX extended header.
 *
 * The content is a list of records. Each record is "<length> <key>=<value>\n",
 * and the length counts the full record. A path record gives the true name of
 * the next entry, which is how bsdtar writes a name of more than 100 bytes.
 */
function parsePaxRecords(bytes: Uint8Array, offset: number, size: number): Map<string, string> {
  const records = new Map<string, string>()
  const block = decoder.decode(bytes.subarray(offset, offset + size))
  let at = 0

  while (at < block.length) {
    const space = block.indexOf(' ', at)
    if (space < 0) {
      break
    }

    const length = Number.parseInt(block.slice(at, space), 10)
    if (!Number.isFinite(length) || length <= 0 || at + length > block.length) {
      break
    }

    const body = block.slice(space + 1, at + length).replace(/\n$/, '')
    const equals = body.indexOf('=')
    if (equals > 0) {
      records.set(body.slice(0, equals), body.slice(equals + 1))
    }

    at += length
  }

  return records
}

/** Reads an octal ASCII number. GNU tar writes a base-256 form for a large value. */
function octal(bytes: Uint8Array, offset: number, length: number): number {
  const first = bytes[offset] ?? 0

  if (first & 0x80) {
    let value = 0
    for (let index = 1; index < length; index += 1) {
      value = value * 256 + (bytes[offset + index] ?? 0)
    }
    return value
  }

  const raw = text(bytes, offset, length).trim()
  const parsed = Number.parseInt(raw, 8)
  return Number.isFinite(parsed) ? parsed : 0
}

function isEmptyBlock(bytes: Uint8Array, offset: number): boolean {
  for (let index = 0; index < BLOCK; index += 1) {
    if (bytes[offset + index] !== 0) {
      return false
    }
  }
  return true
}

function entryType(flag: string, path: string): TarEntryType {
  if (flag === '5' || path.endsWith('/')) {
    return 'directory'
  }
  if (flag === '0' || flag === '' || flag === '\0') {
    return 'file'
  }
  return 'other'
}

/** Removes the gzip layer when the archive has one. */
export function inflateArchive(input: Uint8Array): Uint8Array {
  assertArchiveSize(input.byteLength)

  if (detectArchiveFormat(input) !== 'gzip') {
    return input
  }

  try {
    const out = gunzipSync(input)
    assertArchiveSize(out.byteLength)
    return out
  }
  catch (cause) {
    if (cause instanceof Error && cause.message.includes('25 MB')) {
      throw cause
    }
    throw new Error(INVALID_ARCHIVE, { cause })
  }
}

/** A tar entry with the offset of its content in the uncompressed archive. */
interface TarBlock extends TarEntry {
  offset: number
}

function walkTar(bytes: Uint8Array): TarBlock[] {
  const entries: TarBlock[] = []
  let offset = 0
  // A long name arrives in its own block, before the entry that it names.
  // GNU tar writes an 'L' entry. bsdtar writes a PAX 'x' header.
  let longName: string | null = null
  let longSize: number | null = null

  while (offset + BLOCK <= bytes.length) {
    if (isEmptyBlock(bytes, offset)) {
      break
    }

    const flag = text(bytes, offset + 156, 1)
    const rawSize = octal(bytes, offset + 124, 12)
    const content = offset + BLOCK
    const padded = Math.ceil(rawSize / BLOCK) * BLOCK

    if (content + rawSize > bytes.length) {
      break
    }

    // 'L' is a GNU long name. 'K' is a GNU long link name, which names no file.
    if (flag === 'L') {
      longName = text(bytes, content, rawSize)
      offset = content + padded
      continue
    }

    // 'x' applies to the next entry. 'g' applies to the archive, so ignore it.
    if (flag === 'x') {
      const records = parsePaxRecords(bytes, content, rawSize)
      longName = records.get('path') ?? longName
      const size = Number(records.get('size'))
      longSize = Number.isFinite(size) ? size : null
      offset = content + padded
      continue
    }

    if (flag === 'K' || flag === 'g') {
      offset = content + padded
      continue
    }

    const prefix = text(bytes, offset + 345, 155)
    const name = text(bytes, offset, 100)
    const path = longName ?? (prefix ? `${prefix}/${name}` : name)
    const size = longSize ?? rawSize
    longName = null
    longSize = null

    if (path) {
      const type = entryType(flag, path)
      const clean = path.replace(/^\.\//, '').replace(/\/$/, '')

      if (clean) {
        entries.push({ path: clean, size, type, offset: content })
      }
    }

    offset = content + padded
  }

  entries.sort((a, b) => a.path.localeCompare(b.path))
  return entries
}

/**
 * Lists the zip entries without inflation.
 *
 * A `filter` that returns `false` keeps the entry packed, so this walks the
 * central directory only. `originalSize` is the uncompressed size.
 */
function listZipEntries(input: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = []

  try {
    unzipSync(input, {
      filter(file) {
        const clean = file.name.replace(/^\.\//, '').replace(/\/$/, '')
        if (clean) {
          entries.push({
            path: clean,
            size: file.originalSize ?? 0,
            type: file.name.endsWith('/') ? 'directory' : 'file',
          })
        }
        return false
      },
    })
  }
  catch (cause) {
    throw new Error(INVALID_ARCHIVE, { cause })
  }

  entries.sort((a, b) => a.path.localeCompare(b.path))
  return entries
}

function readZipEntry(input: Uint8Array, path: string): Uint8Array {
  assertSafeEntryPath(path)

  let found: Record<string, Uint8Array>
  try {
    found = unzipSync(input, { filter: file => file.name.replace(/^\.\//, '') === path })
  }
  catch (cause) {
    throw new Error(INVALID_ARCHIVE, { cause })
  }

  const bytes = found[path]

  if (!bytes) {
    throw new Error(ENTRY_NOT_FOUND)
  }

  return bytes
}

/**
 * Opens an archive for the page.
 *
 * The listing is cheap: a tar walk reads the headers, and a zip walk reads the
 * central directory. `read` inflates one entry when the user asks for it, so a
 * large archive never sits unpacked in memory.
 */
export function openArchive(input: Uint8Array): Archive {
  assertArchiveSize(input.byteLength)
  const format = detectArchiveFormat(input)

  if (format === 'zip') {
    const entries = listZipEntries(input)
    if (entries.length === 0) {
      throw new Error(INVALID_ARCHIVE)
    }
    return { format, entries, read: path => readZipEntry(input, path) }
  }

  const bytes = inflateArchive(input)
  const blocks = walkTar(bytes)

  if (blocks.length === 0) {
    throw new Error(INVALID_ARCHIVE)
  }

  return {
    format,
    entries: blocks.map(({ path, size, type }) => ({ path, size, type })),
    read(path) {
      assertSafeEntryPath(path)
      const block = blocks.find(item => item.path === path)

      if (!block || block.type === 'directory') {
        throw new Error(ENTRY_NOT_FOUND)
      }

      return bytes.slice(block.offset, block.offset + block.size)
    },
  }
}

export function listTarEntries(input: Uint8Array): TarEntry[] {
  return openArchive(input).entries
}

export function readTarEntry(input: Uint8Array, path: string): Uint8Array {
  return openArchive(input).read(path)
}

export interface TarTreeNode {
  path: string
  name: string
  type: TarEntryType
  size: number
  children: TarTreeNode[]
}

/**
 * Builds the folder hierarchy from the entry paths.
 *
 * A zip often holds no directory entry, so a missing folder comes from the
 * path segments of its children.
 */
export function buildPathTree(entries: TarEntry[]): TarTreeNode[] {
  const roots: TarTreeNode[] = []
  const index = new Map<string, TarTreeNode>()

  for (const entry of entries) {
    const segments = entry.path.split('/').filter(Boolean)
    let parentPath = ''

    segments.forEach((name, depth) => {
      const path = parentPath ? `${parentPath}/${name}` : name
      const last = depth === segments.length - 1
      let node = index.get(path)

      if (!node) {
        node = {
          path,
          name,
          type: last ? entry.type : 'directory',
          size: last ? entry.size : 0,
          children: [],
        }
        index.set(path, node)
        const parent = index.get(parentPath)
        ;(parent ? parent.children : roots).push(node)
      }
      else if (last) {
        node.type = entry.type
        node.size = entry.size
      }

      parentPath = path
    })
  }

  return roots
}

export const MAX_PREVIEW_BYTES = 1024 * 1024

export type EntryPreview
  = | { kind: 'none' }
    | { kind: 'image', mime: string }
    | { kind: 'text', lang: ToolEditorLang }

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

const TEXT_LANG: Record<string, ToolEditorLang> = {
  cjs: 'javascript',
  js: 'javascript',
  mjs: 'javascript',
  cts: 'typescript',
  mts: 'typescript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  htm: 'html',
  html: 'html',
  vue: 'html',
  css: 'css',
  less: 'css',
  scss: 'css',
  md: 'markdown',
  markdown: 'markdown',
  sql: 'sql',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  cfg: 'text',
  conf: 'text',
  csv: 'text',
  editorconfig: 'text',
  env: 'text',
  gitignore: 'text',
  ini: 'text',
  lock: 'text',
  log: 'text',
  npmrc: 'text',
  sh: 'text',
  toml: 'text',
  txt: 'text',
}

const TEXT_NAMES = new Set(['changelog', 'dockerfile', 'license', 'makefile', 'readme'])

/**
 * Reports how the page can show one entry.
 *
 * The extension decides the kind. An unknown extension gives `none`, so a
 * binary file never reaches the editor. An entry of 1 MB or more gives `none`.
 */
export function previewFor(path: string, size: number): EntryPreview {
  const name = (path.split('/').pop() ?? '').toLowerCase()
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  const mime = IMAGE_MIME[extension]

  if (size >= MAX_PREVIEW_BYTES) {
    return { kind: 'none' }
  }
  if (mime) {
    return { kind: 'image', mime }
  }

  const lang = extension ? TEXT_LANG[extension] : (TEXT_NAMES.has(name) ? 'text' : undefined)
  return lang ? { kind: 'text', lang } : { kind: 'none' }
}

/**
 * Packs the chosen entries into a zip.
 *
 * The 25 MB limit covers the output as well as the input.
 */
export function packEntries(files: Record<string, Uint8Array>): Uint8Array {
  const paths = Object.keys(files)

  if (paths.length === 0) {
    throw new Error('Select one file or more before you download.')
  }

  const total = paths.reduce((sum, path) => sum + (files[path]?.byteLength ?? 0), 0)

  if (total > MAX_ARCHIVE_BYTES) {
    throw new Error('The selection is too large.\n\nSelect files of 25 MB or smaller in total.')
  }

  return zipSync(files)
}
