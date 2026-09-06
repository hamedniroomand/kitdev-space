<script setup lang="ts">
import {
  createDicewarePassphrase,
  estimateDicewareEntropyBits,
  type DicewareCapitalize
} from '~~/shared/utils/crypto/diceware'

const wordCount = ref(6)
const separator = ref('-')
const capitalize = ref<DicewareCapitalize>('none')
const output = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy, copied } = useClipboard({ legacy: true })

const capitalizeItems = [
  { label: 'None', value: 'none' },
  { label: 'First word', value: 'first' },
  { label: 'All words', value: 'all' }
]

const separatorItems = [
  { label: 'Hyphen (-)', value: '-' },
  { label: 'Space', value: ' ' },
  { label: 'Dot (.)', value: '.' },
  { label: 'None', value: '' },
  { label: 'Underscore (_)', value: '_' }
]

const entropy = computed(() => estimateDicewareEntropyBits(wordCount.value))

useToolSeo('passphrase')

async function generate() {
  await run(() => createDicewarePassphrase({
    wordCount: wordCount.value,
    separator: separator.value,
    capitalize: capitalize.value
  }))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
}

function handleClear() {
  output.value = ''
  reset()
}

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
    <template #header>
      <ToolHeader
        title="Passphrase Generator"
        description="Generate Diceware passphrases with the EFF large word list."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser with crypto.getRandomValues()."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Words">
        <UInput
          v-model.number="wordCount"
          type="number"
          :min="3"
          :max="12"
          class="w-28"
        />
      </UFormField>
      <UFormField label="Separator">
        <USelect
          v-model="separator"
          :items="separatorItems"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Capitalization">
        <USelect
          v-model="capitalize"
          :items="capitalizeItems"
          class="w-44"
        />
      </UFormField>
    </div>

    <p class="text-sm text-muted">
      About {{ entropy }} bits of entropy for {{ wordCount }} words.
    </p>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-dices"
        :loading="status === 'processing'"
        @click="generate"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!output"
        @click="handleCopy"
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
      <DataToolDocs title="About Diceware passphrases">
        <div class="space-y-4 text-muted">
          <p>
            The tool picks words from the EFF large list with secure random values.
          </p>
          <p>
            Prefer six or more words for important accounts. Do not use this tool as a password manager.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Random String Generator', to: '/hub/crypto/random-string' },
            { label: 'Password Benchmarker', to: '/hub/crypto/password-benchmark' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
