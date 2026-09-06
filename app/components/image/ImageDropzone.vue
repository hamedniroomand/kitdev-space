<script setup lang="ts">
import { formatBytes } from '#shared/utils/format'

const props = defineProps<{
  modelValue: File | null
  accept?: string
  hint?: string
  prompt?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dropZoneRef = ref<HTMLDivElement | null>(null)
const previewUrl = useObjectUrl(() => props.modelValue)

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    const file = files?.[0] ?? null
    if (file) {
      emit('update:modelValue', file)
    }
  }
})

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  emit('update:modelValue', file)
}

function openPicker() {
  inputRef.value?.click()
}

function clear() {
  emit('update:modelValue', null)
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

defineExpose({ clear })
</script>

<template>
  <div class="space-y-3">
    <div
      ref="dropZoneRef"
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-default bg-elevated/30 px-4 py-10 text-center transition-colors hover:border-primary"
      :class="{ 'border-primary bg-elevated/60': isOverDropZone }"
      role="button"
      tabindex="0"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
    >
      <UIcon
        name="i-lucide-upload"
        class="size-6 text-muted"
      />
      <p class="text-sm text-highlighted">
        {{ prompt ?? 'Drop an image here, or click to choose a file.' }}
      </p>
      <p class="text-xs text-muted">
        {{ hint ?? 'Max size 25 MB. JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, AVIF, or SVG.' }}
      </p>
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        :accept="accept ?? 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/avif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.avif,.svg'"
        @change="onPick"
      >
    </div>

    <div
      v-if="modelValue"
      class="flex items-center gap-3 rounded-md border border-default bg-elevated/40 p-3"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Selected image preview"
        class="size-14 rounded object-cover"
      >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm text-highlighted">
          {{ modelValue.name }}
        </p>
        <p class="text-xs text-muted">
          {{ formatBytes(modelValue.size) }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        @click.stop="clear"
      >
        Clear file
      </UButton>
    </div>
  </div>
</template>
