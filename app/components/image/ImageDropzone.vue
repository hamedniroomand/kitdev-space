<script setup lang="ts">
import { formatBytes } from '#shared/utils/format'
import ToolError from '../tool/ToolError.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: File | File[] | null
    accept?: string
    hint?: string
    prompt?: string
    multiple?: boolean
    maxBytes?: number
  }>(),
  {
    modelValue: null,
    accept: undefined,
    hint: undefined,
    prompt: undefined,
    multiple: false,
    maxBytes: 25 * 1024 * 1024, // 25 MB
  },
)

const emit = defineEmits<{
  'update:modelValue': [file: File | File[] | null]
  'update:files': [files: File[]]
}>()

const { reportInput, reportBytes, clearBytes } = useToolInput()
const sourceId = useId()
const validationError = ref<string | null>(null)

const primaryFile = computed<File | null>(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue[0] ?? null
  }
  return props.modelValue ?? null
})

watch(
  () => props.modelValue,
  (val) => {
    let size = 0
    if (Array.isArray(val)) {
      size = val.reduce((acc, f) => acc + f.size, 0)
    }
    else if (val) {
      size = val.size
    }
    reportBytes(sourceId, size)
  },
  { immediate: true },
)
onUnmounted(() => clearBytes(sourceId))

const inputRef = ref<HTMLInputElement | null>(null)
const dropZoneRef = ref<HTMLDivElement | null>(null)
const previewUrl = useObjectUrl(primaryFile)
const isImage = computed(() => primaryFile.value?.type.startsWith('image/') ?? false)

function validateFile(file: File): boolean {
  if (file.size > props.maxBytes) {
    const limitMb = Math.round(props.maxBytes / (1024 * 1024))
    validationError.value = `"${file.name}" exceeds the ${limitMb} MB limit.`
    return false
  }

  const acceptStr = props.accept
  if (acceptStr) {
    const types = acceptStr.split(',').map(t => t.trim().toLowerCase())
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    const matches = types.some((pattern) => {
      if (pattern.startsWith('.')) {
        return fileName.endsWith(pattern)
      }
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1)
        return fileType.startsWith(prefix)
      }
      return fileType === pattern
    })
    if (!matches) {
      validationError.value = `"${file.name}" is not an accepted format.`
      return false
    }
  }

  return true
}

function handleIncomingFiles(files: File[], method: 'drop' | 'file' | 'paste') {
  validationError.value = null
  const validFiles: File[] = []
  for (const f of files) {
    if (validateFile(f)) {
      validFiles.push(f)
    }
    else {
      return
    }
  }

  if (validFiles.length === 0) {
    return
  }

  reportInput(method)
  if (props.multiple) {
    emit('update:modelValue', validFiles)
    emit('update:files', validFiles)
  }
  else {
    emit('update:modelValue', validFiles[0] ?? null)
    emit('update:files', validFiles)
  }
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (!files || files.length === 0) {
      return
    }
    handleIncomingFiles(Array.from(files), 'drop')
  },
})

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) {
    return
  }
  handleIncomingFiles(Array.from(input.files), 'file')
}

function onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items || items.length === 0) {
    return
  }
  const pastedFiles: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item && item.kind === 'file') {
      const file = item.getAsFile()
      if (file) {
        pastedFiles.push(file)
      }
    }
  }
  if (pastedFiles.length > 0) {
    event.preventDefault()
    handleIncomingFiles(pastedFiles, 'paste')
  }
}

function openPicker() {
  inputRef.value?.click()
}

function clear() {
  emit('update:modelValue', null)
  emit('update:files', [])
  validationError.value = null
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

defineExpose({ clear })
</script>

<template>
  <div
    class="space-y-3"
    @paste="onPaste"
  >
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
        :multiple="multiple"
        :accept="accept ?? 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/avif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.avif,.svg'"
        @change="onPick"
      >
    </div>

    <ToolError
      v-if="validationError"
      :message="validationError"
    />

    <div
      v-if="primaryFile"
      class="flex items-center gap-3 rounded-md border border-default bg-elevated/40 p-3"
    >
      <img
        v-if="previewUrl && isImage"
        :src="previewUrl"
        alt="Selected image preview"
        class="size-14 rounded object-cover"
      >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm text-highlighted">
          {{ Array.isArray(modelValue) ? `${modelValue.length} files selected` : primaryFile.name }}
        </p>
        <p class="text-xs text-muted">
          {{ formatBytes(Array.isArray(modelValue) ? modelValue.reduce((a, b) => a + b.size, 0) : primaryFile.size) }}
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
