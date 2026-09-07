import type { CropRect } from '#shared/utils/image/crop'

/**
 * Cuts the rect out of the image in the browser and returns a lossless PNG.
 * Only the cropped pixels leave the device.
 */
export async function cropImageFile(file: Blob, rect: CropRect): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, rect.x, rect.y, rect.width, rect.height)
  }
  catch {
    throw new Error('The browser cannot decode this image for a crop.\n\nTurn the crop off, or use a JPEG, PNG, WebP, or GIF file.')
  }

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()

  const isLossy = file.type === 'image/jpeg' || file.type === 'image/webp'
  const mimeType = isLossy ? file.type : 'image/png'
  const options = isLossy ? { type: mimeType, quality: 0.92 } : { type: mimeType }

  return canvas.convertToBlob(options)
}
