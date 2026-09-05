export interface ImageProcessResult {
  blob: Blob
  inputBytes: number
  outputBytes: number
  width: number | null
  height: number | null
}

export async function readImageResponse(
  response: Response,
  fallbackErrorMessage: string,
  fallbackInputBytes?: number
): Promise<ImageProcessResult> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
    throw new Error(payload?.message || payload?.statusMessage || fallbackErrorMessage)
  }

  const inputBytes = Number(response.headers.get('x-input-bytes') ?? fallbackInputBytes ?? 0)
  const outputBytes = Number(response.headers.get('x-output-bytes') ?? 0)
  const width = Number(response.headers.get('x-image-width') ?? 0) || null
  const height = Number(response.headers.get('x-image-height') ?? 0) || null
  const blob = await response.blob()

  return {
    blob,
    inputBytes,
    outputBytes,
    width,
    height
  }
}
