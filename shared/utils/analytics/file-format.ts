const KNOWN_FORMATS = new Set([
  'json',
  'json5',
  'csv',
  'tsv',
  'txt',
  'xml',
  'yaml',
  'yml',
  'toml',
  'md',
  'html',
  'css',
  'js',
  'mjs',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'sql',
  'sqlite',
  'db',
  'env',
  'pem',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'gif',
  'ico',
  'zip',
  'tar',
  'gz',
  'pdf',
  'webmanifest',
])

/** The file extension of a download, lowercase, from a fixed list. Any other extension is `other`. */
export function fileFormat(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim())
  const extension = match?.[1]?.toLowerCase() ?? ''
  return KNOWN_FORMATS.has(extension) ? extension : 'other'
}
