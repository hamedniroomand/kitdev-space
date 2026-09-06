import { resolveLegacyRedirect } from '#shared/utils/redirects'

export default defineNuxtRouteMiddleware((to) => {
  const target = resolveLegacyRedirect(to.path)
  if (target) {
    return navigateTo(
      {
        path: target,
        query: to.query,
        hash: to.hash
      },
      {
        redirectCode: 301
      }
    )
  }
})
