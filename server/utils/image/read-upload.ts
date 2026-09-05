import type { H3Event } from 'h3'
import { ImageError } from './errors'
import { MAX_IMAGE_BYTES } from './limits'

export function assertImageSize(byteLength: number): void {
  if (byteLength <= 0) {
    throw new ImageError('Choose an image file before you run the tool.')
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new ImageError('The image is too large.\n\nUse a file that is 25 MB or smaller.')
  }
}

function fieldText(data: Buffer | string | undefined): string | undefined {
  if (data == null) {
    return undefined
  }
  return typeof data === 'string' ? data : new TextDecoder().decode(data)
}

export async function readImageForm(event: H3Event): Promise<{
  bytes: Uint8Array
  filename?: string
  fields: Record<string, string>
}> {
  const contentType = getHeader(event, 'content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    const file = form?.find(part => part.name === 'file' && part.data)
    if (!file?.data) {
      throw new ImageError('Choose an image file before you run the tool.')
    }
    assertImageSize(file.data.byteLength)

    const fields: Record<string, string> = {}
    for (const part of form ?? []) {
      if (!part.name || part.name === 'file') {
        continue
      }
      const text = fieldText(part.data)
      if (text != null) {
        fields[part.name] = text
      }
    }

    return {
      bytes: new Uint8Array(file.data),
      filename: file.filename,
      fields
    }
  }

  const raw = await readRawBody(event, false)
  if (!raw) {
    throw new ImageError('Choose an image file before you run the tool.')
  }
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
  assertImageSize(bytes.byteLength)

  const query = getQuery(event)
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      fields[key] = value
    }
  }

  return { bytes, fields }
}
