/**
 * Marks the document when Vue has taken over the server-rendered page.
 *
 * A browser test that clicks before hydration clicks into nothing. The tests
 * wait for `html[data-hydrated]`, which is exact and fast, instead of waiting
 * for the network to go quiet.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:suspense:resolve', () => {
    document.documentElement.dataset.hydrated = 'true'
  })
})
