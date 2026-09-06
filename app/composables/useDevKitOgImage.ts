export interface KitDevOgImageProps {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  eyebrow?: MaybeRefOrGetter<string>
}

export function useKitDevOgImage(props: KitDevOgImageProps) {
  const site = useSiteConfig()
  const siteHost = computed(() => {
    try {
      return new URL(String(site.url || 'https://kitdev.space')).host
    } catch {
      return 'kitdev.space'
    }
  })

  const urls = defineOgImage('KitDev', {
    title: props.title,
    description: props.description,
    eyebrow: props.eyebrow ?? site.name ?? 'KitDev Space',
    siteName: siteHost
  })

  // Absolute og:image URLs are not crawled on all Nitro presets (e.g. vercel).
  // Queue the local paths so zeroRuntime images are written during prerender.
  if (import.meta.server && import.meta.prerender) {
    const paths = urls.map((url) => {
      try {
        return new URL(url, String(site.url || 'https://kitdev.space')).pathname
      } catch {
        return url.startsWith('/') ? url : `/${url}`
      }
    })
    prerenderRoutes(paths)
  }
}
