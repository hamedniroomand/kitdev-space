/**
 * Keeps the values that a share link carries in the URL.
 *
 * The router rewrites the URL while it starts. It drops the fragment and the
 * query string before any page runs its setup, and `useRoute().query` is empty
 * at that moment too. This module reads both when the entry chunk loads, which
 * happens first, so the values survive for `useToolQuery`.
 */
const capturedHash = import.meta.client ? window.location.hash : ''
const capturedSearch = import.meta.client ? window.location.search : ''

export default defineNuxtPlugin(() => {
  return {
    provide: {
      shareHash: () => capturedHash,
      shareSearch: () => capturedSearch,
    },
  }
})
