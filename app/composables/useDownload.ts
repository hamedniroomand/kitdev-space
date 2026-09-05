export function useDownload() {
  function downloadText(filename: string, text: string, mime = 'application/json') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return { downloadText }
}
