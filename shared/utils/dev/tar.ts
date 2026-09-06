import { gunzipSync } from 'fflate'

/**
 * A tar reader for the browser.
 *
 * fflate covers gzip only, so this walks the tar blocks. A tar file is a list
 * of 512-byte header blocks. Each header is followed by the file content,
 * padded to a multiple of 512.
 * @see https://www.gnu.org/software/tar/manual/html_node/Standard.html
 */

export type TarEntryType = 'file' | 'directory' | 'other'

export interface TarEntry {
  path: string
  size: number
  type: TarEntryType
  /** Offset of the content in the uncompressed archive. */
  offset: number
}

const BLOCK = 512
export const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024

export function assertArchiveSize(byteLength: number): void {
  if (byteLength <= 0) {
    throw new Error('Choose a tar or tar.gz file before you run the tool.')
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

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x1F && bytes[1] === 0x8B
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

  if (!isGzip(input)) {
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
    throw new Error('The archive could not be read.\n\nUse a valid .tar or .tar.gz file.', { cause })
  }
}

export function listTarEntries(input: Uint8Array): TarEntry[] {
  const bytes = inflateArchive(input)
  const entries: TarEntry[] = []
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

  if (entries.length === 0) {
    throw new Error('The archive could not be read.\n\nUse a valid .tar or .tar.gz file.')
  }

  entries.sort((a, b) => a.path.localeCompare(b.path))
  return entries
}

export function readTarEntry(input: Uint8Array, path: string): Uint8Array {
  assertSafeEntryPath(path)

  const bytes = inflateArchive(input)
  const entry = listTarEntries(input).find(item => item.path === path)

  if (!entry || entry.type === 'directory') {
    throw new Error('The entry was not found in the archive.')
  }

  return bytes.slice(entry.offset, entry.offset + entry.size)
}
