/** Every IANA timezone the engine knows, with `UTC` first. `Intl` omits `UTC` from the list. */
export function ianaTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : []
  return ['UTC', ...zones.filter(zone => zone !== 'UTC')]
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    return Boolean(new Intl.DateTimeFormat('en', { timeZone }))
  }
  catch {
    return false
  }
}
