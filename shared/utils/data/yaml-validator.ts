import YAML from 'yaml'

export interface YamlValidationError {
  message: string
  line?: number
  column?: number
}

export interface YamlValidationResult {
  isValid: boolean
  errors: YamlValidationError[]
  parsed: unknown | null
  formattedJson: string
}

export function validateYaml(yamlText: string): YamlValidationResult {
  const trimmed = yamlText.trim()
  if (!trimmed) {
    return {
      isValid: true,
      errors: [],
      parsed: null,
      formattedJson: ''
    }
  }

  const doc = YAML.parseDocument(yamlText)

  if (doc.errors.length > 0) {
    const errors: YamlValidationError[] = doc.errors.map((err) => {
      const linePos = err.linePos?.[0]
      return {
        message: err.message,
        line: linePos?.line,
        column: linePos?.col
      }
    })

    return {
      isValid: false,
      errors,
      parsed: null,
      formattedJson: ''
    }
  }

  const parsed = doc.toJS()
  let formattedJson = ''
  try {
    formattedJson = JSON.stringify(parsed, null, 2)
  } catch {
    // Leave formattedJson as empty string
  }

  return {
    isValid: true,
    errors: [],
    parsed,
    formattedJson
  }
}
