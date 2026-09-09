import type { Extension } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'

/** One class for each dot-separated part of a token: header, payload, signature. */
const SEGMENT_MARKS = [
  Decoration.mark({ class: 'cm-jwt-header' }),
  Decoration.mark({ class: 'cm-jwt-payload' }),
  Decoration.mark({ class: 'cm-jwt-signature' }),
]

const segmentTheme = EditorView.baseTheme({
  '.cm-jwt-header': { color: 'var(--ui-primary)' },
  '.cm-jwt-payload': { color: 'var(--ui-success)' },
  '.cm-jwt-signature': { color: 'var(--ui-warning)' },
})

function buildSegments(doc: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let start = 0
  let index = 0

  for (let position = 0; position <= doc.length; position += 1) {
    if (position < doc.length && doc[position] !== '.') {
      continue
    }
    if (position > start && index < SEGMENT_MARKS.length) {
      builder.add(start, position, SEGMENT_MARKS[index]!)
    }
    start = position + 1
    index += 1
  }

  return builder.finish()
}

/** Colors the header, the payload, and the signature of a token in the editor. */
export function jwtSegmentHighlight(): Extension[] {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildSegments(view.state.doc.toString())
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildSegments(update.state.doc.toString())
        }
      }
    },
    { decorations: value => value.decorations },
  )

  return [plugin, segmentTheme]
}
