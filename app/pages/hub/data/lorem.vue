<script setup lang="ts">
import {
  generateLoremParagraphs,
  generateLoremWords
} from '#shared/utils/data/lorem'

type LoremMode = 'paragraphs' | 'words'

const mode = ref<LoremMode>('paragraphs')
const count = ref(3)
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const modeItems = [
  { label: 'Paragraphs', value: 'paragraphs' },
  { label: 'Words', value: 'words' }
]

useToolSeo('lorem')

async function generate() {
  await run(() => {
    return mode.value === 'paragraphs'
      ? generateLoremParagraphs(count.value)
      : generateLoremWords(count.value)
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

watch(mode, (next) => {
  count.value = next === 'paragraphs' ? 3 : 50
})

defineShortcuts({
  meta_enter: {
    handler: () => {
      generate()
    }
  }
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
      <UFormField :label="mode === 'words' ? 'Words' : 'Paragraphs'">
        <UInput
          v-model.number="count"
          type="number"
          :min="1"
          :max="mode === 'words' ? 5000 : 50"
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

    <ToolEditor
      v-model="output"
      label="Output"
      readonly
      placeholder="Result appears here"
    />

    <template #docs>
      <ToolDocs title="About mock data">
        <div class="space-y-4 text-muted">
          <p>
            Use this tool for layout drafts and demo UI data.
          </p>
          <p>
            Generated profiles are fake. Do not treat them as real people.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Fake Data Generator', to: '/hub/data/fake-generator' },
            { label: 'Text Statistics', to: '/hub/data/text-stats' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
