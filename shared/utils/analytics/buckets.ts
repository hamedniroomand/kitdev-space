export type InputBytesBucket = '0-1k' | '1k-10k' | '10k-100k' | '100k-1m' | '1m+'
export type QueryLengthBucket = '0' | '1-3' | '4-10' | '11+'

/** A size range instead of a size, so an event never says how long an input was. */
export function inputBytesBucket(bytes: number): InputBytesBucket {
  if (bytes < 1_000) {
    return '0-1k'
  }
  if (bytes < 10_000) {
    return '1k-10k'
  }
  if (bytes < 100_000) {
    return '10k-100k'
  }
  if (bytes < 1_000_000) {
    return '100k-1m'
  }
  return '1m+'
}

/** The length range of a search query. The query itself is never sent. */
export function queryLengthBucket(length: number): QueryLengthBucket {
  if (length <= 0) {
    return '0'
  }
  if (length <= 3) {
    return '1-3'
  }
  if (length <= 10) {
    return '4-10'
  }
  return '11+'
}

/** The UTF-8 size of a text. */
export function textBytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}
