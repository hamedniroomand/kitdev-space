export function useDownload() {
  const { track } = useToolAnalytics()

  function downloadUrl(filename: string, url: string) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    track('tool_download')
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    downloadUrl(filename, url)
    URL.revokeObjectURL(url)
  }

  function downloadText(filename: string, text: string, mime = 'application/json') {
    downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }))
  }

  return { downloadUrl, downloadText, downloadBlob }
}
