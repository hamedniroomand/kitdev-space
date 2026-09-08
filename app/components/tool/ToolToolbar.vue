<script setup lang="ts">
withDefaults(
  defineProps<{
    canSample?: boolean
    canCopy?: boolean
    canDownload?: boolean
    canShare?: boolean
    canClear?: boolean
    hideSample?: boolean
    hideCopy?: boolean
    hideDownload?: boolean
    hideShare?: boolean
    hideClear?: boolean
    copyLabel?: string
    copyIcon?: string
    copyColor?: 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
    shareLabel?: string
    shareIcon?: string
    shareColor?: 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
  }>(),
  {
    canSample: true,
    canCopy: true,
    canDownload: true,
    canShare: true,
    canClear: true,
    hideSample: false,
    hideCopy: false,
    hideDownload: false,
    hideShare: false,
    hideClear: false,
    copyLabel: 'Copy',
    copyIcon: 'i-lucide-copy',
    copyColor: 'neutral',
    shareLabel: 'Share',
    shareIcon: 'i-lucide-share-2',
    shareColor: 'neutral',
  },
)

const emit = defineEmits<{
  sample: []
  copy: []
  download: []
  share: []
  clear: []
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Action buttons (e.g. Format, Convert, Run) -->
    <slot name="leading" />
    <slot />

    <!-- Standard Toolbar Order: Sample, Copy, Download, Share, Clear -->
    <UButton
      v-if="!hideSample"
      label="Sample"
      color="neutral"
      variant="subtle"
      icon="i-lucide-file-text"
      :disabled="!canSample"
      aria-label="Load sample input"
      @click="emit('sample')"
    />

    <UButton
      v-if="!hideCopy"
      :label="copyLabel"
      :color="copyColor"
      variant="subtle"
      :icon="copyIcon"
      :disabled="!canCopy"
      aria-label="Copy result to clipboard"
      @click="emit('copy')"
    />

    <UButton
      v-if="!hideDownload"
      label="Download"
      color="neutral"
      variant="subtle"
      icon="i-lucide-download"
      :disabled="!canDownload"
      aria-label="Download result file"
      @click="emit('download')"
    />

    <UButton
      v-if="!hideShare"
      :label="shareLabel"
      :color="shareColor"
      variant="subtle"
      :icon="shareIcon"
      :disabled="!canShare"
      aria-label="Share tool link"
      @click="emit('share')"
    />

    <UButton
      v-if="!hideClear"
      label="Clear"
      color="neutral"
      variant="ghost"
      icon="i-lucide-eraser"
      :disabled="!canClear"
      aria-label="Clear input and result"
      @click="emit('clear')"
    />

    <slot name="trailing" />
  </div>
</template>
