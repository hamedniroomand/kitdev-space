import type { Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { linter, lintGutter } from '@codemirror/lint'
import YAML from 'yaml'

export type YamlVersion = '1.1' | '1.2'

export interface YamlValidationIssue {
  message: string
  line?: number
  column?: number
  /** Source offsets, for the editor gutter. */
  from?: number
  to?: number
  /** Zero-based index of the document in the stream. */
  docIndex?: number
}

export interface YamlValidationResult {
  isValid: boolean
  errors: YamlValidationIssue[]
  warnings: YamlValidationIssue[]
  /** One document gives its value. More than one gives an array. */
  parsed: unknown | null
  documents: unknown[]
  documentCount: number
  formattedJson: string
}

/** A duplicate key does not stop the parse, so the tool reports it as a warning. */
const WARNING_CODES = new Set(['DUPLICATE_KEY'])

function toIssue(
  err: { message: string, pos?: [number, number], linePos?: any },
  docIndex: number,
): YamlValidationIssue {
  const linePos = err.linePos?.[0]
  return {
    message: err.message,
    line: linePos?.line,
    column: linePos?.col,
    from: err.pos?.[0],
    to: err.pos?.[1],
    docIndex,
  }
}

function emptyResult(): YamlValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    parsed: null,
    documents: [],
    documentCount: 0,
    formattedJson: '',
  }
}

export function validateYaml(
  yamlText: string,
  version: YamlVersion = '1.2',
): YamlValidationResult {
  if (!yamlText.trim()) {
    return emptyResult()
  }

  const docs = YAML.parseAllDocuments(yamlText, { version })
  const errors: YamlValidationIssue[] = []
  const warnings: YamlValidationIssue[] = []

  docs.forEach((doc, docIndex) => {
    for (const err of doc.errors) {
      const issue = toIssue(err, docIndex)
      if (WARNING_CODES.has(err.code)) {
        warnings.push(issue)
      }
      else {
        errors.push(issue)
      }
    }
    for (const warn of doc.warnings) {
      warnings.push(toIssue(warn, docIndex))
    }
  })

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      parsed: null,
      documents: [],
      documentCount: docs.length,
      formattedJson: '',
    }
  }

  const documents = docs.map(doc => doc.toJS())
  const parsed = documents.length === 1 ? documents[0] : documents

  let formattedJson = ''
  try {
    formattedJson = JSON.stringify(parsed, null, 2)
  }
  catch (cause) {
    // A circular anchor alias gives a value that JSON cannot hold. Report it
    // instead of an empty screen.
    const message = cause instanceof Error && /cyclic|circular/i.test(cause.message)
      ? 'This document uses a circular anchor alias. JSON cannot hold a circular structure.'
      : 'This document cannot convert to JSON.'
    return {
      isValid: false,
      errors: [{ message }],
      warnings,
      parsed,
      documents,
      documentCount: docs.length,
      formattedJson: '',
    }
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    parsed,
    documents,
    documentCount: docs.length,
    formattedJson,
  }
}

export function createYamlLinter(getVersion: () => YamlVersion = () => '1.2'): Extension {
  return [
    lintGutter(),
    linter((view): Diagnostic[] => {
      const text = view.state.doc.toString()
      if (!text.trim()) {
        return []
      }

      const docLength = view.state.doc.length
      const result = validateYaml(text, getVersion())
      const issues = [
        ...result.errors.map(issue => ({ issue, severity: 'error' as const })),
        ...result.warnings.map(issue => ({ issue, severity: 'warning' as const })),
      ]

      return issues.map(({ issue, severity }) => {
        const from = Math.min(issue.from ?? 0, docLength)
        const to = Math.min(Math.max(issue.to ?? from + 1, from), docLength)
        return {
          from,
          to,
          severity,
          message: issue.message,
        }
      })
    }),
  ]
}
