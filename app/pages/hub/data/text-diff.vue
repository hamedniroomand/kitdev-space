<script setup lang="ts">
import type { DiffResult } from '#shared/utils/data/diff'
import { diffTexts, formatUnifiedDiff } from '#shared/utils/data/diff'

const WORKER_CHARS = 80_000

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
const { status, error, run, reset } = useTool<DiffResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const {
  execute: workerCompare,
  isRunning: workerRunning,
  stop: stopWorker,
} = useToolWorker(
  (input: { left: string, right: string }) => diffTexts(input.left, input.right),
  {
    timeout: 30_000,
    localDependencies: [diffTexts],
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
    const next = size >= WORKER_CHARS
      ? await workerCompare({ left: left.value, right: right.value })
      : diffTexts(left.value, right.value)

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
