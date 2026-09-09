import type { IpClassificationType } from './ip-classify'
import { classifyIp } from './ip-classify'

export interface IpInfo {
  ip: string
  version: 4 | 6
  type: IpClassificationType
  isSpecial: boolean
  matchedRange?: string
  rfc?: string
  decimal?: string
  hex?: string
  binary?: string
  hostname?: string | null
}

export function analyzeIp(ipString: string): IpInfo {
  const classification = classifyIp(ipString)

  return {
    ip: classification.ip,
    version: classification.version,
    type: classification.type,
    isSpecial: classification.isSpecial,
    matchedRange: classification.matchedRange,
    rfc: classification.rfc,
    decimal: classification.decimal,
    hex: classification.hex,
    binary: classification.binary,
  }
}
