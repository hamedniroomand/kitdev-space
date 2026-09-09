import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import type { RegexMatchResult } from './regex'
import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'

/**
 * Match highlighting for the editor of the RegEx tester.
 *
 * The matches come from the worker, not from the document, so the page sends
 * them in with an effect. The decorations only paint a background, so the
 * editor never changes its layout.
 *
 * This file stays apart from `regex.ts`, because `regex.ts` also runs inside
 * the worker, where the CodeMirror code cannot load.
 */
export const setRegexMatches = StateEffect.define<RegexMatchResult[]>()

const matchMark = Decoration.mark({ class: 'cm-regex-match' })

/** Nested groups alternate over three theme colors. */
const GROUP_MARKS = [
  Decoration.mark({ class: 'cm-regex-group-1' }),
  Decoration.mark({ class: 'cm-regex-group-2' }),
  Decoration.mark({ class: 'cm-regex-group-3' }),
]

const regexTheme = EditorView.baseTheme({
  '.cm-regex-match': {
    backgroundColor: 'color-mix(in oklab, var(--ui-text-dimmed) 30%, transparent)',
    borderRadius: '2px',
  },
  '.cm-regex-group-1': {
    backgroundColor: 'color-mix(in oklab, var(--ui-primary) 34%, transparent)',
  },
  '.cm-regex-group-2': {
    backgroundColor: 'color-mix(in oklab, var(--ui-warning) 38%, transparent)',
  },
  '.cm-regex-group-3': {
    backgroundColor: 'color-mix(in oklab, var(--ui-success) 36%, transparent)',
  },
})

function buildDecorations(matches: RegexMatchResult[], docLength: number): DecorationSet {
  const ranges: Range<Decoration>[] = []

  function push(mark: Decoration, from: number, to: number) {
    if (to > from && to <= docLength) {
      ranges.push(mark.range(from, to))
    }
  }

  for (const match of matches) {
    push(matchMark, match.start, match.end)
    for (const group of match.groups) {
      if (group.start === null || group.end === null) {
        continue
      }
      push(GROUP_MARKS[(group.index - 1) % GROUP_MARKS.length]!, group.start, group.end)
    }
  }

  return Decoration.set(ranges, true)
}

const regexMatchField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setRegexMatches)) {
        return buildDecorations(effect.value, transaction.state.doc.length)
      }
    }
    return transaction.docChanged ? value.map(transaction.changes) : value
  },
  provide: field => EditorView.decorations.from(field),
})

export function regexMatchHighlight(): Extension[] {
  return [regexMatchField, regexTheme]
}

/** Sends the matches to the editor. It skips a view that is not ready. */
export function pushRegexMatches(view: EditorView | null, matches: RegexMatchResult[]): void {
  view?.dispatch({ effects: setRegexMatches.of(matches) })
}
