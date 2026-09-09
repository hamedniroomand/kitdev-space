import type { OutputUnit, Schema, SchemaDraft } from '@cfworker/json-schema'
import { format, Validator } from '@cfworker/json-schema'

export interface SchemaValidationError {
  path: string
  message: string
  keyword: string
  schemaPath: string
}

export interface SchemaErrorBranchGroup {
  keyword: 'anyOf' | 'oneOf'
  path: string
  /** Pointer of the `anyOf` or `oneOf` keyword in the schema. */
  schemaPath: string
  message: string
  branches: Array<{ index: number, errors: SchemaValidationError[] }>
}

export interface SchemaValidationResult {
  isValid: boolean
  draft?: string
  schemaError?: string
  dataError?: string
  refError?: string
  errors: SchemaValidationError[]
  /** `anyOf` and `oneOf` failures, split by the branch that produced each error. */
  branchGroups: SchemaErrorBranchGroup[]
  /** The `$id` of each local schema that resolved a `$ref`. */
  resolvedRefIds: string[]
}

// The validator walks the schema as an interpreter. It writes no code at run
// time, so it works under a Content Security Policy with no 'unsafe-eval'.
// It ships no ipv4 and ipv6 format, so add both.
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const IPV6 = /^(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}|:(?:(?::[0-9a-f]{1,4}){1,7}|:)|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d))$/i
format.ipv4 ??= (value: string) => IPV4.test(value)
format.ipv6 ??= (value: string) => IPV6.test(value)

export interface DetectedDraft {
  draft: SchemaDraft
  displayDraft: string
  error?: string
}

/** Reads the draft from `$schema`. A schema with no `$schema` uses draft 2020-12. */
export function detectSchemaDraft(schema: unknown): DetectedDraft {
  if (typeof schema === 'boolean') {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  const id = schema && typeof schema === 'object' ? String((schema as Schema).$schema ?? '') : ''
  if (!id) {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  if (id.includes('draft-04')) {
    return { draft: '4', displayDraft: 'draft-04' }
  }
  if (id.includes('draft-06')) {
    return { draft: '7', displayDraft: 'draft-06' }
  }
  if (id.includes('draft-07')) {
    return { draft: '7', displayDraft: 'draft-07' }
  }
  if (id.includes('2019-09')) {
    return { draft: '2019-09', displayDraft: '2019-09' }
  }
  if (id.includes('2020-12')) {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  if (/draft-0?[123]/i.test(id)) {
    return {
      draft: '2020-12',
      displayDraft: id,
      error: `Unsupported JSON Schema draft: "${id}". Supported drafts are draft-04, draft-06, draft-07, 2019-09, and 2020-12.`,
    }
  }

  return { draft: '2020-12', displayDraft: '2020-12' }
}

/** Keywords that only wrap the errors of their children. The child error names the real problem. */
const CONTAINER_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'items',
  'prefixItems',
  'allOf',
  'anyOf',
  'oneOf',
  'then',
  'else',
  'dependentSchemas',
  'contains',
  'unevaluatedProperties',
  'unevaluatedItems',
  '$ref',
])

function toPath(location: string): string {
  const path = location.replace(/^#/, '')
  return path || '/'
}

function toErrors(units: OutputUnit[]): SchemaValidationError[] {
  const leaves = units.filter(unit => !CONTAINER_KEYWORDS.has(unit.keyword))
  return (leaves.length ? leaves : units).map(unit => ({
    path: toPath(unit.instanceLocation),
    message: unit.error,
    keyword: unit.keyword,
    schemaPath: unit.keywordLocation,
  }))
}

const BRANCH_KEYWORD = /\/(anyOf|oneOf)\/(\d+)(?=\/|$)/

/**
 * Splits each `anyOf` and `oneOf` failure by branch. The branch index sits in
 * the keyword location, such as `#/properties/v/anyOf/1/type`, so a reader can
 * see why every branch failed instead of one flat list.
 */
export function groupBranchErrors(units: OutputUnit[]): SchemaErrorBranchGroup[] {
  const groups = new Map<string, SchemaErrorBranchGroup>()

  for (const unit of units) {
    if (unit.keyword !== 'anyOf' && unit.keyword !== 'oneOf') {
      continue
    }
    groups.set(unit.keywordLocation, {
      keyword: unit.keyword,
      path: toPath(unit.instanceLocation),
      schemaPath: unit.keywordLocation,
      message: unit.error,
      branches: [],
    })
  }

  for (const unit of units) {
    const match = unit.keywordLocation.match(BRANCH_KEYWORD)
    if (!match) {
      continue
    }
    const groupPath = unit.keywordLocation.slice(0, match.index! + match[1]!.length + 1)
    const group = groups.get(groupPath)
    if (!group || CONTAINER_KEYWORDS.has(unit.keyword)) {
      continue
    }
    const index = Number(match[2])
    const branch = group.branches.find(b => b.index === index)
    const error: SchemaValidationError = {
      path: toPath(unit.instanceLocation),
      message: unit.error,
      keyword: unit.keyword,
      schemaPath: unit.keywordLocation,
    }
    if (branch) {
      branch.errors.push(error)
    }
    else {
      group.branches.push({ index, errors: [error] })
    }
  }

  for (const group of groups.values()) {
    group.branches.sort((a, b) => a.index - b.index)
  }

  return Array.from(groups.values())
}

const REMOTE_REF = /^https?:\/\//i

function collectRefs(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(item, found)
    }
    return
  }
  if (!node || typeof node !== 'object') {
    return
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      found.add(value)
    }
    else {
      collectRefs(value, found)
    }
  }
}

/**
 * Reads the referenced schemas that the user supplies, keyed by `$id`. The
 * tool never fetches a schema over the network, so every `$ref` must resolve
 * against this list.
 */
export function parseRefSchemas(refInput: string): {
  schemas: Record<string, unknown>
  error?: string
} {
  const trimmed = refInput.trim()
  if (!trimmed) {
    return { schemas: {} }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  }
  catch (err) {
    return {
      schemas: {},
      error: `Referenced schema parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
    }
  }

  const list = Array.isArray(parsed) ? parsed : [parsed]
  const schemas: Record<string, unknown> = {}
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { schemas: {}, error: 'Each referenced schema must be a JSON object with an "$id".' }
    }
    const id = (entry as Record<string, unknown>).$id
    if (typeof id !== 'string' || !id) {
      return { schemas: {}, error: 'Each referenced schema needs an "$id" to resolve a "$ref".' }
    }
    schemas[id] = entry
  }
  return { schemas }
}

export function validateJsonSchema(
  schemaInput: string,
  dataInput: string,
  refSchemasInput = '',
): SchemaValidationResult {
  const trimmedSchema = schemaInput.trim()
  const trimmedData = dataInput.trim()

  if (!trimmedSchema || !trimmedData) {
    return {
      isValid: true,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  let parsedSchema: unknown
  try {
    parsedSchema = JSON.parse(trimmedSchema)
  }
  catch (err) {
    return {
      isValid: false,
      schemaError: `Schema JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  let parsedData: unknown
  try {
    parsedData = JSON.parse(trimmedData)
  }
  catch (err) {
    return {
      isValid: false,
      schemaError: undefined,
      dataError: `Data JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  const isObject = typeof parsedSchema === 'object' && parsedSchema !== null && !Array.isArray(parsedSchema)
  const isBoolean = typeof parsedSchema === 'boolean'

  if (!isObject && !isBoolean) {
    return {
      isValid: false,
      schemaError: 'Invalid JSON Schema definition: the schema must be a JSON object or boolean.',
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  const { draft, displayDraft, error: draftError } = detectSchemaDraft(parsedSchema)
  if (draftError) {
    return {
      isValid: false,
      draft: displayDraft,
      schemaError: draftError,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  const { schemas: refSchemas, error: refParseError } = parseRefSchemas(refSchemasInput)
  if (refParseError) {
    return {
      isValid: false,
      draft: displayDraft,
      refError: refParseError,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  const refs = new Set<string>()
  collectRefs(parsedSchema, refs)
  const unresolved = Array.from(refs).filter(
    ref => REMOTE_REF.test(ref) && !refSchemas[ref] && !refSchemas[ref.replace(/#.*$/, '')],
  )
  if (unresolved.length > 0) {
    return {
      isValid: false,
      draft: displayDraft,
      refError: `This tool never fetches a schema over the network. Add the schema for ${unresolved.join(', ')} in the referenced schemas pane, keyed by "$id".`,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  const resolvedRefIds = Object.keys(refSchemas)

  let result: ReturnType<Validator['validate']>
  try {
    // `shortCircuit: false` collects every error instead of the first one.
    const validator = new Validator(parsedSchema as Schema, draft, false)
    for (const schema of Object.values(refSchemas)) {
      validator.addSchema(schema as Schema)
    }
    result = validator.validate(parsedData)
  }
  catch (err) {
    return {
      isValid: false,
      draft: displayDraft,
      schemaError: `Invalid JSON Schema definition: ${err instanceof Error ? err.message : 'Schema error'}`,
      errors: [],
      branchGroups: [],
      resolvedRefIds: [],
    }
  }

  if (result.valid) {
    return {
      isValid: true,
      draft: displayDraft,
      errors: [],
      branchGroups: [],
      resolvedRefIds,
    }
  }

  return {
    isValid: false,
    draft: displayDraft,
    errors: toErrors(result.errors),
    branchGroups: groupBranchErrors(result.errors),
    resolvedRefIds,
  }
}

function mergeObjectSchemas(objects: Record<string, unknown>[]): Record<string, unknown> {
  const propKeys = new Set<string>()
  for (const obj of objects) {
    for (const k of Object.keys(obj)) {
      propKeys.add(k)
    }
  }

  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const key of propKeys) {
    const valuesWithKey: unknown[] = []
    let presentInAll = true
    for (const obj of objects) {
      if (Object.hasOwn(obj, key)) {
        valuesWithKey.push(obj[key])
      }
      else {
        presentInAll = false
      }
    }

    if (presentInAll) {
      required.push(key)
    }

    const types = new Set(valuesWithKey.map(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)))
    if (types.size === 1) {
      if (types.has('object')) {
        properties[key] = mergeObjectSchemas(valuesWithKey as Record<string, unknown>[])
      }
      else {
        properties[key] = generateSchemaFromJson(valuesWithKey[0])
      }
    }
    else {
      const anyOf = Array.from(types).map((t) => {
        const sampleVal = valuesWithKey.find(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v) === t)
        return generateSchemaFromJson(sampleVal)
      })
      properties[key] = { anyOf }
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

export function generateSchemaFromJson(data: unknown): Record<string, unknown> {
  if (data === null)
    return { type: 'null' }
  if (Array.isArray(data)) {
    if (data.length === 0)
      return { type: 'array', items: {} }

    const allObjects = data.every(item => item && typeof item === 'object' && !Array.isArray(item))
    if (allObjects) {
      return {
        type: 'array',
        items: mergeObjectSchemas(data as Record<string, unknown>[]),
      }
    }

    const types = new Set(data.map(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)))
    if (types.size === 1) {
      return {
        type: 'array',
        items: generateSchemaFromJson(data[0]),
      }
    }

    const anyOf = Array.from(types).map((t) => {
      const sampleVal = data.find(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v) === t)
      return generateSchemaFromJson(sampleVal)
    })
    return {
      type: 'array',
      items: { anyOf },
    }
  }
  const type = typeof data
  if (type === 'string')
    return { type: 'string' }
  if (type === 'number')
    return { type: Number.isInteger(data) ? 'integer' : 'number' }
  if (type === 'boolean')
    return { type: 'boolean' }
  if (type === 'object') {
    return mergeObjectSchemas([data as Record<string, unknown>])
  }
  return {}
}

export interface SchemaTestCase {
  name: string
  data: unknown
  /** The result the author expects. Defaults to a payload that must pass. */
  expectValid?: boolean
}

export interface SchemaTestCaseResult {
  name: string
  isValid: boolean
  /** True when the outcome matches `expectValid`. */
  passed: boolean
  expectValid: boolean
  errorCount: number
  firstError?: string
}

export function parseTestCases(input: string): {
  cases: SchemaTestCase[]
  error?: string
} {
  const trimmed = input.trim()
  if (!trimmed) {
    return { cases: [] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  }
  catch (err) {
    return {
      cases: [],
      error: `Test case parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
    }
  }

  if (!Array.isArray(parsed)) {
    return { cases: [], error: 'Test cases must be a JSON array.' }
  }

  const cases: SchemaTestCase[] = []
  for (const [index, entry] of parsed.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { cases: [], error: `Test case ${index + 1} must be a JSON object.` }
    }
    const row = entry as Record<string, unknown>
    if (!Object.hasOwn(row, 'data')) {
      return { cases: [], error: `Test case ${index + 1} needs a "data" field.` }
    }
    cases.push({
      name: typeof row.name === 'string' && row.name ? row.name : `Case ${index + 1}`,
      data: row.data,
      expectValid: typeof row.expectValid === 'boolean' ? row.expectValid : true,
    })
  }
  return { cases }
}

export function runSchemaTestCases(
  schemaInput: string,
  cases: SchemaTestCase[],
  refSchemasInput = '',
): SchemaTestCaseResult[] {
  return cases.map((testCase) => {
    const expectValid = testCase.expectValid ?? true
    const result = validateJsonSchema(
      schemaInput,
      JSON.stringify(testCase.data),
      refSchemasInput,
    )
    const isValid = result.isValid
    return {
      name: testCase.name,
      isValid,
      expectValid,
      passed: isValid === expectValid,
      errorCount: result.errors.length,
      firstError: result.errors[0]?.message ?? result.schemaError ?? result.refError,
    }
  })
}
