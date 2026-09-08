<script setup lang="ts">
import { detectJsonWarnings, formatJson, minifyJson, validateJson } from '#shared/utils/data/json'
import { getTextStats } from '#shared/utils/data/stats'

const WORKER_BYTES = 1_000_000

const input = ref('{\n  "name": "KitDev",\n  "ready": true\n}')
const output = ref('')
const statusMessage = ref('')
const statusMeta = ref('')
const warnings = ref<string[]>([])
const indent = useToolOption<string>('indent', '2')
const sortKeysOption = useToolOption<boolean>('sort-keys', false)

const indentItems = [
  { label: '2 spaces', value: '2' },
  { label: '4 spaces', value: '4' },
  { label: 'Tab', value: 'tab' },
  { label: 'Compact', value: 'compact' },
]

const viewMode = ref<'code' | 'tree'>('code')

const treeData = computed(() => {
  const text = output.value || input.value
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  }
  catch {
    return null
  }
})

const { buildShareUrl, canShare } = useToolQuery({ input })
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const { execute: workerFormat, isRunning: workerRunning, stop: stopWorker } = useToolWorker(
  (data: { text: string, space: string, sort: boolean }) => {
    let val = JSON.parse(data.text)
    if (data.sort) {
      const sort = (v: any): any => {
        if (Array.isArray(v)) {
          return v.map(sort)
        }
        if (v && typeof v === 'object') {
          const sorted: Record<string, any> = {}
          for (const k of Object.keys(v).sort()) {
            sorted[k] = sort(v[k])
          }
          return sorted
        }
        return v
      }
      val = sort(val)
    }
    if (data.space === 'compact') {
      return JSON.stringify(val)
    }
    const resolvedSpace = data.space === 'tab' ? '\t' : Number(data.space)
    return JSON.stringify(val, null, resolvedSpace)
  },
  { timeout: 30_000 },
)

const isHeavy = computed(() => input.value.length >= WORKER_BYTES)

const validateFeedback = useActionFeedback({
  idle: {
    label: 'Validate',
    icon: 'i-lucide-circle-check',
    color: 'neutral',
    variant: 'subtle',
  },
  success: {
    label: 'Valid',
    icon: 'i-lucide-check',
    color: 'success',
    variant: 'subtle',
  },
  error: {
    label: 'Invalid',
    icon: 'i-lucide-x',
    color: 'error',
    variant: 'subtle',
  },
})
const { downloadText } = useDownload()

useToolSeo('json-formatter')

function setStats(text: string) {
  const stats = getTextStats(text)
  statusMeta.value = `${stats.characters} characters · ${stats.lines} lines · ${stats.bytes} bytes`
}

function checkWarnings() {
  warnings.value = detectJsonWarnings(input.value).map(w => w.message)
}

async function format() {
  validateFeedback.reset()
  checkWarnings()
  await run(async () => {
    if (input.value.length >= WORKER_BYTES) {
      try {
        return await workerFormat({ text: input.value, space: indent.value, sort: sortKeysOption.value })
      }
      catch {
        // Fallback to local full parser (supports JSON5/JSONC)
        return formatJson(input.value, indent.value, sortKeysOption.value)
      }
    }
    return formatJson(input.value, indent.value, sortKeysOption.value)
  })
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
  }
}

async function minify() {
  validateFeedback.reset()
  checkWarnings()
  await run(async () => {
    if (input.value.length >= WORKER_BYTES) {
      try {
        return await workerFormat({ text: input.value, space: 'compact', sort: sortKeysOption.value })
      }
      catch {
        return minifyJson(input.value, sortKeysOption.value)
      }
    }
    return minifyJson(input.value, sortKeysOption.value)
  })
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
  }
}

async function validate() {
  checkWarnings()
  await run(() => {
    const next = validateJson(input.value)
    if (!next.ok) {
      throw next.error
    }
    return 'ok'
  })
  if (status.value === 'success') {
    statusMessage.value = 'Valid JSON'
    setStats(input.value)
    validateFeedback.flashSuccess()
  }
  else if (status.value === 'error') {
    validateFeedback.flashError()
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText('formatted.json', output.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  warnings.value = []
  validateFeedback.reset()
  reset()
}

async function handleShare() {
  const url = buildShareUrl()
  if (!url) {
    return
  }
  await copy(url, 'share', 'snippet')
}

useToolShortcuts({
  onRun: () => format(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      v-if="isHeavy"
      color="info"
      variant="subtle"
      icon="i-lucide-cpu"
      title="Heavy processing mode"
      description="Large JSON files run in a background web worker to prevent UI lag. Limit: 30 seconds."
    />

    <div class="flex flex-wrap items-center gap-4">
      <UFormField label="Indentation">
        <USelect
          v-model="indent"
          :items="indentItems"
          class="w-36"
        />
      </UFormField>

      <div class="pt-6">
        <UCheckbox
          v-model="sortKeysOption"
          label="Sort keys"
        />
      </div>
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste JSON here"
      lang="json"
      :max-file-size="30 * 1024 * 1024"
      accept="application/json,text/*,.json"
    />

    <ToolActions>
      <UButton
        label="Format"
        icon="i-lucide-align-left"
        :loading="status === 'processing'"
        @click="format"
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
        label="Minify"
        color="neutral"
        variant="subtle"
        icon="i-lucide-minimize-2"
        @click="minify"
      />
      <UButton
        :label="validateFeedback.label"
        :color="validateFeedback.color"
        :variant="validateFeedback.variant"
        :icon="validateFeedback.icon"
        @click="validate"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
      />
      <UButton
        v-if="canShare"
        :label="copyLabel('share', 'Share')"
        :color="copyColor('share')"
        variant="subtle"
        :icon="copyIcon('share', 'i-lucide-share-2')"
        aria-label="Share tool link with input"
        @click="handleShare"
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

    <div
      v-if="warnings.length > 0"
      class="space-y-2"
    >
      <UAlert
        v-for="(warning, idx) in warnings"
        :key="idx"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="warning"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-foreground">Output</span>
        <div class="flex items-center gap-1">
          <UButton
            size="xs"
            :variant="viewMode === 'code' ? 'solid' : 'ghost'"
            color="neutral"
            label="Code"
            icon="i-lucide-code"
            @click="viewMode = 'code'"
          />
          <UButton
            size="xs"
            :variant="viewMode === 'tree' ? 'solid' : 'ghost'"
            color="neutral"
            label="Tree View"
            icon="i-lucide-folder-tree"
            @click="viewMode = 'tree'"
          />
        </div>
      </div>

      <LazyToolEditor
        v-if="viewMode === 'code'"
        v-model="output"
        hydrate-on-idle
        label="Output"
        readonly
        placeholder="Result appears here"
        lang="json"
      />

      <div v-else>
        <JsonTreeView
          v-if="treeData !== null"
          :data="treeData"
        />
        <div
          v-else
          class="rounded-md border border-dashed border-default p-8 text-center text-sm text-muted"
        >
          Format or paste valid JSON to display the tree view.
        </div>
      </div>
    </div>

    <ToolStatus
      v-if="status === 'success' && statusMessage"
      :message="statusMessage"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About JSON formatting">
        <div class="space-y-4 text-muted">
          <p>
            JSON formatting adds spaces and line breaks so humans can read the data.
          </p>
          <p>
            Paste JSON in the input. Select Format to create indented output.
          </p>
          <p>
            The input also accepts JSON5 and JSONC. A comment, a trailing comma, a single quote, and
            an unquoted key are all read, and the output is strict JSON. This lets you paste a
            tsconfig.json or another config file with no edit.
          </p>
          <p>
            A common error is a missing comma or a missing bracket. The error message names the line.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'Text Diff', to: '/hub/data/text-diff' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
