export type ToolCategory = 'data' | 'crypto' | 'color' | 'network' | 'image' | 'dev'

export type ToolStatus = 'available' | 'coming-soon'

export interface Tool {
  id: string
  slug: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  keywords: string[]
  route: string
  clientOnly: boolean
  serverRequired: boolean
  status: ToolStatus
  /**
   * The title for search. It feeds the title tag, the h1, the OpenGraph image,
   * and the schema name. Give it when `name` has a symbol or misses the query
   * noun, such as "JSON to YAML Converter" for the name "JSON ↔ YAML". The
   * sidebar, the palette, and the breadcrumbs keep the short `name`.
   */
  seoTitle?: string
  /**
   * The id of the parent tool. A variant renders the component of its parent
   * with a preset. It has its own route, title, and prose, so one search
   * intent gets one URL. The sidebar and the category pages list the parent only.
   */
  variantOf?: string
}
