<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'

/**
 * The frame of a code editor: the label, the height, and the expand button.
 * The CodeMirror code sits in `ToolCodeMirror`, which loads only in the
 * browser, so this component keeps the editor chunk out of the page preload.
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  label: string
  readonly?: boolean
  placeholder?: string
  rows?: number
  lang?: ToolEditorLang
  wrap?: boolean
  extensions?: Extension[]
}>(), {
  rows: 12,
  lang: 'text',
  wrap: true,
  extensions: () => []
})

const [expanded, toggleExpanded] = useToggle(false)

const lineCount = computed(() => (
  expanded.value
    ? Math.max(props.rows * 2, 24)
    : props.rows
))

const editorHeight = computed(() => `${Math.max(lineCount.value * 1.35, 12)}rem`)
</script>

<template>
  <ClientOnly>
    <UFormField :label="label">
      <div
        class="tool-editor relative overflow-hidden rounded-md bg-default ring ring-inset ring-accented"
        :style="{ height: editorHeight }"
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
        <UButton
          class="absolute inset-e-1.5 top-1.5 z-10"
          size="xs"
          color="neutral"
          variant="soft"
          square
          :icon="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          :aria-label="expanded ? 'Collapse editor' : 'Expand editor'"
          @click="toggleExpanded()"
        />
      </div>
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
