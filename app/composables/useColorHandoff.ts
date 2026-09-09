export const COLOR_HANDOFF_KEY = 'kitdev:color:handoff-color'

/**
 * Sends one color from a tool to another tool in memory.
 *
 * The value stays in Nuxt state. It never enters the URL, local storage, or an
 * analytics event, so a color that comes from a private image stays private.
 * The receiving tool reads the value one time.
 */
export function useColorHandoff() {
  const handoffState = useState<string | null>(COLOR_HANDOFF_KEY, () => null)

  function setHandoffColor(hex: string) {
    handoffState.value = hex
  }

  function consumeHandoffColor(): string | null {
    const color = handoffState.value
    if (color) {
      handoffState.value = null
      return color
    }
    return null
  }

  return {
    handoffState,
    setHandoffColor,
    consumeHandoffColor,
  }
}
