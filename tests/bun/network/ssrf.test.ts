import { describe, expect, it, spyOn } from 'bun:test'
import { assertSafeUrl } from '#server/utils/network/ssrf'

describe('assertSafeUrl', () => {
  it('rejects localhost', async () => {
    await expect(assertSafeUrl('http://localhost/path')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects 127.0.0.0/8', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects 0.0.0.0/8', async () => {
    await expect(assertSafeUrl('http://0.0.0.0/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects 10.0.0.0/8', async () => {
    await expect(assertSafeUrl('http://10.1.2.3/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects 172.16.0.0/12', async () => {
    await expect(assertSafeUrl('http://172.16.0.1/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects 192.168.0.0/16', async () => {
    await expect(assertSafeUrl('http://192.168.1.10/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects the cloud metadata IP', async () => {
    await expect(assertSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects metadata.google.internal', async () => {
    await expect(assertSafeUrl('http://metadata.google.internal/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects ::1', async () => {
    await expect(assertSafeUrl('http://[::1]/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects the IPv6 unspecified address', async () => {
    await expect(assertSafeUrl('http://[::]/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects IPv6 unique local addresses', async () => {
    await expect(assertSafeUrl('http://[fd00::1]/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects bracketed IPv6 loopback without DNS', async () => {
    const lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4, ttl: 0 },
    ])

    try {
      await expect(assertSafeUrl('http://[::1]/')).rejects.toMatchObject({
        statusCode: 400,
      })
      expect(lookup).not.toHaveBeenCalled()
    }
    finally {
      lookup.mockRestore()
    }
  })

  it('rejects IPv4-mapped private addresses', async () => {
    const lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4, ttl: 0 },
    ])

    try {
      await expect(assertSafeUrl('http://[::ffff:10.0.0.1]/')).rejects.toMatchObject({
        statusCode: 400,
      })
    }
    finally {
      lookup.mockRestore()
    }
  })

  it('rejects IPv4-mapped unspecified addresses', async () => {
    const lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4, ttl: 0 },
    ])

    try {
      await expect(assertSafeUrl('http://[::ffff:0:0]/')).rejects.toMatchObject({
        statusCode: 400,
      })
    }
    finally {
      lookup.mockRestore()
    }
  })

  it('rejects file: URLs', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects credentials in the URL', async () => {
    await expect(assertSafeUrl('https://user:secret@example.com/')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects a hostname that resolves to a private IP', async () => {
    const lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '10.0.0.1', family: 4, ttl: 0 },
    ])

    try {
      await expect(assertSafeUrl('https://evil.example/')).rejects.toMatchObject({
        statusCode: 400,
      })
    }
    finally {
      lookup.mockRestore()
    }
  })

  it('accepts https://example.com', async () => {
    const url = await assertSafeUrl('https://example.com/')
    expect(url).toBeInstanceOf(URL)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('example.com')
  })
})
