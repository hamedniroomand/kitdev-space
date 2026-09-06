<script setup lang="ts">
import type { ImageEncodeFormat } from '#shared/utils/image/types'
import { imageExtensionFor } from '#shared/utils/image/format'
import { readImageResponse } from '#shared/utils/image/response'

const file = ref<File | null>(null)
const rotate = ref<0 | 90 | 180 | 270>(0)
const flip = ref(false)
const flop = ref(false)
const grayscale = ref(false)
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

const rotateItems = [
  { label: 'None', value: 0 },
  { label: '90°', value: 90 },
  { label: '180°', value: 180 },
  { label: '270°', value: 270 }
]

useToolSeo('image-transform')

onMounted(() => {
  track('tool_open', { tool: 'image-transform' })
})

async function handleTransform() {
  outputBlob.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)
    form.append('format', format.value)
    form.append('quality', String(quality.value))
    form.append('flip', flip.value ? '1' : '0')
    form.append('flop', flop.value ? '1' : '0')
    form.append('grayscale', grayscale.value ? '1' : '0')
    if (rotate.value) {
      form.append('rotate', String(rotate.value))
    }

    const response = await fetch('/api/image/transform', {
      method: 'POST',
      body: form
    })

    const processed = await readImageResponse(response, 'The transform operation failed.', file.value.size)
    inputBytes.value = processed.inputBytes
    outputBytes.value = processed.outputBytes
    outWidth.value = processed.width
    outHeight.value = processed.height
    outputBlob.value = processed.blob
    return processed.blob
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'image-transform' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'image-transform' })
  }
}

function handleClear() {
  file.value = null
  rotate.value = 0
  flip.value = false
  flop.value = false
  grayscale.value = false
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
      handleTransform()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Orientation & Grayscale"
        description="Rotate, mirror, and convert images to grayscale."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.Image rotate, flip, flop, and modulate. Files are not stored."
    />

    <ImageDropzone v-model="file" />

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Rotate">
        <USelect
          v-model="rotate"
          :items="rotateItems"
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

    <div class="flex flex-wrap gap-4">
      <UCheckbox
        v-model="flip"
        label="Flip vertical"
      />
      <UCheckbox
        v-model="flop"
        label="Flop horizontal"
      />
      <UCheckbox
        v-model="grayscale"
        label="Grayscale"
      />
    </div>

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

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="handleTransform"
      >
        Transform
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
      :filename="`transformed.${imageExtensionFor(format)}`"
    />

    <template #docs>
      <ToolDocs title="About orientation tools">
        <p class="text-sm leading-relaxed text-muted">
          Rotate turns the image in 90 degree steps. Flip and flop mirror the image. Grayscale removes color.
        </p>
        <RelatedTools
          :items="[
            { label: 'Image Converter', to: '/hub/image/converter' },
            { label: 'Smart Resizer', to: '/hub/image/resizer' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
