<script setup lang="ts">
import {
  generateHtmlDocument,
  getMarkdownStats,
  parseMarkdown
} from '~~/shared/utils/data/markdown'

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
| Code Highlighting | Yes | Inline and fenced code blocks |

### Code and Quotes
> Markdown is a lightweight markup language for plain text formatting.

You can run \`bun dev\` or install packages with:
\`\`\`bash
bun add marked
\`\`\`

You can also use ~~strikethrough~~ and **bold** text.
`

const input = ref(sampleMarkdown)
const toast = useToast()
const { copy, copied } = useClipboard({ legacy: true })
const { downloadText } = useDownload()
const { track } = useToolAnalytics()

useToolSeo('markdown-studio')

onMounted(() => {
  track('tool_open', { tool: 'markdown-studio' })
})

const compiledHtml = computed(() => parseMarkdown(input.value))
const stats = computed(() => getMarkdownStats(input.value))

async function handleCopyHtml() {
  if (!compiledHtml.value) {
    return
  }
  await copy(compiledHtml.value)
  toast.add({
    title: copied.value ? 'Copied HTML' : 'Copy failed',
    color: copied.value ? 'success' : 'error'
  })
  if (copied.value) {
    track('tool_copy', { tool: 'markdown-studio' })
  }
}

async function handleCopyMarkdown() {
  if (!input.value) {
    return
  }
  await copy(input.value)
  toast.add({
    title: copied.value ? 'Copied Markdown' : 'Copy failed',
    color: copied.value ? 'success' : 'error'
  })
  if (copied.value) {
    track('tool_copy', { tool: 'markdown-studio' })
  }
}

function handleDownload() {
  if (!compiledHtml.value) {
    return
  }
  const documentHtml = generateHtmlDocument(compiledHtml.value, 'Markdown Document')
  downloadText('document.html', documentHtml, 'text/html')
  track('tool_download', { tool: 'markdown-studio' })
  toast.add({
    title: 'Downloaded HTML file',
    color: 'success'
  })
}

function handleLoadSample() {
  input.value = sampleMarkdown
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <!-- eslint-disable vue/no-v-html -->
    <template #header>
      <ToolHeader
        title="Markdown Live Studio"
        description="Write markdown with a real-time HTML preview and text metrics."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Your markdown text stays on your device."
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-default bg-elevated p-3">
        <p class="text-xs font-medium text-muted">
          Characters
        </p>
        <p class="mt-1 text-2xl font-semibold">
          {{ stats.characters.toLocaleString() }}
        </p>
      </div>

      <div class="rounded-lg border border-default bg-elevated p-3">
        <p class="text-xs font-medium text-muted">
          Words
        </p>
        <p class="mt-1 text-2xl font-semibold">
          {{ stats.words.toLocaleString() }}
        </p>
      </div>

      <div class="rounded-lg border border-default bg-elevated p-3">
        <p class="text-xs font-medium text-muted">
          Estimated Read Time
        </p>
        <p class="mt-1 text-2xl font-semibold">
          {{ stats.readingTime }}
        </p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <ToolEditor
        v-model="input"
        label="Markdown Input"
        placeholder="Type or paste markdown here"
        :rows="18"
      />

      <div class="flex flex-col">
        <UFormField label="HTML Preview">
          <ClientOnly>
            <div
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
        label="Download HTML"
        icon="i-lucide-download"
        :disabled="!input.trim()"
        @click="handleDownload"
      />
      <UButton
        label="Copy HTML"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!input.trim()"
        @click="handleCopyHtml"
      />
      <UButton
        label="Copy Markdown"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        :disabled="!input.trim()"
        @click="handleCopyMarkdown"
      />
      <UButton
        label="Load Sample"
        color="neutral"
        variant="subtle"
        icon="i-lucide-sparkles"
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
      <DataToolDocs title="About Markdown Live Studio">
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
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Lorem Ipsum & Mock Data', to: '/hub/data/lorem' },
            { label: 'HTML & URL Codec', to: '/hub/dev/html-url-codec' }
          ]"
        />
      </DataToolDocs>
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
</style>
