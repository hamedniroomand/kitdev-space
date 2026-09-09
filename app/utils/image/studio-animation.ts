function ascii(bytes: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + length))
}

/**
 * True when the file holds more than one frame. A canvas keeps the first frame
 * only, so the page must warn the user before the run.
 */
export function isAnimatedImage(bytes: Uint8Array): boolean {
  if (ascii(bytes, 0, 3) === 'GIF') {
    // ponytail: the NETSCAPE loop block marks nearly every animated GIF. An
    // exact frame count needs a walk of the LZW sub blocks of each frame.
    return ascii(bytes, 0, Math.min(bytes.length, 4096)).includes('NETSCAPE2.0')
  }

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    // The VP8X chunk holds the flags. Bit 0x02 is the animation flag.
    return ascii(bytes, 12, 4) === 'VP8X' && ((bytes[20] ?? 0) & 0x02) !== 0
  }

  return false
}
