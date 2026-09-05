export type ToolCategory = 'data' | 'crypto' | 'color' | 'network'

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
}
