import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import type { LanguageSupport } from '@codemirror/language'

export type ToolEditorLang
  = | 'text'
    | 'javascript'
    | 'typescript'
    | 'jsx'
    | 'tsx'
    | 'json'
    | 'html'
    | 'css'
    | 'markdown'
    | 'sql'
    | 'xml'
    | 'svg'

export function resolveEditorLanguage(lang: ToolEditorLang = 'text'): LanguageSupport | undefined {
  switch (lang) {
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'jsx':
      return javascript({ jsx: true })
    case 'tsx':
      return javascript({ typescript: true, jsx: true })
    case 'json':
      return json()
    case 'html':
    case 'xml':
    case 'svg':
      return html()
    case 'css':
      return css()
    case 'markdown':
      return markdown()
    case 'sql':
      return sql()
    case 'text':
    default:
      return undefined
  }
}
