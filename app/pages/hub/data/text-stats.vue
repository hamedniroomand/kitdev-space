<script setup lang="ts">
import { getTextStats } from '#shared/utils/data/stats'

useToolSeo('text-stats')

const input = ref(
  'KitDev Space is an open-source suite of developer utilities designed for efficiency.\n\nAll tools run directly in the browser or on the Bun runtime with zero tracking, high performance, and complete data privacy.',
)

const stats = computed(() => getTextStats(input.value))
useLiveTool(stats)

function handleClear() {
  input.value = ''
}

function handleLoadSample() {
  input.value = 'Markdown is a lightweight markup language for creating formatted text using a plain-text editor. John Gruber created Markdown in 2004 as a markup language that is appealing to human readers in its source code form.\n\nMarkdown is widely used in blogging, instant messaging, online forums, collaborative software, documentation pages, and readme files.'
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Metric Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <StatCard aria-label="Word count" label="Words" :value="stats.words" />
        <StatCard label="Characters" :value="stats.characters" />
        <StatCard label="Without Spaces" :value="stats.charactersWithoutSpaces" />
        <StatCard label="Sentences" :value="stats.sentences" />
        <StatCard label="Lines" :value="stats.lines" />
        <StatCard label="Paragraphs" :value="stats.paragraphs" />
        <StatCard label="UTF-8 Bytes" :value="stats.bytes" />
        <StatCard label="Reading Time" :value="stats.readingTimeMinutes" unit="min" color="primary" />
        <StatCard label="Speaking Time" :value="stats.speakingTimeMinutes" unit="min" color="primary" />
      </div>

      <!-- Actions -->
      <ToolActions>
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

      <!-- Editor -->
      <LazyToolEditor
        v-model="input"
        hydrate-on-idle
        label="Text input"
        placeholder="Type or paste text here to see statistics..."
      />
    </div>

    <template #docs>
      <ToolDocs title="About text statistics">
        <div class="space-y-4 text-muted">
          <p>
            This tool counts the parts of a text. It gives the character count, the word count, the sentence count, the paragraph count, and the size in UTF-8 bytes.
          </p>
          <p>
            The byte count is not the character count. An emoji or an accented letter uses more than one byte, which matters for a database column limit or an SMS.
          </p>
          <p>
            The reading time uses 200 words for each minute. The speaking time uses 130 words for each minute, which suits a talk or a video script.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Markdown Studio', to: '/hub/data/markdown-studio' },
            { label: 'Unicode Inspector', to: '/hub/data/unicode' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
