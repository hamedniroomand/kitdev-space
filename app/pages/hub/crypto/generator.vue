<script setup lang="ts">
import type { DicewareCapitalize } from '#shared/utils/crypto/diceware'
import type { IdType } from '#shared/utils/crypto/uuid'
import type { RandomCharset } from '#shared/utils/crypto/random-string'
import { createDicewarePassphrase, estimateDicewareEntropyBits } from '#shared/utils/crypto/diceware'
import { createId } from '#shared/utils/crypto/uuid'
import { createRandomString } from '#shared/utils/crypto/random-string'

type Kind = 'id' | 'string' | 'passphrase'

const KIND_ITEMS: { label: string, value: Kind, icon: string }[] = [
  { label: 'ID', value: 'id', icon: 'i-lucide-fingerprint' },
  { label: 'Random string', value: 'string', icon: 'i-lucide-dices' },
  { label: 'Passphrase', value: 'passphrase', icon: 'i-lucide-key-round' }
]

const idItems = [
  { label: 'UUID v4 (random)', value: 'uuidv4' },
  { label: 'UUID v7 (time ordered)', value: 'uuidv7' },
  { label: 'ULID', value: 'ulid' },
  { label: 'NanoID', value: 'nanoid' }
]

const charsetItems = [
  { label: 'Letters and digits', value: 'alnum' },
  { label: 'Letters', value: 'alpha' },
  { label: 'Digits', value: 'numeric' },
  { label: 'Hex', value: 'hex' }
]

const capitalizeItems = [
  { label: 'None', value: 'none' },
  { label: 'First word', value: 'first' },
  { label: 'Every word', value: 'all' }
]

const kind = ref<Kind>('id')
const count = ref(5)

const idType = ref<IdType>('uuidv4')
const nanoIdLength = ref(21)

const stringLength = ref(32)
const charset = ref<RandomCharset>('alnum')

const wordCount = ref(6)
const separator = ref('-')
const capitalize = ref<DicewareCapitalize>('none')

const values = ref<string[]>([])
const { error, run, reset } = useTool<string[]>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo('generator')

// Each random string character carries log2(alphabet) bits.
const CHARSET_BITS: Record<RandomCharset, number> = {
  alnum: Math.log2(62),
  alpha: Math.log2(52),
  numeric: Math.log2(10),
  hex: 4
}

const entropyBits = computed(() => {
  if (kind.value === 'passphrase') {
    return Math.round(estimateDicewareEntropyBits(wordCount.value))
  }
  if (kind.value === 'string') {
    return Math.round(stringLength.value * CHARSET_BITS[charset.value])
  }
  if (idType.value === 'nanoid') {
    return Math.round(nanoIdLength.value * Math.log2(64))
  }
  // A UUID v4 holds 122 random bits. A v7 and a ULID hold fewer, plus a timestamp.
  return idType.value === 'uuidv4' ? 122 : 80
})

const entropyColor = computed(() => {
  if (entropyBits.value >= 128) return 'success'
  if (entropyBits.value >= 72) return 'warning'
  return 'error'
})

function makeOne(): string {
  if (kind.value === 'id') {
    return createId(idType.value, { nanoIdLength: nanoIdLength.value })
  }
  if (kind.value === 'string') {
    return createRandomString({ length: stringLength.value, charset: charset.value })
  }
  return createDicewarePassphrase({
    wordCount: wordCount.value,
    separator: separator.value,
    capitalize: capitalize.value
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

watch([kind, idType, charset], () => {
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

    <template #docs>
      <ToolDocs title="About random values">
        <div class="space-y-4 text-muted">
          <p>
            This tool makes three kinds of random value. An ID names a record. A random string makes
            a token or an API key. A passphrase makes a password that a person can remember.
          </p>
          <p>
            UUID v4 is fully random. UUID v7 and ULID start with a timestamp, so a database sorts
            them in the order of creation, which keeps an index small. NanoID is shorter than a UUID
            and is safe in a URL.
          </p>
          <p>
            The strength value counts the random bits. Aim for 128 bits or more for a secret. A
            six-word passphrase gives about 77 bits, which is strong for a login but weak for a key.
            Every value comes from crypto.getRandomValues, which is a cryptographic generator.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
