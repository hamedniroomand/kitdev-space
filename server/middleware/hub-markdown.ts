import { buildToolMarkdown } from '../../shared/utils/tool-index'
import { tools } from '../../shared/utils/tools'

// Middleware, not a catch-all route: a `[...path].md` route also swallows the HTML hub pages.
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/hub/') || !path.endsWith('.md')) {
    return
  }

  const route = path.slice(0, -'.md'.length)
  const tool = tools.find(entry => entry.route === route)
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: 'Tool docs not found' })
  }

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return buildToolMarkdown(tool)
})
