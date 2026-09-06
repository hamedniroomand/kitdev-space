import { readTarEntry } from '#server/utils/dev/archive'
import { readImageForm } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:tar-entry')

  try {
    const { bytes, fields } = await readImageForm(event)
    const path = fields.path ?? ''
    const data = await readTarEntry(bytes, path)
    const filename = path.split('/').pop() || 'entry.bin'
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
    setHeader(event, 'X-Entry-Path', path)
    setHeader(event, 'X-Output-Bytes', String(data.byteLength))
    return data
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The archive entry read failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
