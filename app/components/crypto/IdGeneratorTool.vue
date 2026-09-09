<script setup lang="ts">
import type { DicewareCapitalize } from '#shared/utils/crypto/diceware'
import type { RandomCharset } from '#shared/utils/crypto/random-string'
import type { IdType } from '#shared/utils/crypto/uuid'
import { createDicewarePassphrase, estimateDicewareEntropyBits } from '#shared/utils/crypto/diceware'
import { createRandomString, randomStringAlphabet } from '#shared/utils/crypto/random-string'
import { createId, inspectId } from '#shared/utils/crypto/uuid'

type Kind = 'id' | 'string' | 'passphrase'

const props = withDefaults(defineProps<{
  /** The registry id of the page. A variant page gives its own id. */
  toolId: string
  /** The kind of value that is selected when the page opens. */
  kind?: Kind
  idType?: IdType
}>(), { kind: 'id', idType: 'uuidv4' })

const KIND_ITEMS: { label: string, value: Kind, icon: string }[] = [
  { label: 'ID', value: 'id', icon: 'i-lucide-fingerprint' },
  { label: 'Random string', value: 'string', icon: 'i-lucide-dices' },
  { label: 'Passphrase', value: 'passphrase', icon: 'i-lucide-key-round' },
]

const idItems = [
  { label: 'UUID v4 (random)', value: 'uuidv4' },
  { label: 'UUID v7 (time ordered)', value: 'uuidv7' },
  { label: 'ULID', value: 'ulid' },
  { label: 'NanoID', value: 'nanoid' },
]

const charsetItems = [
  { label: 'Letters and digits', value: 'alnum' },
  { label: 'Letters', value: 'alpha' },
  { label: 'Digits', value: 'numeric' },
  { label: 'Hex', value: 'hex' },
]

const capitalizeItems = [
  { label: 'None', value: 'none' },
  { label: 'First word', value: 'first' },
  { label: 'Every word', value: 'all' },
]

const kind = ref<Kind>(props.kind)
const count = ref(5)

const idType = ref<IdType>(props.idType)
const nanoIdLength = ref(21)

const stringLength = ref(32)
const charset = ref<RandomCharset>('alnum')
const includeSymbols = ref(false)
const excludeAmbiguous = ref(false)

const wordCount = ref(6)
const separator = ref('-')
const capitalize = ref<DicewareCapitalize>('none')

const inspectInput = ref('')
const { result: inspection, error: inspectError } = useLiveTool(() => {
  const value = inspectInput.value.trim()
  return value ? inspectId(value) : null
})

const inspectedLocalTime = computed(() => (
  inspection.value ? new Date(inspection.value.timestampMs).toLocaleString() : ''
))

const values = ref<string[]>([])
const { error, run, reset } = useTool<string[]>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo(props.toolId)

// A symbol or an ambiguous character changes the size of the hex and digit sets,
// so both toggles apply to the letter sets only.
const supportsExtraCharacters = computed(() => charset.value === 'alnum' || charset.value === 'alpha')

const stringOptions = computed(() => ({
  length: stringLength.value,
  charset: charset.value,
  includeSymbols: supportsExtraCharacters.value && includeSymbols.value,
  excludeAmbiguous: supportsExtraCharacters.value && excludeAmbiguous.value,
}))

const entropyBits = computed(() => {
  if (kind.value === 'passphrase') {
    return Math.round(estimateDicewareEntropyBits(wordCount.value))
  }
  if (kind.value === 'string') {
    // Each character carries log2(alphabet) bits.
    return Math.round(stringLength.value * Math.log2(randomStringAlphabet(stringOptions.value).length))
  }
  if (idType.value === 'nanoid') {
    return Math.round(nanoIdLength.value * Math.log2(64))
  }
  // A UUID v4 holds 122 random bits. A UUID v7 holds 74 bits (12+62). A ULID holds 80 bits.
  if (idType.value === 'uuidv4') {
    return 122
  }
  if (idType.value === 'uuidv7') {
    return 74
  }
  return 80
})

const entropyColor = computed(() => {
  if (entropyBits.value >= 128)
    return 'success'
  if (entropyBits.value >= 72)
    return 'warning'
  return 'error'
})

function makeOne(): string {
  if (kind.value === 'id') {
    return createId(idType.value, { nanoIdLength: nanoIdLength.value })
  }
  if (kind.value === 'string') {
    return createRandomString(stringOptions.value)
  }
  return createDicewarePassphrase({
    wordCount: wordCount.value,
    separator: separator.value,
    capitalize: capitalize.value,
  })
}

async function generate() {
  await run(() => {
    const total = Math.min(Math.max(Math.floor(count.value), 1), 100)
    const next = Array.from({ length: total }, makeOne)
    values.value = next
    return next
  }, 'The generate operation failed.')
}

async function copyAll() {
  if (values.value.length) {
    await copy(values.value.join('\n'))
  }
}

async function copyOne(value: string, index: number) {
  await copy(value, String(index))
}

function handleDownload() {
  if (values.value.length) {
    downloadText(`${kind.value}.txt`, values.value.join('\n'), 'text/plain')
  }
}

function handleClear() {
  values.value = []
  reset()
}

watch([kind, idType, charset, includeSymbols, excludeAmbiguous], () => {
  values.value = []
  reset()
})

onMounted(() => {
  generate()
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="Generated in your browser"
      description="Every value uses crypto.getRandomValues on your device. Nothing is sent to a server."
    />

    <UFormField label="Type">
      <UTabs
        v-model="kind"
        :items="KIND_ITEMS"
        :content="false"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-3">
      <template v-if="kind === 'id'">
        <UFormField
          label="ID format"
          class="sm:col-span-2"
        >
          <USelect
            v-model="idType"
            :items="idItems"
            class="w-full"
          />
        </UFormField>
        <UFormField
          v-if="idType === 'nanoid'"
          label="Length"
        >
          <UInput
            v-model.number="nanoIdLength"
            type="number"
            :min="4"
            :max="64"
            class="w-full"
          />
        </UFormField>
      </template>

      <template v-else-if="kind === 'string'">
        <UFormField
          label="Character set"
          class="sm:col-span-2"
        >
          <USelect
            v-model="charset"
            :items="charsetItems"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Length">
          <UInput
            v-model.number="stringLength"
            type="number"
            :min="1"
            :max="512"
            class="w-full"
          />
        </UFormField>
        <div
          v-if="supportsExtraCharacters"
          class="flex flex-wrap gap-4 sm:col-span-3"
        >
          <UCheckbox
            v-model="includeSymbols"
            label="Include symbols"
          />
          <UCheckbox
            v-model="excludeAmbiguous"
            label="Exclude ambiguous characters (0 O l 1 I)"
          />
        </div>
      </template>

      <template v-else>
        <UFormField label="Words">
          <UInput
            v-model.number="wordCount"
            type="number"
            :min="3"
            :max="12"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Separator">
          <UInput
            v-model="separator"
            maxlength="8"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Capitals">
          <USelect
            v-model="capitalize"
            :items="capitalizeItems"
            class="w-full"
          />
        </UFormField>
      </template>
    </div>

    <div class="flex flex-wrap items-end gap-4">
      <UFormField
        label="How many"
        class="w-32"
      >
        <UInput
          v-model.number="count"
          type="number"
          :min="1"
          :max="100"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Strength">
        <UBadge
          :color="entropyColor"
          variant="subtle"
          size="lg"
        >
          about {{ entropyBits }} bits
        </UBadge>
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-refresh-cw"
        @click="generate"
      />
      <UButton
        :label="copyLabel('default', 'Copy all')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!values.length"
        @click="copyAll"
      />
      <UButton
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!values.length"
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

    <ul
      v-if="values.length"
      class="divide-y divide-default rounded-md border border-default"
    >
      <li
        v-for="(value, index) in values"
        :key="`${index}-${value}`"
        class="flex items-center justify-between gap-3 px-3 py-2"
      >
        <span class="break-all font-mono text-sm text-highlighted">{{ value }}</span>
        <UButton
          size="xs"
          variant="ghost"
          :icon="copyIcon(String(index))"
          :color="copyColor(String(index))"
          :aria-label="`Copy value ${index + 1}`"
          @click="copyOne(value, index)"
        />
      </li>
    </ul>

    <div
      v-if="kind === 'id'"
      class="space-y-3 rounded-md border border-default p-4"
    >
      <UFormField
        label="Inspect an ID"
        help="Paste a UUID v7 or a ULID to read the time that it holds."
      >
        <UInput
          v-model="inspectInput"
          placeholder="017f22e2-79b0-7cc3-98c4-dc0c0c07398f"
          class="w-full font-mono"
        />
      </UFormField>

      <ToolError
        v-if="inspectError"
        :message="inspectError"
      />

      <dl
        v-else-if="inspection"
        class="grid gap-3 sm:grid-cols-3"
      >
        <div>
          <dt class="text-xs text-muted">
            Format
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ inspection.format === 'ulid' ? 'ULID' : `UUID v${inspection.version}` }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Time (ISO)
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ inspection.iso }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Time (local)
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ inspectedLocalTime }}
          </dd>
        </div>
      </dl>
    </div>

    <template #docs>
      <slot name="docs" />
    </template>
  </ToolPage>
</template>
