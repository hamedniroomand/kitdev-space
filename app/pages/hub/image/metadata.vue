<script setup lang="ts">
import type { ImageEncodeFormat } from '#shared/utils/image/types'

const file = ref<File | null>(null)
const meta = ref<{ width: number, height: number, format: string, bytes: number } | null>(null)
const format = ref<ImageEncodeFormat>('webp')
const quality = ref(80)
const cleanedBlob = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)
const { status, error, run, reset } = useTool<string>()
const { track } = useToolAnalytics()

const formatItems = [
  { label: 'WebP', value: 'webp' },
  { label: 'AVIF', value: 'avif' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' }
]

useToolSeo('image-metadata')

onMounted(() => {
  track('tool_open', { tool: 'image-metadata' })
})

async function handleInspect() {
  cleanedBlob.value = null
  meta.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)

    const data = await $fetch<{ width: number, height: number, format: string, bytes: number }>(
      '/api/image/metadata',
      { method: 'POST', body: form }
    )
    meta.value = data
    return `${data.width}×${data.height} ${data.format}`
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'image-metadata' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'image-metadata' })
  }
}

async function handleStrip() {
  cleanedBlob.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)
    form.append('strip', '1')
    form.append('format', format.value)
    form.append('quality', String(quality.value))

    const response = await fetch('/api/image/metadata', {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
      throw new Error(payload?.message || payload?.statusMessage || 'The strip operation failed.')
    }

    inputBytes.value = Number(response.headers.get('x-input-bytes') ?? file.value.size)
    outputBytes.value = Number(response.headers.get('x-output-bytes') ?? 0)
    outWidth.value = Number(response.headers.get('x-image-width') ?? 0) || null
    outHeight.value = Number(response.headers.get('x-image-height') ?? 0) || null
    const blob = await response.blob()
    cleanedBlob.value = blob
    return 'cleaned'
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'image-metadata' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'image-metadata' })
  }
}

function handleClear() {
  file.value = null
  meta.value = null
  cleanedBlob.value = null
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
      handleInspect()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Metadata Inspector"
        description="Inspect image size and strip metadata."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="Re-encoding removes camera and location metadata. Files are not stored."
    />

    <ImageDropzone v-model="file" />

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="handleInspect"
      >
        Inspect
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

    <dl
      v-if="meta"
      class="grid gap-3 rounded-md border border-default bg-elevated/40 p-4 sm:grid-cols-2"
    >
      <div>
        <dt class="text-xs text-muted">
          Width
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ meta.width }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Height
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ meta.height }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Format
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ meta.format }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Bytes
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ meta.bytes }}
        </dd>
      </div>
    </dl>

    <div
      v-if="meta"
      class="space-y-4 rounded-md border border-default bg-elevated/40 p-4"
    >
      <p class="text-sm text-highlighted">
        Download a cleaned copy
      </p>
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
              :model-value="quality"
              :min="1"
              :max="100"
              :step="1"
              class="flex-1"
              @update:model-value="quality = Number($event)"
            />
            <span class="w-10 font-mono text-sm text-muted">{{ quality }}</span>
          </div>
        </UFormField>
      </div>
      <UButton
        color="primary"
        variant="soft"
        :loading="status === 'processing'"
        @click="handleStrip"
      >
        Strip metadata
      </UButton>
    </div>

    <ImageResult
      :blob="cleanedBlob"
      :input-bytes="inputBytes"
      :output-bytes="outputBytes"
      :width="outWidth"
      :height="outHeight"
      :filename="`cleaned.${format === 'jpeg' ? 'jpg' : format}`"
    />

    <template #docs>
      <DataToolDocs title="About image metadata">
        <p class="text-sm leading-relaxed text-muted">
          Many cameras store location and device data in image files. A clean re-encode removes that data.
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
