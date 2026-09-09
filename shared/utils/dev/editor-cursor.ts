import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { ViewPlugin } from '@codemirror/view'

/**
 * Gives the `EditorView` to a callback when the editor mounts, so a page can
 * move the cursor from a control outside the editor.
 */
export function captureEditorView(onReady: (view: EditorView) => void): Extension {
  return ViewPlugin.define((view) => {
    onReady(view)
    return {}
  })
}

/** The line and the column start at 1, the same as a parser error reports. */
export function goToLineColumn(view: EditorView, line: number, column = 1): void {
  const safeLine = Math.min(Math.max(line, 1), view.state.doc.lines)
  const lineInfo = view.state.doc.line(safeLine)
  const pos = Math.min(lineInfo.from + Math.max(column - 1, 0), lineInfo.to)
  view.dispatch({
    selection: { anchor: pos },
    scrollIntoView: true,
  })
  view.focus()
}

export function goToOffset(view: EditorView, offset: number): void {
  const pos = Math.min(Math.max(offset, 0), view.state.doc.length)
  view.dispatch({
    selection: { anchor: pos },
    scrollIntoView: true,
  })
  view.focus()
}
