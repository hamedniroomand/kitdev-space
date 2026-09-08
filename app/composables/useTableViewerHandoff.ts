export const TABLE_VIEWER_HANDOFF_KEY = 'kitdev:table:handoff-data'

export function useTableViewerHandoff() {
  const handoffState = useState<string | null>(TABLE_VIEWER_HANDOFF_KEY, () => null)

  function setHandoffData(data: string) {
    handoffState.value = data
  }

  function consumeHandoffData(): string | null {
    const data = handoffState.value
    if (data) {
      handoffState.value = null
      return data
    }
    return null
  }

  return {
    handoffState,
    setHandoffData,
    consumeHandoffData,
  }
}
