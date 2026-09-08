<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { getTextStats } from '#shared/utils/data/stats'

useToolSeo('text-stats')

const { copy, copied } = useClipboard({ legacy: true })

const input = ref(
  'KitDev Space is an open-source suite of developer utilities designed for efficiency.\n\nAll tools run directly in the browser or on the Bun runtime with zero tracking, high performance, and complete data privacy.',
)

const stats = computed(() => getTextStats(input.value))
useLiveTool(stats)

interface LimitPreset {
  label: string
  limit: number
}

const PRESETS: LimitPreset[] = [
  { label: 'Tweet (X)', limit: 280 },
  { label: 'Meta description', limit: 160 },
  { label: 'SMS', limit: 160 },
]

const selectedPreset = ref<LimitPreset | null>(null)

function selectPreset(preset: LimitPreset) {
  selectedPreset.value = selectedPreset.value?.label === preset.label ? null : preset
}

const presetProgress = computed(() => {
  if (!selectedPreset.value) {
    return null
  }
  const used = stats.value.graphemes
  const limit = selectedPreset.value.limit
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return {
    label: selectedPreset.value.label,
    limit,
    used,
    pct,
    remaining: limit - used,
    over: used > limit,
  }
})

const allStatsText = computed(() => {
  const s = stats.value
  const lines = [
    `Words: ${s.words}`,
    `Characters: ${s.characters}`,
    `Without spaces: ${s.charactersWithoutSpaces}`,
    `Sentences: ${s.sentences}`,
    `Lines: ${s.lines}`,
    `Paragraphs: ${s.paragraphs}`,
    `Code points: ${s.codePoints}`,
    `Graphemes: ${s.graphemes}`,
    `UTF-8 bytes: ${s.bytes}`,
    `Reading time: ${s.readingTimeMinutes} min`,
    `Speaking time: ${s.speakingTimeMinutes} min`,
  ]
  return lines.join('\n')
})

async function handleCopyAll() {
  await copy(allStatsText.value)
}

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
        <StatCard
          aria-label="Word count"
          label="Words"
          :value="stats.words"
        />
        <StatCard
          aria-label="Character count"
          label="Characters"
          :value="stats.characters"
        />
        <StatCard
          aria-label="Characters without spaces"
          label="Without Spaces"
          :value="stats.charactersWithoutSpaces"
        />
        <StatCard
          aria-label="Sentence count"
          label="Sentences"
          :value="stats.sentences"
        />
        <StatCard
          aria-label="Line count"
          label="Lines"
          :value="stats.lines"
        />
        <StatCard
          aria-label="Paragraph count"
          label="Paragraphs"
          :value="stats.paragraphs"
        />
        <StatCard
          aria-label="Unicode code point count"
          label="Code Points"
          :value="stats.codePoints"
        />
        <StatCard
          aria-label="Grapheme cluster count"
          label="Graphemes"
          :value="stats.graphemes"
        />
        <StatCard
          aria-label="UTF-8 byte size"
          label="UTF-8 Bytes"
          :value="stats.bytes"
        />
        <StatCard
          aria-label="Reading time in minutes"
          label="Reading Time"
          :value="stats.readingTimeMinutes"
          unit="min"
          color="primary"
        />
        <StatCard
          aria-label="Speaking time in minutes"
          label="Speaking Time"
          :value="stats.speakingTimeMinutes"
          unit="min"
          color="primary"
        />
      </div>

      <!-- Character Limit Presets -->
      <div class="space-y-2">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide">
          Limit Presets
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in PRESETS"
            :key="preset.label"
            :label="`${preset.label} (${preset.limit})`"
            size="xs"
            :color="selectedPreset?.label === preset.label ? 'primary' : 'neutral'"
            :variant="selectedPreset?.label === preset.label ? 'solid' : 'subtle'"
            @click="selectPreset(preset)"
          />
        </div>
        <div
          v-if="presetProgress"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs text-muted">
            <span>{{ presetProgress.used }} / {{ presetProgress.limit }} graphemes</span>
            <span
              :class="presetProgress.over ? 'text-error font-semibold' : ''"
              :aria-label="`${presetProgress.pct}% of ${presetProgress.label} limit used`"
            >
              {{ presetProgress.over ? `${-presetProgress.remaining} over limit` : `${presetProgress.remaining} remaining` }}
            </span>
          </div>
          <div
            class="h-2 rounded-full overflow-hidden bg-muted/20"
            role="progressbar"
            :aria-label="`${presetProgress.label} character limit`"
            :aria-valuenow="presetProgress.used"
            :aria-valuemax="presetProgress.limit"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="presetProgress.over ? 'bg-error' : presetProgress.pct > 85 ? 'bg-warning' : 'bg-primary'"
              :style="{ width: `${presetProgress.pct}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <ToolActions>
        <UButton
          :label="copied ? 'Copied!' : 'Copy all stats'"
          :color="copied ? 'success' : 'neutral'"
          variant="subtle"
          :icon="copied ? 'i-lucide-check' : 'i-lucide-clipboard-list'"
          :disabled="!input"
          @click="handleCopyAll"
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

      <!-- Editor -->
      <ToolEditor
        v-model="input"
        label="Text input"
        placeholder="Type or paste text here to see statistics..."
      />
    </div>

    <template #docs>
      <ToolDocs title="About Text Statistics">
        <div class="space-y-4 text-muted">
          <p>
            This tool counts the parts of a text. It gives the word count, the sentence count, the paragraph count, and the size in UTF-8 bytes.
          </p>
          <p>
            <strong>Counting rules:</strong>
            Sentences end with a period, exclamation mark, or question mark. Words are whitespace-separated tokens. Lines count at each newline character. Paragraphs separate at a blank line.
          </p>
          <p>
            <strong>Graphemes</strong> are user-perceived characters. An emoji such as a family sequence counts as one grapheme but many code points.
            The grapheme count uses <code>Intl.Segmenter</code> and matches what a user sees on screen.
          </p>
          <p>
            The limit presets show progress bars for Twitter/X (280), meta description (160), and SMS (160) character limits. Grapheme count is used, which matches most platform counting rules.
          </p>
          <p>
            The reading time uses 200 words per minute. The speaking time uses 130 words per minute.
          </p>
          <p>
            The byte count is not the character count. An emoji or an accented letter uses more than one byte, which matters for a database column limit or an SMS message.
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
