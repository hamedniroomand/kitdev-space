<script setup lang="ts">
import type { LoremMode } from '#shared/utils/data/lorem'
import { generateLorem } from '#shared/utils/data/lorem'

const mode = useToolOption<LoremMode>('lorem-mode', 'paragraphs')
const count = useToolOption<number>('lorem-count', 3)
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const modeItems = [
  { label: 'Paragraphs', value: 'paragraphs' },
  { label: 'Sentences', value: 'sentences' },
  { label: 'Words', value: 'words' },
]

const countLabel = computed(() => {
  switch (mode.value) {
    case 'words':
      return 'Words'
    case 'sentences':
      return 'Sentences'
    default:
      return 'Paragraphs'
  }
})

const maxCount = computed(() => {
  switch (mode.value) {
    case 'words':
      return 5000
    case 'sentences':
      return 500
    default:
      return 50
  }
})

watch(mode, () => {
  if (count.value > maxCount.value) {
    count.value = maxCount.value
  }
  else if (count.value < 1) {
    count.value = 1
  }
})

useToolSeo('lorem')

onMounted(() => {
  generate()
})

async function generate() {
  await run(() => {
    return generateLorem(mode.value, count.value)
  })
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText('lorem.txt', output.value, 'text/plain')
}

function handleClear() {
  output.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => generate(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Mode">
        <USelect
          v-model="mode"
          :items="modeItems"
          class="w-56"
        />
      </UFormField>
      <UFormField :label="countLabel">
        <UInput
          v-model.number="count"
          type="number"
          :min="1"
          :max="maxCount"
          class="w-28"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-refresh-cw"
        :loading="status === 'processing'"
        @click="generate"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Result appears here"
    />

    <template #docs>
      <ToolDocs title="About Lorem Ipsum">
        <div class="space-y-4 text-muted">
          <p>
            Use this tool to generate placeholder text in paragraphs, sentences, or words for layout drafts.
          </p>
          <p>
            For structured test records, mock users, or database fixtures, use the
            <NuxtLink
              to="/hub/data/fake-generator"
              class="text-primary hover:underline"
            >
              Fake Data Generator
            </NuxtLink>.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Fake Data Generator', to: '/hub/data/fake-generator' },
            { label: 'Text Statistics', to: '/hub/data/text-stats' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
