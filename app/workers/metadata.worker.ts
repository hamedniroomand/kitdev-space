import type { ImageMetadata } from '#shared/utils/image/exif'
import { readImageMetadata } from '#shared/utils/image/exif'

export interface MetadataWorkerRequest {
  bytes: ArrayBuffer
}

export interface MetadataWorkerResponse {
  meta?: ImageMetadata
  error?: string
}

globalThis.onmessage = (event: MessageEvent<MetadataWorkerRequest>) => {
  try {
    const meta = readImageMetadata(new Uint8Array(event.data.bytes))
    globalThis.postMessage({ meta } satisfies MetadataWorkerResponse)
  }
  catch (cause) {
    const error = cause instanceof Error ? cause.message : 'The file could not be read.'
    globalThis.postMessage({ error } satisfies MetadataWorkerResponse)
  }
}
