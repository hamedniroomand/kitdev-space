export function formatDnsRecord(record: string | object): string {
  if (typeof record === 'string') {
    return record
  }

  const value = record as Record<string, unknown>
  if (typeof value.priority === 'number' && typeof value.exchange === 'string') {
    return `${value.priority} ${value.exchange}`
  }

  return JSON.stringify(record)
}
