<script setup lang="ts">
import type { LanguageSupport } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import CodeMirror from 'vue-codemirror6'
import { resolveEditorLanguage } from '#shared/utils/dev/editor-lang'

const props = withDefaults(defineProps<{
  label: string
  readonly?: boolean
  placeholder?: string
  lang?: ToolEditorLang
  wrap?: boolean
  extensions?: Extension[]
}>(), {
  lang: 'text',
  wrap: true,
  extensions: () => [],
})

/**
 * The CodeMirror part of `ToolEditor`. It lives in its own chunk and loads
 * only in the browser, after the first paint, so the page HTML does not
 * preload the editor code.
 */
const model = defineModel<string>({ default: '' })

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
// The language pack is a separate chunk. Watch the prop, so a page that switches
// the language (a converter, for example) loads the next pack on demand.
const language = shallowRef<LanguageSupport>()
watch(() => props.lang, async (lang) => {
  const next = await resolveEditorLanguage(lang)
  if (lang === props.lang) {
    language.value = next
  }
}, { immediate: true })

const extensions = computed((): Extension[] => {
  const list: Extension[] = [
    // CodeMirror renders a contenteditable element, which the UFormField
    // label cannot point to. Name it directly to keep it accessible.
    EditorView.contentAttributes.of({ 'aria-label': props.label }),
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '0.875rem',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.5',
      },
      '.cm-content': {
        paddingBlock: '0.75rem',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none',
      },
    }),
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
</template>
