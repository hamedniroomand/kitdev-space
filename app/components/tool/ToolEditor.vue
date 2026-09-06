<script setup lang="ts">
import CodeMirror from 'vue-codemirror6'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import {
  resolveEditorLanguage,
  type ToolEditorLang
} from '~~/shared/utils/dev/editor-lang'

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

const colorMode = useColorMode()
const [expanded, toggleExpanded] = useToggle(false)

const isDark = computed(() => colorMode.value === 'dark')

const language = computed(() => resolveEditorLanguage(props.lang))

const lineCount = computed(() => (
  expanded.value
    ? Math.max(props.rows * 2, 24)
    : props.rows
))

const editorHeight = computed(() => `${Math.max(lineCount.value * 1.35, 12)}rem`)

const extensions = computed((): Extension[] => {
  const list: Extension[] = [
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '0.875rem'
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.5'
      },
      '.cm-content': {
        paddingBlock: '0.75rem'
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none'
      }
    })
  ]

  if (isDark.value) {
    list.push(oneDark)
  }

  if (props.extensions?.length) {
    list.push(...props.extensions)
  }

  return list
})
</script>

<template>
  <ClientOnly>
    <UFormField :label="label">
      <div
        class="tool-editor relative overflow-hidden rounded-md bg-default ring ring-inset ring-accented"
        :style="{ height: editorHeight }"
      >
        <CodeMirror
          v-model="model"
          class="h-full w-full"
          :lang="language"
          :dark="isDark"
          :readonly="readonly"
          :placeholder="placeholder"
          :basic="true"
          :wrap="wrap"
          :tab="true"
          :tab-size="2"
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
