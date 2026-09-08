<script setup lang="ts">
import type { MarkdownHeadingItem } from '#shared/utils/data/markdown'
import { refDebounced, useEventListener, useFileDialog, useStorage } from '@vueuse/core'
import {
  deriveMarkdownFilename,
  extractMarkdownHeading,
  extractMarkdownHeadings,
  generateHtmlDocument,
  parseMarkdown,
} from '#shared/utils/data/markdown'
import { formatReadingTime, getTextStats } from '#shared/utils/data/stats'

const DRAFT_KEY = 'kitdev:markdown-studio:draft'
const autoSaveDraft = useToolOption<boolean>('autosave-draft', false)
const gfmBreaks = useToolOption<boolean>('gfm-breaks', false)
const savedDraft = useStorage<string>(DRAFT_KEY, '')
const hasStoredDraft = computed(() => Boolean(savedDraft.value))

const sampleMarkdown = `# Markdown Live Studio

Write markdown on the left. The live preview updates on the right in real time.

## GitHub-Flavored Markdown Features

This tool supports tables, task lists, strikethrough, and code blocks.

### Task List
- [x] Create project layout
- [x] Add real-time markdown compiler
- [ ] Share compiled document

### Formatted Table
| Feature | Supported | Notes |
| :--- | :---: | :--- |
| Tables | Yes | Standard GFM pipe tables |
| Checklists | Yes | Interactive style task lists |
| Code Blocks | Yes | Inline and fenced code blocks |
| Elements | Yes | Details, summary, and kbd |

### Code and Quotes
> Markdown is a lightweight markup language for plain text formatting.

You can run \`bun dev\` or install packages with:
\`\`\`bash
bun add marked
\`\`\`

You can also use ~~strikethrough~~ and **bold** text. Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

<details>
<summary>Advanced Details</summary>

This collapsible disclosure element runs natively in HTML preview and exports.
</details>
`

const input = ref(sampleMarkdown)
const toast = useToast()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const { open: openFileDialog, onChange: onFileChange } = useFileDialog({
  accept: '.md,text/markdown,text/plain',
  multiple: false,
})

onFileChange(async (files) => {
  if (!files || files.length === 0) {
    return
  }
  const file = files[0]
  if (file) {
    await handleFileLoaded(file)
  }
})

async function handleFileLoaded(file: File) {
  try {
    const text = await file.text()
    input.value = text
    toast.add({
      title: `Loaded ${file.name}`,
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: 'Failed to read file',
      color: 'error',
    })
  }
}

useToolSeo('markdown-studio')

const debouncedInput = refDebounced(input, 200)
const compiledHtml = computed(() => parseMarkdown(debouncedInput.value, { breaks: gfmBreaks.value }))
useLiveTool(compiledHtml)
const stats = computed(() => getTextStats(input.value))

async function handleCopyHtml() {
  if (!input.value.trim()) {
    return
  }
  const html = parseMarkdown(input.value, { breaks: gfmBreaks.value })
  await copy(html, 'html')
}

async function handleCopyMarkdown() {
  if (!input.value) {
    return
  }
  await copy(input.value, 'markdown')
}

function handleDownload() {
  if (!input.value.trim()) {
    return
  }
  const heading = extractMarkdownHeading(input.value)
  const title = heading || 'Markdown Document'
  const filename = deriveMarkdownFilename(input.value, 'html', 'document')
  const html = parseMarkdown(input.value, { breaks: gfmBreaks.value })
  const documentHtml = generateHtmlDocument(html, title)
  downloadText(filename, documentHtml, 'text/html')
  toast.add({
    title: `Downloaded ${filename}`,
    color: 'success',
  })
}

function handleLoadSample() {
  input.value = sampleMarkdown
}

function handleClear() {
  input.value = ''
}

onMounted(() => {
  if (autoSaveDraft.value && savedDraft.value) {
    input.value = savedDraft.value
  }
})

watch(input, (val) => {
  if (autoSaveDraft.value) {
    savedDraft.value = val
  }
})

watch(autoSaveDraft, (enabled) => {
  if (enabled) {
    savedDraft.value = input.value
  }
  else {
    savedDraft.value = ''
  }
})

function handleClearDraft() {
  savedDraft.value = ''
  toast.add({
    title: 'Local draft cleared',
    color: 'neutral',
  })
}

const headings = computed(() => extractMarkdownHeadings(debouncedInput.value))
const showOutline = ref(true)
const syncScroll = useToolOption<boolean>('sync-scroll', true)

const previewRef = ref<HTMLDivElement | null>(null)
const editorContainerRef = ref<HTMLDivElement | null>(null)

let isJumping = false
let rafId: number | null = null

function onEditorScroll() {
  if (!syncScroll.value || isJumping) {
    return
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  rafId = requestAnimationFrame(() => {
    rafId = null
    const editorScroller = editorContainerRef.value?.querySelector('.cm-scroller') as HTMLElement | null
    const previewEl = previewRef.value
    if (!editorScroller || !previewEl) {
      return
    }
    const maxEditor = editorScroller.scrollHeight - editorScroller.clientHeight
    if (maxEditor <= 0) {
      return
    }
    const ratio = Math.min(Math.max(editorScroller.scrollTop / maxEditor, 0), 1)
    const maxPreview = previewEl.scrollHeight - previewEl.clientHeight
    if (maxPreview > 0) {
      previewEl.scrollTop = ratio * maxPreview
    }
  })
}

useEventListener(editorContainerRef, 'scroll', onEditorScroll, { capture: true, passive: true })

function jumpToHeading(item: MarkdownHeadingItem) {
  isJumping = true

  // Jump editor
  const scroller = editorContainerRef.value?.querySelector('.cm-scroller') as HTMLElement | null
  if (scroller) {
    const totalLines = (input.value.match(/\n/g)?.length ?? 0) + 1
    const lineRatio = Math.max(0, (item.line - 1) / Math.max(totalLines - 1, 1))
    const maxScroll = scroller.scrollHeight - scroller.clientHeight
    if (maxScroll > 0) {
      scroller.scrollTo({
        top: lineRatio * maxScroll,
        behavior: 'smooth',
      })
    }
  }

  // Jump preview
  const previewEl = previewRef.value
  if (previewEl) {
    const targetEl = previewEl.querySelector(`#${item.slug}`) as HTMLElement | null
    if (targetEl) {
      const previewRect = previewEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const topOffset = targetRect.top - previewRect.top + previewEl.scrollTop
      previewEl.scrollTo({
        top: topOffset,
        behavior: 'smooth',
      })
    }
  }

  setTimeout(() => {
    isJumping = false
  }, 400)
}
</script>

<template>
  <ToolPage>
    <!-- eslint-disable vue/no-v-html -->

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Your markdown text stays on your device."
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="Characters" :value="stats.characters" />
      <StatCard label="Words" :value="stats.words" />
      <StatCard label="Estimated Read Time" :value="formatReadingTime(stats.readingTimeMinutes)" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-default bg-muted/20 p-3 text-sm">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-3">
          <USwitch
            v-model="autoSaveDraft"
            label="Save draft locally in browser"
          />
          <UBadge
            v-if="autoSaveDraft"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            Draft saved
          </UBadge>
        </div>
        <USwitch
          v-model="syncScroll"
          label="Sync scroll"
        />
        <USwitch
          v-model="gfmBreaks"
          label="GFM line breaks"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="showOutline ? 'Hide Outline' : 'Show Outline'"
          color="neutral"
          variant="subtle"
          size="xs"
          icon="i-lucide-list"
          @click="showOutline = !showOutline"
        />
        <UButton
          v-if="autoSaveDraft || hasStoredDraft"
          label="Clear Draft"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          :disabled="!hasStoredDraft"
          @click="handleClearDraft"
        />
      </div>
    </div>

    <div
      v-if="showOutline"
      class="rounded-lg border border-default bg-elevated p-3"
    >
      <div class="flex items-center justify-between border-b border-default pb-2 mb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-list" class="size-4 text-muted" />
          <span class="text-xs font-semibold uppercase tracking-wider text-muted">Document Outline</span>
        </div>
        <UBadge color="neutral" variant="subtle" size="xs">
          {{ headings.length }} {{ headings.length === 1 ? 'heading' : 'headings' }}
        </UBadge>
      </div>
      <div v-if="headings.length > 0" class="max-h-40 overflow-y-auto space-y-0.5 text-xs">
        <button
          v-for="h in headings"
          :key="h.slug"
          type="button"
          class="flex w-full items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
          :style="{ paddingLeft: `${(h.level - 1) * 0.75 + 0.5}rem` }"
          @click="jumpToHeading(h)"
        >
          <span class="text-[10px] font-mono font-semibold text-muted shrink-0">H{{ h.level }}</span>
          <span class="truncate text-default">{{ h.text }}</span>
          <span class="ms-auto text-[10px] font-mono text-muted shrink-0">L{{ h.line }}</span>
        </button>
      </div>
      <p v-else class="text-xs text-muted py-1">
        No headings found. Add headings with # to build an outline.
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div ref="editorContainerRef" class="h-full">
        <LazyToolEditor
          v-model="input"
          hydrate-on-idle
          label="Markdown Input"
          placeholder="Type or paste markdown here"
          :rows="18"
          lang="markdown"
          accept=".md,text/markdown,text/plain"
          @file-loaded="handleFileLoaded"
        />
      </div>

      <div class="flex flex-col">
        <UFormField label="HTML Preview">
          <ClientOnly>
            <div
              ref="previewRef"
              class="markdown-preview min-h-[445px] w-full overflow-auto rounded-md bg-elevated p-4 ring ring-inset ring-accented text-sm leading-relaxed"
            >
              <div
                v-if="compiledHtml"
                class="markdown-body"
                v-html="compiledHtml"
              />
              <div
                v-else
                class="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-muted"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="size-10 opacity-40 mb-2"
                />
                <p>Type markdown on the left to see the live preview.</p>
              </div>
            </div>
            <template #fallback>
              <div
                class="min-h-[445px] rounded-md bg-elevated ring ring-inset ring-accented"
                aria-hidden="true"
              />
            </template>
          </ClientOnly>
        </UFormField>
      </div>
    </div>

    <ToolActions>
      <UButton
        label="Open File"
        color="neutral"
        variant="subtle"
        icon="i-lucide-folder-open"
        @click="openFileDialog()"
      />
      <UButton
        label="Download HTML"
        icon="i-lucide-download"
        :disabled="!input.trim()"
        @click="handleDownload"
      />
      <UButton
        :label="copyLabel('html', 'Copy HTML')"
        :color="copyColor('html')"
        variant="subtle"
        :icon="copyIcon('html')"
        :disabled="!input.trim()"
        @click="handleCopyHtml"
      />
      <UButton
        :label="copyLabel('markdown', 'Copy Markdown')"
        :color="copyColor('markdown')"
        variant="subtle"
        :icon="copyIcon('markdown', 'i-lucide-file-text')"
        :disabled="!input.trim()"
        @click="handleCopyMarkdown"
      />
      <UButton
        label="Load Sample"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        @click="handleLoadSample"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        :disabled="!input"
        @click="handleClear"
      />
    </ToolActions>

    <template #docs>
      <ToolDocs title="About Markdown Live Studio">
        <div class="space-y-4 text-muted">
          <p>
            Markdown Live Studio converts plain text Markdown into formatted HTML in real time.
          </p>
          <p>
            The tool supports GitHub-Flavored Markdown specifications. You can create tables, strike text, write code blocks, and track task checklists.
          </p>
          <p>
            The metrics bar updates character counts, word counts, and estimated read times as you type. Read time calculations assume an average speed of 200 words per minute.
          </p>
          <p>
            Select <strong>Download HTML</strong> to export a complete, styled HTML file ready for publishing or sharing.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Lorem Ipsum & Mock Data', to: '/hub/data/lorem' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>

<style scoped>
.markdown-preview :deep(.markdown-body h1) {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--ui-border);
}

.markdown-preview :deep(.markdown-body h2) {
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--ui-border-muted);
}

.markdown-preview :deep(.markdown-body h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-preview :deep(.markdown-body p) {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.markdown-preview :deep(.markdown-body ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.markdown-preview :deep(.markdown-body ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.markdown-preview :deep(.markdown-body li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.markdown-preview :deep(.markdown-body li input[type="checkbox"]) {
  margin-right: 0.5rem;
  vertical-align: middle;
}

.markdown-preview :deep(.markdown-body blockquote) {
  border-left: 4px solid var(--ui-primary);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--ui-text-muted);
  font-style: italic;
}

.markdown-preview :deep(.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.markdown-preview :deep(.markdown-body th),
.markdown-preview :deep(.markdown-body td) {
  border: 1px solid var(--ui-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-preview :deep(.markdown-body th) {
  background-color: var(--ui-bg-accented);
  font-weight: 600;
}

.markdown-preview :deep(.markdown-body code) {
  font-family: var(--font-mono);
  background-color: var(--ui-bg-accented);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.markdown-preview :deep(.markdown-body pre) {
  background-color: var(--ui-bg-accented);
  padding: 0.875rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.75rem 0;
}

.markdown-preview :deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-preview :deep(.markdown-body hr) {
  border: 0;
  border-top: 1px solid var(--ui-border);
  margin: 1.5rem 0;
}

.markdown-preview :deep(.markdown-body a) {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-preview :deep(.markdown-body kbd) {
  font-family: var(--font-mono);
  background-color: var(--ui-bg-accented);
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  padding: 0.1rem 0.35rem;
  font-size: 0.8em;
}

.markdown-preview :deep(.markdown-body details) {
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin: 0.75rem 0;
  background-color: var(--ui-bg-accented);
}

.markdown-preview :deep(.markdown-body summary) {
  font-weight: 600;
  cursor: pointer;
}

.markdown-preview :deep(.markdown-body img) {
  max-width: 100%;
  height: auto;
}
</style>
