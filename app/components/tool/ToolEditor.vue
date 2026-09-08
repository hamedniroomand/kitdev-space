<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'
import { useDropZone, useFileDialog } from '@vueuse/core'
import { textBytes } from '#shared/utils/analytics/buckets'
import ToolError from './ToolError.vue'

const props = withDefaults(defineProps<{
  label: string
  readonly?: boolean
  placeholder?: string
  rows?: number
  lang?: ToolEditorLang
  wrap?: boolean
  extensions?: Extension[]
  maxFileSize?: number
  accept?: string
}>(), {
  rows: 12,
  lang: 'text',
  wrap: true,
  extensions: () => [],
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  accept: 'text/*,.*',
})

/**
 * The frame of a code editor: the label, the height, and the expand button.
 * The CodeMirror code sits in `ToolCodeMirror`, which loads only in the
 * browser, so this component keeps the editor chunk out of the page preload.
 */
const model = defineModel<string>({ default: '' })

const [expanded, toggleExpanded] = useToggle(false)

// Input analytics. A paste or a key press marks the next change with its
// method. A change with no mark came from code, such as a sample, and only
// updates the size. Output editors are read only and report nothing.
const { reportInput, reportBytes, clearBytes } = useToolInput()
const sourceId = useId()
let pendingMethod: 'paste' | 'type' | null = null

function onPaste() {
  pendingMethod = 'paste'
}

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }
  if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Delete') {
    pendingMethod ??= 'type'
  }
}

if (!props.readonly) {
  watchDebounced(model, (value) => {
    reportBytes(sourceId, textBytes(value))
    if (pendingMethod) {
      reportInput(pendingMethod)
      pendingMethod = null
    }
  }, { debounce: 400 })
  onUnmounted(() => clearBytes(sourceId))
}

const lineCount = computed(() => (
  expanded.value
    ? Math.max(props.rows * 2, 24)
    : props.rows
))

const editorHeight = computed(() => `${Math.max(lineCount.value * 1.35, 12)}rem`)

const fileError = ref<string | null>(null)
const dropZoneRef = ref<HTMLDivElement | null>(null)

async function loadFile(file: File) {
  if (file.size > props.maxFileSize) {
    const limitMb = Math.round(props.maxFileSize / (1024 * 1024))
    fileError.value = `File size exceeds the ${limitMb} MB limit.`
    return
  }
  fileError.value = null
  try {
    const text = await file.text()
    model.value = text
    reportInput('file')
  }
  catch {
    fileError.value = 'Failed to read file.'
  }
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop(files) {
    if (props.readonly || !files || files.length === 0) {
      return
    }
    const file = files[0]
    if (file) {
      loadFile(file)
    }
  },
})

const { open: openFileDialog, onChange: onFileChange } = useFileDialog({
  accept: props.accept,
  multiple: false,
})

onFileChange((files) => {
  if (props.readonly || !files || files.length === 0) {
    return
  }
  const file = files[0]
  if (file) {
    loadFile(file)
  }
})
</script>

<template>
  <ClientOnly>
    <UFormField :label="label">
      <div
        ref="dropZoneRef"
        class="tool-editor relative overflow-hidden rounded-md bg-default ring ring-inset ring-accented transition-colors"
        :class="{ 'ring-2 ring-primary bg-primary/5': isOverDropZone }"
        :style="{ height: editorHeight }"
        @paste.capture="onPaste"
        @keydown.capture="onKeydown"
      >
        <LazyToolCodeMirror
          v-model="model"
          :label="label"
          :lang="lang"
          :readonly="readonly"
          :placeholder="placeholder"
          :wrap="wrap"
          :extensions="extensions"
        />
        <div class="absolute inset-e-1.5 top-1.5 z-10 flex items-center gap-1">
          <UButton
            v-if="!readonly"
            size="xs"
            color="neutral"
            variant="soft"
            square
            icon="i-lucide-folder-open"
            aria-label="Upload file into editor"
            @click="openFileDialog()"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            square
            :icon="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            :aria-label="expanded ? 'Collapse editor' : 'Expand editor'"
            @click="toggleExpanded()"
          />
        </div>
      </div>
      <ToolError
        v-if="fileError"
        :message="fileError"
        class="mt-2"
      />
    </UFormField>
    <template #fallback>
      <UFormField :label="label">
        <div
          class="min-h-48 rounded-md bg-elevated ring ring-inset ring-accented"
          aria-hidden="true"
        />
      </UFormField>
    </template>
  </ClientOnly>
</template>

<style scoped>
.tool-editor :deep(.cm-editor) {
  height: 100%;
  outline: none;
  background: transparent;
}

.tool-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.tool-editor :deep(.cm-scroller) {
  overflow: auto;
}
</style>
