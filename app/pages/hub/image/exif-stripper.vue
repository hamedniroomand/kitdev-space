<script setup lang="ts">
import type { ImageEncodeFormat } from '#shared/utils/image/types'

useToolSeo('exif-stripper')

const file = ref<File | null>(null)
const format = ref<ImageEncodeFormat>('jpeg')
const cleanedBlob = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const { status, error, run, reset } = useTool<string>()
const { downloadBlob } = useDownload()

const formats: { label: string, value: ImageEncodeFormat }[] = [
  { label: 'Original / JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' }
]

watch(file, (selected) => {
  cleanedBlob.value = null
  inputBytes.value = selected?.size ?? null
  outputBytes.value = null
})

async function handleStrip() {
  if (!file.value) return
  cleanedBlob.value = null

  await run(async () => {
    const form = new FormData()
    form.append('file', file.value!)
    form.append('strip', '1')
    form.append('format', format.value)
    form.append('quality', '95')

    const response = await fetch('/api/image/metadata', {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
      throw new Error(payload?.message || payload?.statusMessage || 'Failed to remove metadata from image.')
    }

    inputBytes.value = Number(response.headers.get('x-input-bytes') ?? file.value!.size)
    outputBytes.value = Number(response.headers.get('x-output-bytes') ?? 0)
    const blob = await response.blob()
    cleanedBlob.value = blob
    return 'cleaned'
  })
}

function handleDownload() {
  if (!cleanedBlob.value) return
  downloadBlob(`stripped-${file.value?.name || 'image.jpg'}`, cleanedBlob.value)
}

function handleClear() {
  file.value = null
  cleanedBlob.value = null
  inputBytes.value = null
  outputBytes.value = null
  reset()
}

useSeoMeta({
  title: 'EXIF Metadata Stripper — KitDev Space',
  description: 'Remove EXIF metadata, GPS location, and camera details from images before sharing.'
})
</script>

<template>
  <ToolPage
    title="EXIF Metadata Stripper"
    description="Remove EXIF tags, GPS locations, camera parameters, and private metadata from photos."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted font-medium">Output Format:</span>
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              v-for="fmt in formats"
              :key="fmt.value"
              size="xs"
              :variant="format === fmt.value ? 'solid' : 'ghost'"
              color="neutral"
              :label="fmt.label"
              @click="format = fmt.value"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!file"
            @click="handleClear"
          />
        </div>
      </div>

      <ImageDropzone
        v-model="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        prompt="Drop a photo here, or click to choose a file."
        hint="Max size 20 MB. JPEG, PNG, WebP, or AVIF."
      />

      <!-- Actions & Results -->
      <div
        v-if="file"
        class="flex flex-col items-center justify-center space-y-4"
      >
        <UButton
          size="md"
          color="primary"
          variant="solid"
          icon="i-lucide-trash-2"
          label="Strip All Metadata"
          :loading="status === 'processing'"
          @click="handleStrip"
        />

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Operation Error"
          :description="error"
        />

        <div
          v-if="cleanedBlob"
          class="p-6 border border-default rounded-2xl bg-elevated/40 text-center space-y-4 max-w-md w-full"
        >
          <div class="flex items-center justify-center gap-2 text-success font-semibold text-sm">
            <UIcon
              name="i-lucide-check-circle"
              class="w-5 h-5"
            />
            <span>Metadata Successfully Removed!</span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-lg bg-default border border-default">
              <div class="text-muted">
                Original Size
              </div>
              <div class="font-bold font-mono mt-0.5">
                {{ ((inputBytes || 0) / 1024).toFixed(1) }} KB
              </div>
            </div>
            <div class="p-3 rounded-lg bg-default border border-default">
              <div class="text-muted">
                Cleaned Size
              </div>
              <div class="font-bold font-mono text-success mt-0.5">
                {{ ((outputBytes || 0) / 1024).toFixed(1) }} KB
              </div>
            </div>
          </div>

          <UButton
            size="md"
            color="primary"
            variant="solid"
            icon="i-lucide-download"
            label="Download Cleaned Photo"
            @click="handleDownload"
          />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
