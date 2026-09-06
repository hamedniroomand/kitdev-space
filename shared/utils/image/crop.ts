/** A rectangle in the pixels of the source image. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** A corner of the crop box. The opposite corner stays fixed during a resize. */
export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

export const MIN_CROP_SIZE = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(rect: CropRect): CropRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

/**
 * The largest centered box with the given aspect that fits the image.
 * No aspect gives the whole image.
 */
export function initialCrop(imageWidth: number, imageHeight: number, aspect?: number | null): CropRect {
  if (!aspect || aspect <= 0) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight }
  }

  let width = imageWidth
  let height = width / aspect
  if (height > imageHeight) {
    height = imageHeight
    width = height * aspect
  }

  return round({
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
    width,
    height,
  })
}

/** Moves the box and keeps it inside the image. */
export function moveCrop(rect: CropRect, dx: number, dy: number, imageWidth: number, imageHeight: number): CropRect {
  return round({
    x: clamp(rect.x + dx, 0, imageWidth - rect.width),
    y: clamp(rect.y + dy, 0, imageHeight - rect.height),
    width: rect.width,
    height: rect.height,
  })
}

/**
 * Drags one corner of the box. The opposite corner stays fixed. The box stays
 * inside the image, keeps the aspect when one is given, and never gets smaller
 * than `MIN_CROP_SIZE`.
 */
export function resizeCrop(
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  imageWidth: number,
  imageHeight: number,
  aspect?: number | null,
): CropRect {
  const west = handle.includes('w')
  const north = handle.includes('n')

  const anchorX = west ? rect.x + rect.width : rect.x
  const anchorY = north ? rect.y + rect.height : rect.y
  const roomX = west ? anchorX : imageWidth - anchorX
  const roomY = north ? anchorY : imageHeight - anchorY

  const cornerX = (west ? rect.x : rect.x + rect.width) + dx
  const cornerY = (north ? rect.y : rect.y + rect.height) + dy

  let width = clamp(west ? anchorX - cornerX : cornerX - anchorX, MIN_CROP_SIZE, roomX)
  let height = clamp(north ? anchorY - cornerY : cornerY - anchorY, MIN_CROP_SIZE, roomY)

  if (aspect && aspect > 0) {
    // The larger drag wins, then the other side follows the aspect.
    if (width / aspect >= height) {
      height = width / aspect
    }
    else {
      width = height * aspect
    }
    if (height > roomY) {
      height = roomY
      width = height * aspect
    }
    if (width > roomX) {
      width = roomX
      height = width / aspect
    }
  }

  return round({
    x: west ? anchorX - width : anchorX,
    y: north ? anchorY - height : anchorY,
    width,
    height,
  })
}
