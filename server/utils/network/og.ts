export interface OgPreviewData {
  title: string
  description: string
  image: string
  url: string
  siteName: string
  twitterCard: string
}

export async function extractOgFromHtml(html: string, pageUrl: string): Promise<OgPreviewData> {
  const data: OgPreviewData = {
    title: '',
    description: '',
    image: '',
    url: pageUrl,
    siteName: '',
    twitterCard: '',
  }

  let fallbackTitle = ''

  const rewriter = new HTMLRewriter()
    .on('title', {
      text(text) {
        fallbackTitle += text.text
      },
    })
    .on('meta', {
      element(element) {
        const prop = element.getAttribute('property') || element.getAttribute('name') || ''
        const content = element.getAttribute('content') || ''
        if (!content) {
          return
        }
        if (prop === 'og:title') {
          data.title = content
        }
        if (prop === 'og:description' || prop === 'description') {
          data.description = data.description || content
        }
        if (prop === 'og:image') {
          data.image = content
        }
        if (prop === 'og:url') {
          data.url = content
        }
        if (prop === 'og:site_name') {
          data.siteName = content
        }
        if (prop === 'twitter:card') {
          data.twitterCard = content
        }
        if (prop === 'twitter:title' && !data.title) {
          data.title = content
        }
        if (prop === 'twitter:description' && !data.description) {
          data.description = content
        }
        if (prop === 'twitter:image' && !data.image) {
          data.image = content
        }
      },
    })

  const transformed = rewriter.transform(new Response(html))
  await transformed.arrayBuffer()

  if (!data.title) {
    data.title = fallbackTitle.trim()
  }
  data.title = data.title.trim()
  data.description = data.description.trim()
  return data
}
