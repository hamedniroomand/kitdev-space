import { strToU8, zipSync } from 'fflate'

export type ZipEntries = Record<string, Uint8Array>

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

export function textToBytes(text: string): Uint8Array {
  return strToU8(text)
}

/** Package entries into one zip file in the browser. */
export function zipInBrowser(entries: ZipEntries): Blob {
  const bytes = zipSync(entries)
  return new Blob([bytes as unknown as ArrayBufferView<ArrayBuffer>], { type: 'application/zip' })
}

/**
 * Make each name unique. Two dropped files can hold the same name, and a zip
 * entry with a repeated name hides the earlier file.
 */
export function uniqueZipName(taken: Set<string>, name: string): string {
  if (!taken.has(name)) {
    taken.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let index = 2
  while (taken.has(`${stem}-${index}${ext}`)) {
    index += 1
  }
  const unique = `${stem}-${index}${ext}`
  taken.add(unique)
  return unique
}
