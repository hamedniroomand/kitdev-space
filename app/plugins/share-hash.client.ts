/**
 * Keeps the input that a share link carries in the URL fragment.
 *
 * The router rewrites the URL while it starts, which drops the fragment before
 * any page runs its setup. This module reads the fragment when the entry chunk
 * loads, which happens first, so the value survives for `useToolQuery`.
 */
const capturedHash = import.meta.client ? window.location.hash : ''

export default defineNuxtPlugin(() => {
  return {
    provide: {
      shareHash: () => capturedHash,
    },
  }
})
