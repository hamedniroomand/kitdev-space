<script setup lang="ts">
import type { ImageEncodeFormat, ImageFilter, ImageFit, ImagePresetId } from '~~/shared/utils/image/types'

const file = ref<File | null>(null)
const preset = ref<ImagePresetId | 'custom'>('open-graph')
const width = ref(1200)
const height = ref(630)
const fit = ref<ImageFit>('inside')
const filter = ref<ImageFilter>('lanczos3')
const format = ref<ImageEncodeFormat>('webp')
const quality = ref(80)
const withoutEnlargement = ref(true)
const outputBlob = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)
const { status, error, run, reset } = useTool<Blob>()
const { track } = useToolAnalytics()

const presetItems = [
  { label: 'Twitter Banner (1500×500)', value: 'twitter-banner' },
  { label: 'Instagram Square (1080×1080)', value: 'instagram-square' },
  { label: 'OpenGraph (1200×630)', value: 'open-graph' },
  { label: 'Favicon (32×32)', value: 'favicon' },
  { label: 'Custom size', value: 'custom' }
]

const fitItems = [
  { label: 'Inside (keep ratio)', value: 'inside' },
  { label: 'Fill (stretch)', value: 'fill' }
]

const filterItems = [
  { label: 'Lanczos3', value: 'lanczos3' },
  { label: 'Mitchell', value: 'mitchell' },
  { label: 'Nearest', value: 'nearest' },
  { label: 'Cubic', value: 'cubic' },
  { label: 'Box', value: 'box' }
]

const formatItems = [
  { label: 'WebP', value: 'webp' },
  { label: 'AVIF', value: 'avif' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' }
]

useToolSeo('image-resizer')

onMounted(() => {
  track('tool_open', { tool: 'image-resizer' })
})

async function handleResize() {
  outputBlob.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)
    form.append('format', format.value)
    form.append('quality', String(quality.value))
    form.append('fit', fit.value)
    form.append('filter', filter.value)
    form.append('withoutEnlargement', withoutEnlargement.value ? '1' : '0')
    if (preset.value === 'custom') {
      form.append('width', String(width.value))
      form.append('height', String(height.value))
    } else {
      form.append('preset', preset.value)
    }

    const response = await fetch('/api/image/resize', {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
      throw new Error(payload?.message || payload?.statusMessage || 'The resize operation failed.')
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
    track('tool_execute', { tool: 'image-resizer' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'image-resizer' })
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

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      handleResize()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Smart Resizer"
        description="Resize images with social presets."
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
      <UFormField label="Preset">
        <USelect
          v-model="preset"
          :items="presetItems"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Fit">
        <USelect
          v-model="fit"
          :items="fitItems"
          class="w-full"
        />
      </UFormField>
      <template v-if="preset === 'custom'">
        <UFormField label="Width">
          <UInput
            v-model.number="width"
            type="number"
            :min="1"
            :max="8192"
          />
        </UFormField>
        <UFormField label="Height">
          <UInput
            v-model.number="height"
            type="number"
            :min="1"
            :max="8192"
          />
        </UFormField>
      </template>
      <UFormField label="Filter">
        <USelect
          v-model="filter"
          :items="filterItems"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Output format">
        <USelect
          v-model="format"
          :items="formatItems"
          class="w-full"
        />
      </UFormField>
    </div>

    <UCheckbox
      v-model="withoutEnlargement"
      label="Do not enlarge smaller images"
    />

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

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="handleResize"
      >
        Resize
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolStatus :status="status" />
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
      :filename="`resized.${format === 'jpeg' ? 'jpg' : format}`"
    />

    <template #docs>
      <DataToolDocs title="About smart resize">
        <p class="text-sm leading-relaxed text-muted">
          Use Inside to keep the aspect ratio. Use Fill to stretch to the exact size.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Image Converter', to: '/image/converter' },
            { label: 'Orientation & Grayscale', to: '/image/transform' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
