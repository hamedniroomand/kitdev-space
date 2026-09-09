<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import { computed, ref } from 'vue'
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
/** The position of the split, in percent from the left edge. */
const split = ref(50)

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
    v-if="blob"
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

    <!-- A split slider when both images exist, otherwise the result alone -->
    <div
      v-if="inputBlob && blob"
      class="space-y-2"
    >
      <div class="relative overflow-hidden rounded-lg border border-default bg-default">
        <img
          v-if="inputPreviewUrl"
          :src="inputPreviewUrl"
          alt="Original image preview"
          class="block max-h-80 w-full object-contain"
        >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Processed image preview"
          class="absolute inset-0 block size-full object-contain"
          :style="{ clipPath: `inset(0 0 0 ${split}%)` }"
        >
        <span class="absolute left-2 top-2 rounded bg-default/80 px-2 py-0.5 text-xs text-muted">
          Original
          <template v-if="inputWidth && inputHeight">· {{ inputWidth }} × {{ inputHeight }}</template>
          <template v-if="inputBytes">· {{ formatBytes(inputBytes) }}</template>
        </span>
        <span class="absolute right-2 top-2 rounded bg-default/80 px-2 py-0.5 text-xs text-muted">
          Result
          <template v-if="width && height">· {{ width }} × {{ height }}</template>
          <template v-if="outputBytes">· {{ formatBytes(outputBytes) }}</template>
        </span>
      </div>
      <input
        v-model.number="split"
        type="range"
        min="0"
        max="100"
        step="1"
        aria-label="Comparison split position"
        class="w-full accent-primary"
      >
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
