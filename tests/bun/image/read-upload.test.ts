import { describe, expect, it } from 'bun:test'
import { ImageError } from '../../../server/utils/image/errors'
import { MAX_IMAGE_BYTES } from '../../../server/utils/image/limits'
import { assertImageSize } from '../../../server/utils/image/read-upload'

describe('assertImageSize', () => {
  it('rejects oversized buffers', () => {
    expect(() => assertImageSize(MAX_IMAGE_BYTES + 1)).toThrow(ImageError)
  })

  it('rejects empty buffers', () => {
    expect(() => assertImageSize(0)).toThrow(ImageError)
  })
})
