<script setup lang="ts">
import { imageExtensionFor } from '~~/shared/utils/image/format'
import { readImageResponse } from '~~/shared/utils/image/response'

type SvgFormat = 'png' | 'webp'
type SvgScale = 1 | 2 | 4

const svgText = ref(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="#0f766e"/>
  <text x="60" y="46" text-anchor="middle" fill="#ecfdf5" font-size="18" font-family="sans-serif">SVG</text>
</svg>`)
const file = ref<File | null>(null)
const format = ref<SvgFormat>('png')
const quality = ref(80)
const result1x = ref<Blob | null>(null)
const result2x = ref<Blob | null>(null)
const result4x = ref<Blob | null>(null)
const meta1x = ref<{ width: number | null, height: number | null } | null>(null)
const meta2x = ref<{ width: number | null, height: number | null } | null>(null)
const meta4x = ref<{ width: number | null, height: number | null } | null>(null)
const preview1x = useObjectUrl(result1x)
const preview2x = useObjectUrl(result2x)
const preview4x = useObjectUrl(result4x)
const { status, error, run, reset } = useTool()
const { track } = useToolAnalytics()
const { downloadBlob } = useDownload()

const formatItems = [
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' }
]

const scaleCards = computed(() => [
  { scale: 1 as SvgScale, blob: result1x.value, preview: preview1x.value, meta: meta1x.value },
  { scale: 2 as SvgScale, blob: result2x.value, preview: preview2x.value, meta: meta2x.value },
  { scale: 4 as SvgScale, blob: result4x.value, preview: preview4x.value, meta: meta4x.value }
])

useToolSeo('svg-converter')

onMounted(() => {
  track('tool_open', { tool: 'svg-converter' })
})

async function convertScale(scale: SvgScale) {
  const formData = new FormData()
  formData.append('scale', String(scale))
  formData.append('format', format.value)
  formData.append('quality', String(quality.value))

  if (file.value) {
    formData.append('file', file.value)
  } else if (svgText.value.trim()) {
    formData.append('svg', svgText.value)
  } else {
    throw new Error('Paste SVG code or upload an SVG file.')
  }

  const response = await fetch('/api/image/svg-convert', {
    method: 'POST',
    body: formData
  })
  const processed = await readImageResponse(response, 'The SVG convert operation failed.')

  if (scale === 1) {
    result1x.value = processed.blob
    meta1x.value = { width: processed.width, height: processed.height }
  } else if (scale === 2) {
    result2x.value = processed.blob
    meta2x.value = { width: processed.width, height: processed.height }
  } else {
    result4x.value = processed.blob
    meta4x.value = { width: processed.width, height: processed.height }
  }
}

async function handleConvert() {
  result1x.value = null
  result2x.value = null
  result4x.value = null
  meta1x.value = null
  meta2x.value = null
  meta4x.value = null

  await run(async () => {
    await Promise.all(([1, 2, 4] as SvgScale[]).map(scale => convertScale(scale)))
    return 'ok'
  })
  if (status.value === 'success') {
    track('tool_execute', { tool: 'svg-converter' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'svg-converter' })
  }
}

function downloadScale(scale: SvgScale, blob: Blob | null) {
  if (!blob) {
    return
  }
  downloadBlob(`svg-${scale}x.${imageExtensionFor(format.value)}`, blob)
}

function handleClear() {
  svgText.value = ''
  file.value = null
  result1x.value = null
  result2x.value = null
  result4x.value = null
  meta1x.value = null
  meta2x.value = null
  meta4x.value = null
  reset()
}

watch(file, async (next) => {
  if (!next) {
    return
  }
  svgText.value = await next.text()
})

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      handleConvert()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="SVG to PNG / WebP"
        description="Convert SVG code or files to PNG or WebP at 1x, 2x, and 4x."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses resvg and Bun.Image on the server. Files are not stored."
    />

    <ToolEditor
      v-model="svgText"
      label="SVG input"
      placeholder="Paste SVG code here"
      lang="svg"
    />

    <ImageDropzone
      v-model="file"
      accept="image/svg+xml,.svg"
      prompt="Drop an SVG file here, or click to choose a file."
      hint="Max size 25 MB. SVG only."
    />

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Output format">
        <USelect
          v-model="format"
          :items="formatItems"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="format !== 'png'"
        label="Quality"
      >
        <div class="flex items-center gap-3">
          <USlider
            v-model="quality"
            :min="1"
            :max="100"
            :step="1"
            class="flex-1"
          />
          <span class="w-10 font-mono text-sm text-muted">{{ quality }}</span>
        </div>
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        color="primary"
        icon="i-lucide-image"
        :loading="status === 'processing'"
        @click="handleConvert"
      >
        Convert
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="scaleCards.some(card => card.blob)"
      class="grid gap-4 sm:grid-cols-3"
    >
      <div
        v-for="card in scaleCards"
        :key="card.scale"
        class="space-y-3 rounded-md border border-default bg-elevated/40 p-4"
      >
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-highlighted">
              {{ card.scale }}x
            </p>
            <p
              v-if="card.meta"
              class="text-xs text-muted"
            >
              {{ card.meta.width }} × {{ card.meta.height }}
            </p>
          </div>
          <UButton
            size="sm"
            color="primary"
            icon="i-lucide-download"
            :disabled="!card.blob"
            @click="downloadScale(card.scale, card.blob)"
          >
            Download
          </UButton>
        </div>
        <img
          v-if="card.preview"
          :src="card.preview"
          :alt="`${card.scale}x SVG preview`"
          class="max-h-40 w-full rounded object-contain bg-default"
        >
      </div>
    </div>

    <template #docs>
      <DataToolDocs title="About SVG conversion">
        <p class="text-sm leading-relaxed text-muted">
          The tool rasterizes SVG with resvg, then encodes PNG or WebP with Bun.Image.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Remote resources in SVG are blocked.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Image Converter', to: '/hub/image/converter' },
            { label: 'Smart Resizer', to: '/hub/image/resizer' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
