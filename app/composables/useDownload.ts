export function useDownload() {
  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function downloadText(filename: string, text: string, mime = 'application/json') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` })
    downloadBlob(filename, blob)
  }

  return { downloadText, downloadBlob }
}
