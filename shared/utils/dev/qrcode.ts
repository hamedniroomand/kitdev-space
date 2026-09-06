import { renderSVG } from 'uqr'

export type QrPayloadKind = 'url' | 'text' | 'wifi'

export interface QrWifiOptions {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export function buildWifiPayload(options: QrWifiOptions): string {
  const ssid = options.ssid.trim()
  if (!ssid) {
    throw new Error('Enter a Wi-Fi network name.')
  }
  const security = options.security
  const password = security === 'nopass' ? '' : options.password
  if (security !== 'nopass' && !password) {
    throw new Error('Enter a Wi-Fi password.')
  }
  const hidden = options.hidden ? 'true' : 'false'
  return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden};;`
}

export function buildQrPayload(kind: QrPayloadKind, value: string, wifi?: QrWifiOptions): string {
  if (kind === 'wifi') {
    if (!wifi) {
      throw new Error('Enter Wi-Fi details.')
    }
    return buildWifiPayload(wifi)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(kind === 'url' ? 'Enter a URL.' : 'Enter text.')
  }
  if (kind === 'url') {
    try {
      // Accept bare hosts by requiring a parseable absolute URL when scheme exists;
      // otherwise keep the text as entered for common QR URL use.
      if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        void new URL(trimmed)
      }
    } catch (cause) {
      throw new Error('Enter a valid URL.', { cause })
    }
  }
  return trimmed
}

export function generateQrSvg(payload: string): string {
  if (!payload) {
    throw new Error('Enter data for the QR code.')
  }
  return renderSVG(payload, {
    ecc: 'M',
    border: 1,
    pixelSize: 8
  })
}
