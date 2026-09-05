<script setup lang="ts">
import type { DataFormat } from '~~/shared/utils/data/types'
import { getTextStats } from '~~/shared/utils/data/stats'

const props = defineProps<{
  toolId: string
  title: string
  description: string
  formats: { label: string, value: Exclude<DataFormat, 'typescript'> }[]
  defaultFrom: Exclude<DataFormat, 'typescript'>
  defaultTo: Exclude<DataFormat, 'typescript'>
  sample: string
  downloadName: string
  downloadMime?: string
  docsTitle: string
  docs: string[]
  related: { label: string, to: string }[]
}>()

const from = ref(props.defaultFrom)
const to = ref(props.defaultTo)
const input = ref(props.sample)
const output = ref('')
const statusMeta = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy } = useClipboard()
const { downloadText } = useDownload()

useToolSeo(props.toolId)

async function convert() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: string }>('/api/data/transform', {
        method: 'POST',
        body: {
          input: input.value,
          from: from.value,
          to: to.value
        }
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      const message = fetchError.data?.message
        || fetchError.statusMessage
        || 'The convert operation failed.'
      throw new Error(message, { cause })
    }
  })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    statusMeta.value = `${stats.characters} characters · ${stats.lines} lines`
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  const ok = await copy(output.value)
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText(props.downloadName, output.value, props.downloadMime)
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      convert()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        :title="title"
        :description="description"
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool runs on the server. The browser cannot use Bun format APIs."
      class="mb-2"
    />

    <DataFormatSelector
      v-model:from="from"
      v-model:to="to"
      :formats="formats"
    />

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste data here"
    />

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-arrow-left-right"
        :loading="status === 'processing'"
        @click="convert"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
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

    <ToolEditor
      v-model="output"
      label="Output"
      readonly
      placeholder="Result appears here"
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Converted"
      :meta="statusMeta"
    />

    <template #docs>
      <DataToolDocs :title="docsTitle">
        <div class="space-y-4 text-muted">
          <p
            v-for="(paragraph, index) in docs"
            :key="index"
          >
            {{ paragraph }}
          </p>
          <p>
            The server uses Bun native parsers. No extra format packages are required.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="related"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
