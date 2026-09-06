import { describe, expect, it } from 'vitest'
import { readImageResponse } from '#shared/utils/image/response'
import { imageExtensionFor } from '#shared/utils/image/format'

describe('imageExtensionFor', () => {
  it('maps jpeg to jpg', () => {
    expect(imageExtensionFor('jpeg')).toBe('jpg')
  })

  it('preserves other formats', () => {
    expect(imageExtensionFor('webp')).toBe('webp')
    expect(imageExtensionFor('avif')).toBe('avif')
    expect(imageExtensionFor('png')).toBe('png')
  })
})

describe('readImageResponse', () => {
  it('extracts metadata headers and blob on successful response', async () => {
    const blob = new Blob(['mock data'], { type: 'image/webp' })
    const headers = new Headers({
      'x-input-bytes': '2048',
      'x-output-bytes': '1024',
      'x-image-width': '800',
      'x-image-height': '600'
    })
    const response = new Response(blob, { status: 200, headers })

    const result = await readImageResponse(response, 'Fallback error')
    expect(result.inputBytes).toBe(2048)
    expect(result.outputBytes).toBe(1024)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(await result.blob.text()).toBe('mock data')
  })

  it('throws error payload message on failed response', async () => {
    const errorBody = JSON.stringify({ message: 'Invalid dimensions.' })
    const response = new Response(errorBody, {
      status: 400,
      headers: { 'content-type': 'application/json' }
    })

    await expect(readImageResponse(response, 'Fallback error')).rejects.toThrow('Invalid dimensions.')
  })

  it('uses fallback message when error response has no message', async () => {
    const response = new Response('Server error', { status: 500 })
    await expect(readImageResponse(response, 'Fallback error')).rejects.toThrow('Fallback error')
  })
})
