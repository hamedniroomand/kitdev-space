<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import { computed } from 'vue'
import { formatBytes } from '#shared/utils/format'
import { useDownload } from '../../composables/useDownload'

const props = withDefaults(
  defineProps<{
    blob?: Blob | null
    inputBlob?: Blob | null
    inputBytes?: number | null
    outputBytes?: number | null
    width?: number | null
    height?: number | null
    inputWidth?: number | null
    inputHeight?: number | null
    filename?: string
  }>(),
  {
    blob: null,
    inputBlob: null,
    inputBytes: null,
    outputBytes: null,
    width: null,
    height: null,
    inputWidth: null,
    inputHeight: null,
    filename: 'result.webp',
  },
)

const emit = defineEmits<{
  download: [blob: Blob]
}>()

const previewUrl = useObjectUrl(() => props.blob)
const inputPreviewUrl = useObjectUrl(() => props.inputBlob)
const { downloadBlob } = useDownload()

const delta = computed(() => {
  if (props.inputBytes == null || props.outputBytes == null || props.inputBytes <= 0) {
    return null
  }
  const diff = props.outputBytes - props.inputBytes
  const pct = Math.round((1 - props.outputBytes / props.inputBytes) * 100)
  const from = formatBytes(props.inputBytes)
  const to = formatBytes(props.outputBytes)

  return {
    diff,
    pct,
    from,
    to,
    label:
      pct > 0
        ? `Saved ${pct}% (${from} → ${to})`
        : pct < 0
          ? `Grew ${Math.abs(pct)}% (${from} → ${to})`
          : `Same size (${from})`,
  }
})

function download() {
  if (!props.blob) {
    return
  }
  downloadBlob(props.filename, props.blob)
  emit('download', props.blob)
}
</script>

<template>
  <div
    v-if="blob || inputBlob"
    class="space-y-4 rounded-xl border border-default bg-elevated/40 p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-highlighted">
          Image Result
        </p>
        <p
          v-if="delta"
          class="text-xs text-muted"
        >
          {{ delta.label }}
        </p>
      </div>
      <UButton
        v-if="blob"
        color="primary"
        icon="i-lucide-download"
        @click="download"
      >
        Download
      </UButton>
    </div>

    <!-- Comparison Grid if inputBlob provided, otherwise single card -->
    <div
      v-if="inputBlob && blob"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div class="space-y-2 rounded-lg border border-default bg-default p-3">
        <div class="flex items-center justify-between text-xs text-muted">
          <span class="font-medium">Original</span>
          <span v-if="inputBytes">{{ formatBytes(inputBytes) }}</span>
          <span v-if="inputWidth && inputHeight">{{ inputWidth }} × {{ inputHeight }}</span>
        </div>
        <img
          v-if="inputPreviewUrl"
          :src="inputPreviewUrl"
          alt="Original image preview"
          class="max-h-80 w-full rounded object-contain bg-elevated/20"
        >
      </div>

      <div class="space-y-2 rounded-lg border border-default bg-default p-3">
        <div class="flex items-center justify-between text-xs text-muted">
          <span class="font-medium">Result</span>
          <span v-if="outputBytes">{{ formatBytes(outputBytes) }}</span>
          <span v-if="width && height">{{ width }} × {{ height }}</span>
        </div>
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Processed image preview"
          class="max-h-80 w-full rounded object-contain bg-elevated/20"
        >
      </div>
    </div>

    <div
      v-else-if="blob"
      class="space-y-2"
    >
      <div
        v-if="width && height"
        class="text-xs text-muted"
      >
        {{ width }} × {{ height }}
      </div>
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Processed image preview"
        class="max-h-80 w-full rounded object-contain bg-default"
      >
    </div>
  </div>
</template>
