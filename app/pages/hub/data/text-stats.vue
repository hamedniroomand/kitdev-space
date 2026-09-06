<script setup lang="ts">
import { getTextStats } from '#shared/utils/data/stats'

useToolSeo('text-stats')

const input = ref(
  'KitDev Space is an open-source suite of developer utilities designed for efficiency.\n\nAll tools run directly in the browser or on the Bun runtime with zero tracking, high performance, and complete data privacy.'
)

const stats = computed(() => getTextStats(input.value))

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
        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Words</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.words.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Characters</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.characters.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Without Spaces</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.charactersWithoutSpaces.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Sentences</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.sentences.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Lines</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.lines.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Paragraphs</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.paragraphs.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">UTF-8 Bytes</span>
          <span class="text-2xl font-bold font-mono text-highlighted mt-1 block">{{ stats.bytes.toLocaleString() }}</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Reading Time</span>
          <span class="text-2xl font-bold font-mono text-primary mt-1 block">{{ stats.readingTimeMinutes }} min</span>
        </div>

        <div class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center">
          <span class="text-xs text-muted font-medium block">Speaking Time</span>
          <span class="text-2xl font-bold font-mono text-primary mt-1 block">{{ stats.speakingTimeMinutes }} min</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted font-medium">Text Input</span>
        <div class="flex items-center gap-2">
          <UButton
            label="Load Sample"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-file-text"
            @click="handleLoadSample"
          />
          <UButton
            label="Clear"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-eraser"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Editor -->
      <textarea
        v-model="input"
        rows="12"
        placeholder="Type or paste text here to see statistics..."
        class="w-full p-4 font-mono text-xs bg-default border border-default rounded-xl text-highlighted resize-y focus:outline-none focus:border-primary leading-relaxed"
      />
    </div>
  </ToolPage>
</template>
