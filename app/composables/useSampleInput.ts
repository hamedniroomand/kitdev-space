import type { Ref } from 'vue'

/**
 * Protects pasted input when a language or a mode control changes.
 * The sample is loaded only while the input still holds a sample or is empty.
 * User text is never replaced.
 */
export function useSampleInput<TKey extends string>(
  input: Ref<string>,
  samples: Record<TKey, string>,
) {
  const values = Object.values(samples) as string[]

  function holdsSample() {
    const current = input.value.trim()
    return !current || values.some(sample => sample.trim() === current)
  }

  function applySample(key: TKey) {
    input.value = samples[key]
  }

  /**
   * Loads the sample for the new key when the input holds no user text.
   * Returns true when the input changed.
   */
  function syncSample(key: TKey) {
    if (!holdsSample()) {
      return false
    }

    applySample(key)
    return true
  }

  return { holdsSample, applySample, syncSample }
}
