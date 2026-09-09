<script setup lang="ts">
import type { EditorView } from '@codemirror/view'
import type { RegexTestCase, RegexTestCaseFile, RegexTestResult } from '#shared/utils/dev/regex'
import type { RegexWorkerRequest, RegexWorkerResponse } from '~/workers/regex.worker'
import { captureEditorView } from '#shared/utils/dev/editor-cursor'
import { applyReplacement, REGEX_SYNTAX_NOTES, testRegex } from '#shared/utils/dev/regex'
import { pushRegexMatches, regexMatchHighlight } from '#shared/utils/dev/regex-highlight'

const TIMEOUT_MS = 2000

const pattern = ref('\\b(?<word>[A-Z][a-z]+)\\b')
const sample = ref('Hello world. KitDev Space helps builders ship tools.')
const replacement = ref('[$<word>]')
const testCases = ref<RegexTestCase[]>([
  { text: 'Hello', expectMatch: true },
  { text: 'hello', expectMatch: false },
])
const flags = ref({
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
  v: false,
  y: false,
  // Group positions come from the d flag. Without it the editor marks the
  // whole match only, and the group list shows no range.
  d: true,
})

useToolSeo('regex-tester')

const flagString = computed(() => {
  return (Object.keys(flags.value) as Array<keyof typeof flags.value>)
    .filter(key => flags.value[key])
    .join('')
})

const result = ref<RegexTestResult>(testRegex(pattern.value, sample.value, flagString.value))
const isExecuting = ref(false)
/** One entry for each test case: did the pattern match that string. */
const caseMatched = ref<boolean[]>([])

interface PendingRun {
  resolve: (value: RegexTestResult) => void
  reject: (error: Error) => void
}

const pending = new Map<number, PendingRun>()
let worker: Worker | null = null
let currentRunId = 0
let generation = 0
let timeoutHandle: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle)
    timeoutHandle = null
  }
}

function armTimer() {
  clearTimer()
  timeoutHandle = setTimeout(handleTimeout, TIMEOUT_MS)
}

function initWorker() {
  if (!import.meta.client) {
    return
  }
  worker?.terminate()
  worker = new Worker(new URL('../../../workers/regex.worker.ts', import.meta.url), {
    type: 'module',
  })
  worker.onmessage = (event: MessageEvent<RegexWorkerResponse>) => {
    const run = pending.get(event.data.id)
    if (!run) {
      return
    }
    pending.delete(event.data.id)
    run.resolve(event.data.result)
    // The timer measures worker progress, not total time. Every answer resets
    // it, so a large suite never trips the backtracking guard.
    if (pending.size) {
      armTimer()
    }
    else {
      clearTimer()
    }
  }
}

function failedResult(message: string): RegexTestResult {
  return {
    pattern: pattern.value,
    flags: flagString.value,
    valid: false,
    error: message,
    matches: [],
    explanations: [],
  }
}

/** Stops every run, throws the worker away, and keeps the input. */
function abortRuns(message: string) {
  for (const run of pending.values()) {
    run.reject(new Error(message))
  }
  pending.clear()
  clearTimer()
  generation += 1
  isExecuting.value = false
  initWorker()
  result.value = failedResult(message)
  caseMatched.value = []
}

function handleStop() {
  if (isExecuting.value) {
    abortRuns('Execution stopped by user.')
  }
}

function handleTimeout() {
  if (isExecuting.value) {
    abortRuns('Execution timed out after 2 seconds. The pattern may contain catastrophic backtracking.')
  }
}

function requestRun(text: string): Promise<RegexTestResult> {
  if (!worker) {
    initWorker()
  }
  currentRunId += 1
  const id = currentRunId
  return new Promise<RegexTestResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker?.postMessage({
      id,
      pattern: pattern.value,
      sample: text,
      flags: flagString.value,
    } satisfies RegexWorkerRequest)
    armTimer()
  })
}

const runTest = useDebounceFn(async () => {
  if (!import.meta.client || typeof Worker === 'undefined') {
    result.value = testRegex(pattern.value, sample.value, flagString.value)
    return
  }

  generation += 1
  const runGeneration = generation
  isExecuting.value = true

  try {
    const [main, ...cases] = await Promise.all([
      requestRun(sample.value),
      ...testCases.value.map(item => requestRun(item.text)),
    ])
    if (runGeneration !== generation) {
      return
    }
    clearTimer()
    isExecuting.value = false
    result.value = main!
    caseMatched.value = cases.map(item => item.matches.length > 0)
  }
  catch {
    // `abortRuns` already reported the error and kept the input.
  }
}, 100)

watch([pattern, sample, flagString, testCases], () => {
  runTest()
}, { deep: true })

onMounted(() => {
  initWorker()
})

onUnmounted(() => {
  clearTimer()
  pending.clear()
  worker?.terminate()
  worker = null
})

// The u flag and the v flag cannot both be set. The engine rejects the pair.
watch(() => flags.value.u, (on) => {
  if (on) {
    flags.value.v = false
  }
})
watch(() => flags.value.v, (on) => {
  if (on) {
    flags.value.u = false
  }
})

const BASE_FLAGS = [
  { key: 'g' as const, label: 'g', hint: 'Global' },
  { key: 'i' as const, label: 'i', hint: 'Ignore case' },
  { key: 'm' as const, label: 'm', hint: 'Multiline' },
  { key: 's' as const, label: 's', hint: 'DotAll' },
  { key: 'u' as const, label: 'u', hint: 'Unicode' },
  { key: 'y' as const, label: 'y', hint: 'Sticky' },
]

/** These flags need a recent engine, so the page tests them before it shows them. */
const MODERN_FLAGS = [
  { key: 'v' as const, label: 'v', hint: 'Unicode sets' },
  { key: 'd' as const, label: 'd', hint: 'Match indices' },
]

function supportsFlag(flag: string): boolean {
  try {
    return new RegExp('a', flag).flags.includes(flag)
  }
  catch {
    return false
  }
}

const modernFlags = ref<typeof MODERN_FLAGS>([])
onMounted(() => {
  const supported = MODERN_FLAGS.filter(item => supportsFlag(item.key))
  for (const item of MODERN_FLAGS) {
    if (!supported.includes(item)) {
      flags.value[item.key] = false
    }
  }
  modernFlags.value = supported
})

const flagItems = computed(() => [...BASE_FLAGS, ...modernFlags.value])
const flagKeys = computed(() => new Set<string>(flagItems.value.map(item => item.key)))

/** A dropped suite carries its own pattern and flags. Both come back. */
function handleRestore(file: RegexTestCaseFile) {
  if (!file.pattern) {
    return
  }
  pattern.value = file.pattern
  for (const key of Object.keys(flags.value) as Array<keyof typeof flags.value>) {
    flags.value[key] = file.flags.includes(key) && flagKeys.value.has(key)
  }
}

const editorView = shallowRef<EditorView | null>(null)
const editorExtensions = [
  regexMatchHighlight(),
  captureEditorView((view) => {
    editorView.value = view
    pushRegexMatches(view, result.value.matches)
  }),
]

watch(() => result.value.matches, (matches) => {
  pushRegexMatches(editorView.value, matches)
})

const replacementPreview = computed(() => (
  applyReplacement(sample.value, result.value.matches, replacement.value)
))

const caseStatuses = computed(() => testCases.value.map((item, index) => {
  const matched = caseMatched.value[index]
  if (!result.value.valid || matched === undefined) {
    return 'unknown' as const
  }
  return matched === item.expectMatch ? 'pass' as const : 'fail' as const
}))

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

function handleClear() {
  pattern.value = ''
  sample.value = ''
  replacement.value = ''
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in a Web Worker with a 2-second timeout to protect against catastrophic backtracking."
    />

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">Engine</span>
      <UBadge
        color="neutral"
        variant="subtle"
        icon="i-lucide-cpu"
      >
        ECMAScript (this browser)
      </UBadge>
    </div>

    <UFormField label="Pattern">
      <UInput
        v-model="pattern"
        placeholder="Enter a regular expression"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <div
      class="flex flex-wrap gap-x-5 gap-y-2"
      role="group"
      aria-label="Flags"
    >
      <UCheckbox
        v-for="item in flagItems"
        :key="item.key"
        v-model="flags[item.key]"
        :label="`${item.label} (${item.hint})`"
      />
    </div>

    <UFormField
      label="Replacement"
      description="Use $1 for a numbered group, $<name> for a named group, and $& for the whole match."
    >
      <UInput
        v-model="replacement"
        placeholder="Enter replacement text"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <LazyToolEditor
      v-model="sample"
      hydrate-on-idle
      label="Sample text"
      placeholder="Paste text to test against the pattern"
      :rows="8"
      :extensions="editorExtensions"
    />

    <RegexTestCases
      v-model="testCases"
      :statuses="caseStatuses"
      :pattern="pattern"
      :flags="result.flags"
      @restore="handleRestore"
    />

    <ToolActions>
      <UButton
        v-if="isExecuting"
        label="Stop"
        color="error"
        variant="subtle"
        icon="i-lucide-square"
        @click="handleStop"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="result.error"
      :message="result.error"
    />

    <div
      v-else
      class="space-y-6"
    >
      <section class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            Matches
          </h2>
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ result.matches.length }}
          </UBadge>
          <p class="font-mono text-xs text-muted">
            /{{ result.pattern }}/{{ result.flags }}
          </p>
        </div>

        <p class="text-xs text-muted">
          The editor above marks each match. Capture groups get their own color.
        </p>

        <ul
          v-if="result.matches.length"
          class="space-y-3"
        >
          <li
            v-for="match in result.matches"
            :key="match.index"
            class="rounded-md border border-default p-3"
          >
            <p class="font-mono text-sm text-highlighted">
              Match {{ match.index + 1 }} · {{ match.start }}–{{ match.end }} · {{ match.match }}
            </p>
            <ul
              v-if="match.groups.length"
              class="mt-2 space-y-1"
            >
              <li
                v-for="group in match.groups"
                :key="`${match.index}-${group.index}-${group.name || 'g'}`"
                class="font-mono text-xs text-muted"
              >
                #{{ group.index }}
                <span v-if="group.name"> ({{ group.name }})</span>
                :
                <span class="text-highlighted">{{ group.value ?? 'undefined' }}</span>
                <span v-if="group.start !== null && group.end !== null">
                  · {{ group.start }}–{{ group.end }}
                </span>
              </li>
            </ul>
            <p
              v-else
              class="mt-2 text-sm text-muted"
            >
              No capture groups.
            </p>
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            Replacement preview
          </h2>
          <UButton
            class="ms-auto"
            size="xs"
            :color="copyColor('Replacement preview')"
            variant="subtle"
            :icon="copyIcon('Replacement preview')"
            :label="copyLabel('Replacement preview')"
            :disabled="!replacementPreview"
            @click="copy(replacementPreview, 'Replacement preview')"
          />
        </div>
        <p
          class="min-h-12 whitespace-pre-wrap break-words rounded-md border border-default p-3 font-mono text-sm leading-relaxed text-highlighted"
          aria-label="Replacement preview"
          v-text="replacementPreview"
        />
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          Token explanation
        </h2>
        <ul
          v-if="result.explanations.length"
          class="divide-y divide-default rounded-md border border-default"
        >
          <li
            v-for="(item, index) in result.explanations"
            :key="`${item.index}-${index}`"
            class="flex flex-wrap gap-3 px-3 py-2 text-sm"
          >
            <code class="font-mono text-highlighted">{{ item.token }}</code>
            <span class="text-muted">{{ item.meaning }}</span>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-muted"
        >
          Enter a pattern to see token explanations.
        </p>
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About the RegEx tester">
        <div class="space-y-4 text-muted">
          <p>
            This tool tests a regular expression against sample text in the browser.
          </p>
          <p>
            The editor marks each match. Capture groups list names and indices when present.
          </p>
          <p>
            The engine is the regular expression engine of this browser. Other engines, such as
            PCRE or Python, can give a different result for the same pattern.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-medium text-highlighted">
            Modern syntax
          </h3>
          <dl class="divide-y divide-default rounded-md border border-default">
            <div
              v-for="note in REGEX_SYNTAX_NOTES"
              :key="note.syntax"
              class="px-3 py-2 text-sm"
            >
              <dt class="font-medium text-highlighted">
                {{ note.title }}
                <code class="ms-1 font-mono text-xs text-muted">{{ note.syntax }}</code>
              </dt>
              <dd class="text-muted">
                {{ note.meaning }}
                <span class="font-mono text-xs">{{ note.example }}</span>
              </dd>
            </div>
          </dl>
        </div>

        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Case and Slug Converter', to: '/hub/dev/case-converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
