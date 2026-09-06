<script setup lang="ts">
import {
  type EscapeMode,
  escapeString,
  unescapeString
} from '#shared/utils/dev/string-escape'

useToolSeo('string-escape')

const input = ref('Hello "World"\nNew line with \'quotes\' and <tags>')
const mode = ref<EscapeMode>('json')
const action = ref<'escape' | 'unescape'>('escape')

const { copy, label, color, icon } = useCopyFeedback()

const modes: { label: string, value: EscapeMode }[] = [
  { label: 'JSON', value: 'json' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'shell' }
]

const result = computed(() => {
  if (!input.value) return ''
  return action.value === 'escape'
    ? escapeString(input.value, mode.value)
    : unescapeString(input.value, mode.value)
})

function handleCopy() {
  copy(result.value)
}

function handleClear() {
  input.value = ''
}

useSeoMeta({
  title: 'String Escape Tool — KitDev Space',
  description: 'Escape and unescape strings for JSON, JavaScript, HTML, SQL, and shell.'
})
</script>

<template>
  <ToolPage
    title="String Escape Tool"
    description="Escape and unescape special characters for various programming languages."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-3">
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="action === 'escape' ? 'solid' : 'ghost'"
              color="neutral"
              label="Escape"
              @click="action = 'escape'"
            />
            <UButton
              size="xs"
              :variant="action === 'unescape' ? 'solid' : 'ghost'"
              color="neutral"
              label="Unescape"
              @click="action = 'unescape'"
            />
          </div>

          <div class="flex items-center gap-1">
            <UButton
              v-for="m in modes"
              :key="m.value"
              size="xs"
              :variant="mode === m.value ? 'subtle' : 'ghost'"
              color="primary"
              :label="m.label"
              @click="mode = m.value"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!result"
            @click="handleCopy"
          />
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Editors -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs font-medium text-muted block">Input Text</label>
          <textarea
            v-model="input"
            rows="10"
            placeholder="Type or paste text..."
            class="w-full p-3 font-mono text-xs bg-default border border-default rounded-xl text-highlighted resize-y focus:outline-none focus:border-primary"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-muted block">Result</label>
            <span class="text-[10px] text-muted font-mono uppercase">{{ mode }} • {{ action }}</span>
          </div>
          <textarea
            :value="result"
            readonly
            rows="10"
            class="w-full p-3 font-mono text-xs bg-elevated/40 border border-default rounded-xl text-highlighted resize-y select-all focus:outline-none"
          />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
