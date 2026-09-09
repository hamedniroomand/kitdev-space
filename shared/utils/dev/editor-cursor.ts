import type { Extension } from '@codemirror/state'
import { EditorView, ViewPlugin } from '@codemirror/view'

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

/**
 * Reports the caret offset when the user moves the caret with no edit. An edit
 * moves each offset after it, so a caret position in changed text no longer
 * agrees with a result that came from the text before the edit.
 */
export function onCursorOffset(onMove: (offset: number) => void): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.selectionSet && !update.docChanged) {
      onMove(update.state.selection.main.head)
    }
  })
}

/**
 * Selects a character range. It does not take the focus, so a control outside
 * the editor keeps the focus and its own keyboard navigation.
 */
export function selectRange(view: EditorView, start: number, end: number): void {
  const max = view.state.doc.length
  const from = Math.min(Math.max(start, 0), max)
  const to = Math.min(Math.max(end, from), max)
  view.dispatch({
    selection: { anchor: from, head: to },
    scrollIntoView: true,
  })
}
