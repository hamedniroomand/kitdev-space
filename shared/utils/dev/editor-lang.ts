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

/**
 * Loads the CodeMirror language pack for one language. Each pack is a dynamic
 * import, so a page downloads only the pack that its editor needs.
 */
export async function resolveEditorLanguage(lang: ToolEditorLang = 'text'): Promise<LanguageSupport | undefined> {
  switch (lang) {
    case 'javascript':
      return (await import('@codemirror/lang-javascript')).javascript()
    case 'typescript':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: true })
    case 'jsx':
      return (await import('@codemirror/lang-javascript')).javascript({ jsx: true })
    case 'tsx':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true })
    case 'json':
      return (await import('@codemirror/lang-json')).json()
    case 'html':
    case 'xml':
    case 'svg':
      return (await import('@codemirror/lang-html')).html()
    case 'css':
      return (await import('@codemirror/lang-css')).css()
    case 'markdown':
      return (await import('@codemirror/lang-markdown')).markdown()
    case 'sql':
      return (await import('@codemirror/lang-sql')).sql()
    case 'text':
    default:
      return undefined
  }
}
