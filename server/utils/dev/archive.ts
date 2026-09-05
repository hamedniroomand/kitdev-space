import { MAX_IMAGE_BYTES } from '../image/limits'

// Reuse the same 25 MB product cap as Image Lab.
export const MAX_ARCHIVE_BYTES = MAX_IMAGE_BYTES

export type TarEntryType = 'file' | 'directory' | 'other'

export interface TarEntry {
  path: string
  size: number
  type: TarEntryType
}

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

export async function listTarEntries(input: Uint8Array): Promise<TarEntry[]> {
  assertArchiveSize(input.byteLength)
  try {
    const archive = new Bun.Archive(input)
    const files = await archive.files()
    const entries: TarEntry[] = []
    for (const [path, file] of files) {
      entries.push({
        path,
        size: file.size,
        type: 'file'
      })
    }
    entries.sort((a, b) => a.path.localeCompare(b.path))
    return entries
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes('25 MB')) {
      throw cause
    }
    throw new Error('The archive could not be read.\n\nUse a valid .tar or .tar.gz file.', { cause })
  }
}

export async function readTarEntry(input: Uint8Array, path: string): Promise<Uint8Array> {
  assertArchiveSize(input.byteLength)
  assertSafeEntryPath(path)
  try {
    const archive = new Bun.Archive(input)
    const files = await archive.files()
    const file = files.get(path)
    if (!file) {
      throw new Error('That entry was not found in the archive.')
    }
    return new Uint8Array(await file.arrayBuffer())
  } catch (cause) {
    if (cause instanceof Error && (
      cause.message.includes('25 MB')
      || cause.message.includes('not safe')
      || cause.message.includes('not found')
      || cause.message.includes('Enter an entry')
    )) {
      throw cause
    }
    throw new Error('The archive entry could not be read.\n\nCheck the path and try again.', { cause })
  }
}
