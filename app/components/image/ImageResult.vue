<script setup lang="ts">
const props = defineProps<{
  blob: Blob | null
  inputBytes?: number | null
  outputBytes?: number | null
  width?: number | null
  height?: number | null
  filename?: string
}>()

const previewUrl = useObjectUrl(() => props.blob)

const savedLabel = computed(() => {
  if (props.inputBytes == null || props.outputBytes == null || props.inputBytes <= 0) {
    return null
  }
  const saved = 1 - props.outputBytes / props.inputBytes
  const pct = Math.round(saved * 100)
  const from = formatBytes(props.inputBytes)
  const to = formatBytes(props.outputBytes)
  if (pct > 0) {
    return `Saved ${pct}% (${from} → ${to})`
  }
  if (pct < 0) {
    return `Grew ${Math.abs(pct)}% (${from} → ${to})`
  }
  return `Same size (${from})`
})

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function download() {
  if (!props.blob) {
    return
  }
  const url = URL.createObjectURL(props.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = props.filename ?? 'result.webp'
  anchor.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div
    v-if="blob"
    class="space-y-3 rounded-md border border-default bg-elevated/40 p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Result
        </p>
        <p
          v-if="width && height"
          class="text-xs text-muted"
        >
          {{ width }} × {{ height }}
        </p>
        <p
          v-if="savedLabel"
          class="text-xs text-muted"
        >
          {{ savedLabel }}
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-download"
        @click="download"
      >
        Download
      </UButton>
    </div>
    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt="Processed image preview"
      class="max-h-80 w-full rounded object-contain bg-default"
    >
  </div>
</template>
