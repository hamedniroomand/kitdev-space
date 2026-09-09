import type { BrowserImageProcessOptions } from './process-browser'
import type { ZipEntries } from './zip'
import { imageExtensionFor } from '#shared/utils/image/format'
import { processImageInBrowser } from './process-browser'
import { blobToBytes, uniqueZipName, zipInBrowser } from './zip'

export interface ImageBatchRow {
  name: string
  inputBytes: number
  outputBytes: number | null
  /** The percent that the file lost. A negative value means the file grew. */
  delta: number | null
  error: string | null
}

export interface ImageBatchResult {
  rows: ImageBatchRow[]
  /** Null when the browser could process no file. */
  zip: Blob | null
}

function stem(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * Runs the same settings over each file and packages the results in one zip.
 * A file that the browser cannot decode gets an error row, and the other files
 * continue.
 */
export async function processImageBatch(
  files: File[],
  options: BrowserImageProcessOptions,
): Promise<ImageBatchResult> {
  const rows: ImageBatchRow[] = []
  const entries: ZipEntries = {}
  const taken = new Set<string>()
  const extension = imageExtensionFor(options.format)

  for (const file of files) {
    try {
      const result = await processImageInBrowser(file, options)
      const name = uniqueZipName(taken, `${stem(file.name)}.${extension}`)
      entries[name] = await blobToBytes(result.blob)
      rows.push({
        name,
        inputBytes: file.size,
        outputBytes: result.outputBytes,
        delta: file.size > 0 ? Math.round((1 - result.outputBytes / file.size) * 100) : null,
        error: null,
      })
    }
    catch (cause) {
      rows.push({
        name: file.name,
        inputBytes: file.size,
        outputBytes: null,
        delta: null,
        error: cause instanceof Error ? cause.message : 'The image operation failed.',
      })
    }
  }

  return {
    rows,
    zip: Object.keys(entries).length > 0 ? zipInBrowser(entries) : null,
  }
}
