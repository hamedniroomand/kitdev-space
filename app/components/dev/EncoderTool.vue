<script setup lang="ts">
import type { CodecFormat, UrlScope } from '#shared/utils/dev/codec'
import { useDropZone, useFileDialog } from '@vueuse/core'
import {
  buildDataUrl,
  CODEC_OPTIONS,
  decodeBinaryBase64,
  decodeWith,
  encodeWith,
  parseDataUrl,
} from '#shared/utils/dev/codec'

type Direction = 'encode' | 'decode'

const props = withDefaults(defineProps<{
  /** The registry id of the page. A variant page gives its own id. */
  toolId: string
  /** The format that is selected when the page opens. */
  format?: CodecFormat
}>(), { format: 'base64' })

const DIRECTION_ITEMS: { label: string, value: Direction, icon: string }[] = [
  { label: 'Encode', value: 'encode', icon: 'i-lucide-arrow-right' },
  { label: 'Decode', value: 'decode', icon: 'i-lucide-arrow-left' },
]

const URL_SCOPE_ITEMS: { label: string, value: UrlScope }[] = [
  { label: 'Component', value: 'component' },
  { label: 'Full URL', value: 'full' },
]

const URL_SCOPE_HINTS: Record<UrlScope, string> = {
  component: 'encodeURIComponent. Encodes ? & / # too, for one query value.',
  full: 'encodeURI. Keeps ? & / # as they are, for a whole URL.',
}

const SAMPLE = 'Hello, "world" & <friends>'
/** A large file makes a data URL that is too long for the editor. */
const MAX_FILE_BYTES = 2 * 1024 * 1024

const format = ref<CodecFormat>(props.format)
const direction = ref<Direction>('encode')
const input = ref(SAMPLE)
const urlScope = ref<UrlScope>('component')
const droppedName = ref('')
const droppedDataUrl = ref('')
const fileError = ref<string | null>(null)
const downloadError = ref<string | null>(null)
const dropZone = ref<HTMLDivElement | null>(null)

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText, downloadBlob } = useDownload()

useToolSeo(props.toolId)
const { reportInput } = useToolInput()

const activeOption = computed(
  () => CODEC_OPTIONS.find(option => option.value === format.value) ?? CODEC_OPTIONS[0]!,
)

const isUrl = computed(() => format.value === 'url')
const scopeHint = computed(() => URL_SCOPE_HINTS[urlScope.value])

/** Data URLs use the standard alphabet, so the file actions need Base64. */
const isBinaryFormat = computed(() => format.value === 'base64')
const canDropFile = computed(() => isBinaryFormat.value && direction.value === 'encode')
const canDownloadFile = computed(
  () => isBinaryFormat.value && direction.value === 'decode' && Boolean(input.value),
)
/** A data URL in the input holds a file. The tool never reads it as text. */
const binaryInput = computed(
  () => direction.value === 'decode' && isBinaryFormat.value ? parseDataUrl(input.value) : null,
)

const conversion = computed(() => {
  if (droppedDataUrl.value) {
    return { output: droppedDataUrl.value, error: null }
  }

  if (!input.value || binaryInput.value) {
    return { output: '', error: null }
  }

  try {
    const options = { urlScope: urlScope.value }
    const output = direction.value === 'encode'
      ? encodeWith(input.value, format.value, options)
      : decodeWith(input.value, format.value, options)
    return { output, error: null }
  }
  catch (cause) {
    return {
      output: '',
      error: cause instanceof Error ? cause.message : 'The operation failed.',
    }
  }
})

useLiveTool(conversion, { runLocation: 'browser', option: () => format.value })

const output = computed(() => conversion.value.output)
const error = computed(() => conversion.value.error)

/** Reads the file as bytes. A file never goes through a text decoder. */
async function loadFile(file: File, method: 'drop' | 'file') {
  if (file.size > MAX_FILE_BYTES) {
    fileError.value = 'The file is larger than the 2 MB limit.'
    return
  }
  fileError.value = null
  reportInput(method)
  const bytes = new Uint8Array(await file.arrayBuffer())
  droppedName.value = file.name
  droppedDataUrl.value = buildDataUrl(file.type, bytes)
}

const { isOverDropZone } = useDropZone(dropZone, {
  onDrop(files) {
    const file = files?.[0]
    if (file) {
      loadFile(file, 'drop')
    }
  },
})

const { open: openFilePicker, onChange: onFilePick } = useFileDialog({ multiple: false, reset: true })

onFilePick((files) => {
  const file = files?.[0]
  if (file) {
    loadFile(file, 'file')
  }
})

// Text input and a dropped file are two sources for one output. The newest wins.
watch([input, format, direction], () => {
  droppedName.value = ''
  droppedDataUrl.value = ''
  fileError.value = null
  downloadError.value = null
})

/** Sends the result back to the input, so a user can chain two steps. */
function swap() {
  if (!output.value) {
    return
  }
  input.value = output.value
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
}

async function handleCopy() {
  if (output.value) {
    await copy(output.value)
  }
}

function handleDownload() {
  if (output.value) {
    downloadText(`${format.value}-${direction.value}.txt`, output.value, 'text/plain')
  }
}

function handleDownloadFile() {
  downloadError.value = null
  try {
    const payload = decodeBinaryBase64(input.value)
    downloadBlob(
      `decoded.${payload.extension}`,
      new Blob([payload.bytes.slice()], { type: payload.mime }),
    )
  }
  catch (cause) {
    downloadError.value = cause instanceof Error ? cause.message : 'The download failed.'
  }
}

function handleSample() {
  reportInput('sample')
  input.value = SAMPLE
  direction.value = 'encode'
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <div class="flex flex-wrap items-end gap-4">
      <UFormField
        label="Format"
        class="min-w-56 flex-1"
        :hint="activeOption.hint"
      >
        <USelect
          v-model="format"
          :items="CODEC_OPTIONS"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Direction">
        <UTabs
          v-model="direction"
          :items="DIRECTION_ITEMS"
          :content="false"
          size="sm"
        />
      </UFormField>
    </div>

    <UFormField
      v-if="isUrl"
      label="URL scope"
      :hint="scopeHint"
    >
      <UTabs
        v-model="urlScope"
        :items="URL_SCOPE_ITEMS"
        :content="false"
        size="sm"
      />
    </UFormField>

    <div
      v-if="canDropFile"
      class="space-y-3"
    >
      <div
        ref="dropZone"
        class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-default bg-elevated/30 px-4 py-8 text-center transition-colors hover:border-primary"
        :class="{ 'border-primary bg-elevated/60': isOverDropZone }"
        role="button"
        tabindex="0"
        aria-label="Choose a file to encode as a data URL"
        @click="openFilePicker()"
        @keydown.enter.prevent="openFilePicker()"
      >
        <UIcon
          name="i-lucide-file-up"
          class="size-6 text-muted"
        />
        <p class="text-sm text-highlighted">
          Drop a file here, or click to choose a file.
        </p>
        <p class="text-xs text-muted">
          Max size 2 MB. The tool makes the data URL on your device. It does not upload the file.
        </p>
      </div>
      <p
        v-if="droppedName"
        class="text-sm text-muted"
      >
        {{ droppedName }} is now a data URL in the output.
      </p>
    </div>

    <ToolError
      v-if="fileError"
      :message="fileError"
    />

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste text here"
    />

    <ToolActions>
      <UButton
        label="Swap"
        icon="i-lucide-arrow-up-down"
        :disabled="!output"
        @click="swap"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Download text"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
      />
      <UButton
        v-if="canDownloadFile"
        label="Download file"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-down"
        @click="handleDownloadFile"
      />
      <UButton
        label="Load sample"
        color="neutral"
        variant="ghost"
        icon="i-lucide-file-text"
        @click="handleSample"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <UAlert
      v-if="binaryInput"
      color="neutral"
      variant="subtle"
      icon="i-lucide-file-down"
      title="The input is a binary data URL"
      :description="`The type is ${binaryInput.mime}. Select Download file to save it. The tool does not read a file as text.`"
    />

    <ToolError
      v-if="error"
      :message="error"
    />

    <ToolError
      v-if="downloadError"
      :message="downloadError"
    />

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Result appears here"
    />

    <template #docs>
      <slot name="docs" />
    </template>
  </ToolPage>
</template>
