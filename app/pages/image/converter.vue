<script setup lang="ts">
import type { ImageEncodeFormat } from '~~/shared/utils/image/types'

const file = ref<File | null>(null)
const format = ref<ImageEncodeFormat>('webp')
const quality = ref(80)
const outputBlob = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)
const { status, error, run, reset } = useTool<Blob>()
const { track } = useToolAnalytics()

const formatItems = [
  { label: 'WebP', value: 'webp' },
  { label: 'AVIF', value: 'avif' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' }
]

useToolSeo('image-converter')

onMounted(() => {
  track('tool_open', { tool: 'image-converter' })
})

async function handleConvert() {
  outputBlob.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)
    form.append('format', format.value)
    form.append('quality', String(quality.value))

    const response = await fetch('/api/image/convert', {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
      throw new Error(payload?.message || payload?.statusMessage || 'The convert operation failed.')
    }

    inputBytes.value = Number(response.headers.get('x-input-bytes') ?? file.value.size)
    outputBytes.value = Number(response.headers.get('x-output-bytes') ?? 0)
    outWidth.value = Number(response.headers.get('x-image-width') ?? 0) || null
    outHeight.value = Number(response.headers.get('x-image-height') ?? 0) || null
    const blob = await response.blob()
    outputBlob.value = blob
    return blob
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'image-converter' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'image-converter' })
  }
}

function handleClear() {
  file.value = null
  outputBlob.value = null
  inputBytes.value = null
  outputBytes.value = null
  outWidth.value = null
  outHeight.value = null
  reset()
}

function extensionFor(formatValue: ImageEncodeFormat): string {
  return formatValue === 'jpeg' ? 'jpg' : formatValue
}

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
        title="Image Converter"
        description="Convert images to WebP, AVIF, JPEG, or PNG."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.Image on the server. Files are not stored."
    />

    <ImageDropzone v-model="file" />

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
        :loading="status === 'processing'"
        @click="handleConvert"
      >
        Convert
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <ImageResult
      :blob="outputBlob"
      :input-bytes="inputBytes"
      :output-bytes="outputBytes"
      :width="outWidth"
      :height="outHeight"
      :filename="`converted.${extensionFor(format)}`"
    />

    <template #docs>
      <DataToolDocs title="About image conversion">
        <p class="text-sm leading-relaxed text-muted">
          WebP and AVIF often make smaller files than JPEG or PNG at a similar quality.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Supported input: JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, AVIF, and SVG. SVG is rasterized with resvg, then processed with Bun.Image.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          AVIF encode may fail on some servers. Use WebP, JPEG, or PNG when that happens.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Smart Resizer', to: '/image/resizer' },
            { label: 'Metadata Inspector', to: '/image/metadata' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
