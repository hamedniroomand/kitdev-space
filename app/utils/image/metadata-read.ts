import type { ImageMetadata } from '#shared/utils/image/exif'
import type { MetadataWorkerResponse } from '~/workers/metadata.worker'
import { readImageMetadata } from '#shared/utils/image/exif'

/**
 * A TIFF or a raw photo can be tens of megabytes. A parse of that size holds
 * the main thread for long enough to drop animation frames, so a worker reads it.
 */
export const METADATA_WORKER_BYTES = 5 * 1024 * 1024

/** Reads the metadata of an image. A large file goes to a worker. */
export function readMetadata(bytes: Uint8Array): Promise<ImageMetadata> {
  if (bytes.byteLength <= METADATA_WORKER_BYTES || typeof Worker === 'undefined') {
    return Promise.resolve(readImageMetadata(bytes))
  }

  const worker = new Worker(new URL('../../workers/metadata.worker.ts', import.meta.url), {
    type: 'module',
  })

  return new Promise<ImageMetadata>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<MetadataWorkerResponse>) => {
      worker.terminate()
      if (event.data.meta) {
        resolve(event.data.meta)
      }
      else {
        reject(new Error(event.data.error ?? 'The file could not be read.'))
      }
    }
    worker.onerror = () => {
      // The worker chunk can fail to load. The main thread then reads the file.
      worker.terminate()
      resolve(readImageMetadata(bytes))
    }
    worker.postMessage({ bytes: bytes.buffer })
  })
}
