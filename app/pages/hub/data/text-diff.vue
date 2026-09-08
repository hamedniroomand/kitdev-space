import type { DiffOptions, DiffResult } from '#shared/utils/data/diff'
import { diffTexts, formatUnifiedDiff } from '#shared/utils/data/diff'
import { applyWordDiff, diffLineWords, diffTokens, mergeSpans, tokenizeWords } from '#shared/utils/data/word-diff'

const WORKER_CHARS = 40_000
const WORKER_LINES = 500
const MAX_LINES_WARNING = 100_000

const left = ref(`function greet(name) {
  return "Hello, " + name
}
`)
const right = ref(`function greet(name) {
  return \`Hello, \${name}!\`
}
`)
const diff = ref<DiffResult | null>(null)
const unified = ref('')
const leftFileName = ref('')
const rightFileName = ref('')

const leftLines = computed(() => (left.value ? (left.value.match(/\n/g)?.length ?? 0) + 1 : 0))
const rightLines = computed(() => (right.value ? (right.value.match(/\n/g)?.length ?? 0) + 1 : 0))
const lineCount = computed(() => Math.max(leftLines.value, rightLines.value))
const exceedsLineLimit = computed(() => lineCount.value > MAX_LINES_WARNING || (leftLines.value + rightLines.value) > MAX_LINES_WARNING)

const ignoreWhitespace = useToolOption<boolean>('ignore-whitespace', false)
const ignoreTrailingWhitespace = useToolOption<boolean>('ignore-trailing-whitespace', false)
const ignoreCase = useToolOption<boolean>('ignore-case', false)
const ignoreBlankLines = useToolOption<boolean>('ignore-blank-lines', false)
const ignoreLineEndings = useToolOption<boolean>('ignore-line-endings', true)

const diffOptions = computed<DiffOptions>(() => ({
  ignoreWhitespace: ignoreWhitespace.value,
  ignoreTrailingWhitespace: ignoreTrailingWhitespace.value,
  ignoreCase: ignoreCase.value,
  ignoreBlankLines: ignoreBlankLines.value,
  ignoreLineEndings: ignoreLineEndings.value,
}))

watch(
  [ignoreWhitespace, ignoreTrailingWhitespace, ignoreCase, ignoreBlankLines, ignoreLineEndings],
  () => {
    compare()
  },
)

const { status, error, run, reset } = useTool<DiffResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const {
  execute: workerCompare,
  isRunning: workerRunning,
  stop: stopWorker,
} = useToolWorker(
  (input: { left: string, right: string, options?: DiffOptions }) => diffTexts(input.left, input.right, input.options),
  {
    timeout: 30_000,
    localDependencies: [
      diffTexts,
      applyWordDiff,
      diffLineWords,
      diffTokens,
      tokenizeWords,
      mergeSpans,
    ],
  },
)

useToolSeo('text-diff')

onMounted(() => {
  compare()
})

const statusMeta = computed(() => {
  if (!diff.value) {
    return ''
  }
  return `${diff.value.added} added · ${diff.value.removed} removed · ${diff.value.unchanged} unchanged`
})

async function compare() {
  await run(async () => {
    const size = left.value.length + right.value.length
    const totalLines = leftLines.value + rightLines.value
    const options = diffOptions.value
    const shouldUseWorker = size >= WORKER_CHARS || totalLines >= WORKER_LINES

    let next: DiffResult
    if (shouldUseWorker) {
      try {
        next = await workerCompare({ left: left.value, right: right.value, options })
      }
      catch {
        next = diffTexts(left.value, right.value, options)
      }
    }
    else {
      next = diffTexts(left.value, right.value, options)
    }

    diff.value = next
    const oldPath = leftFileName.value ? `a/${leftFileName.value}` : 'original'
    const newPath = rightFileName.value
      ? `b/${rightFileName.value}`
      : (leftFileName.value ? `b/${leftFileName.value}` : 'modified')
    unified.value = formatUnifiedDiff(next, oldPath, newPath)
    return next
  })
}

async function handleCopy() {
  if (!unified.value) {
    return
  }
  await copy(unified.value)
}

function handleDownloadPatch() {
  if (!diff.value || (diff.value.added === 0 && diff.value.removed === 0)) {
    return
  }
  const oldPath = leftFileName.value ? `a/${leftFileName.value}` : 'a/file.txt'
  const newPath = rightFileName.value
    ? `b/${rightFileName.value}`
    : (leftFileName.value ? `b/${leftFileName.value}` : 'b/file.txt')
  const patch = formatUnifiedDiff(diff.value, oldPath, newPath)
  const baseName = (leftFileName.value || rightFileName.value || 'changes').replace(/\.[^/.]+$/, '')
  downloadText(`${baseName}.patch`, patch, 'text/x-diff')
}

async function handleFilesDropped(files: File[], defaultTarget: 'left' | 'right') {
  if (!files || files.length === 0) {
    return
  }
  if (files.length >= 2) {
    const file1 = files[0]!
    const file2 = files[1]!
    leftFileName.value = file1.name
    rightFileName.value = file2.name
    left.value = await file1.text()
    right.value = await file2.text()
    await compare()
    return
  }
  const file = files[0]!
  if (defaultTarget === 'left') {
    leftFileName.value = file.name
  }
  else {
    rightFileName.value = file.name
  }
}

function onLeftFileLoaded(file: File) {
  leftFileName.value = file.name
}

function onRightFileLoaded(file: File) {
  rightFileName.value = file.name
}

function handleSwap() {
  const previous = left.value
  left.value = right.value
  right.value = previous
  const prevName = leftFileName.value
  leftFileName.value = rightFileName.value
  rightFileName.value = prevName
}

function handleClear() {
  left.value = ''
  right.value = ''
  leftFileName.value = ''
  rightFileName.value = ''
  diff.value = null
  unified.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => compare(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Large texts use a web worker."
    />

    <UAlert
      v-if="exceedsLineLimit || diff?.warning"
      color="warning"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Large input warning"
      :description="diff?.warning || 'Input exceeds 100,000 lines. Comparison can take more time.'"
    />

    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-default bg-muted/20 p-3 text-sm">
      <USwitch
        v-model="ignoreWhitespace"
        label="Ignore whitespace"
      />
      <USwitch
        v-model="ignoreTrailingWhitespace"
        label="Ignore trailing whitespace"
      />
      <USwitch
        v-model="ignoreCase"
        label="Ignore case"
      />
      <USwitch
        v-model="ignoreBlankLines"
        label="Ignore blank lines"
      />
      <USwitch
        v-model="ignoreLineEndings"
        label="Ignore line endings"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <LazyToolEditor
        v-model="left"
        hydrate-on-idle
        label="Original"
        placeholder="Paste original text"
        @file-loaded="onLeftFileLoaded"
        @files-dropped="(files) => handleFilesDropped(files, 'left')"
      />
      <LazyToolEditor
        v-model="right"
        hydrate-on-idle
        label="Modified"
        placeholder="Paste modified text"
        @file-loaded="onRightFileLoaded"
        @files-dropped="(files) => handleFilesDropped(files, 'right')"
      />
    </div>

    <ToolActions>
      <UButton
        label="Compare"
        icon="i-lucide-git-compare"
        :loading="status === 'processing'"
        @click="compare"
      />
      <UButton
        v-if="workerRunning"
        label="Stop"
        color="error"
        variant="subtle"
        icon="i-lucide-square"
        @click="stopWorker"
      />
      <UButton
        label="Swap"
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-left-right"
        @click="handleSwap"
      />
      <UButton
        :label="copyLabel('default', 'Copy unified')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!unified"
        @click="handleCopy"
      />
      <UButton
        label="Download patch"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!diff || (diff.added === 0 && diff.removed === 0)"
        @click="handleDownloadPatch"
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
      v-if="error"
      :message="error"
    />

    <template v-if="diff">
      <ToolStatus
        v-if="status === 'success'"
        :message="diff.added === 0 && diff.removed === 0 ? 'Texts match' : 'Diff ready'"
        :meta="statusMeta"
      />

      <ClientOnly v-if="diff.lines.length > 0">
        <DiffResult :lines="diff.lines" />
      </ClientOnly>
    </template>

    <template #docs>
      <ToolDocs title="About text diff">
        <div class="space-y-4 text-muted">
          <p>
            This tool compares two texts line by line and shows inserts and deletes.
          </p>
          <p>
            Paste original text on the left and modified text on the right. Select Compare to create the result.
          </p>
          <p>
            The tool uses an optimized Myers diff. It skips shared start and end lines so long similar texts stay fast.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'Semver Calculator', to: '/hub/dev/semver' },
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
