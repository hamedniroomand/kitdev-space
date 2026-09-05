<script setup lang="ts">
import type { DiffResult } from '~~/shared/utils/data/diff'
import { diffTexts, formatUnifiedDiff } from '~~/shared/utils/data/diff'

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
const toast = useToast()
const { status, error, run, reset } = useTool<DiffResult>()
const { copy, copied } = useClipboard({ legacy: true })
const { track } = useToolAnalytics()

const { workerFn } = useWebWorkerFn(
  (input: { left: string, right: string }) => diffTexts(input.left, input.right),
  {
    timeout: 30_000,
    localDependencies: [diffTexts]
  }
)

useToolSeo('text-diff')

onMounted(() => {
  track('tool_open', { tool: 'text-diff' })
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
      ? await workerFn({ left: left.value, right: right.value })
      : diffTexts(left.value, right.value)

    diff.value = next
    unified.value = formatUnifiedDiff(next, 'original', 'modified')
    return next
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'text-diff' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'text-diff' })
  }
}

async function handleCopy() {
  if (!unified.value) {
    return
  }
  await copy(unified.value)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
  if (copied.value) {
    track('tool_copy', { tool: 'text-diff' })
  }
}

function handleSwap() {
  const previous = left.value
  left.value = right.value
  right.value = previous
}

function handleClear() {
  left.value = ''
  right.value = ''
  diff.value = null
  unified.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      compare()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Text Diff"
        description="Compare two texts and show line changes."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Large texts use a web worker."
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <ToolEditor
        v-model="left"
        label="Original"
        placeholder="Paste original text"
      />
      <ToolEditor
        v-model="right"
        label="Modified"
        placeholder="Paste modified text"
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
        label="Swap"
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-left-right"
        @click="handleSwap"
      />
      <UButton
        label="Copy unified"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!unified"
        @click="handleCopy"
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
        <DataDiffResult :lines="diff.lines" />
      </ClientOnly>
    </template>

    <template #docs>
      <DataToolDocs title="About text diff">
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
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/data/json-formatter' },
            { label: 'Semver Calculator', to: '/dev/semver' },
            { label: 'TS / JSX Transpiler', to: '/dev/transpiler' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
