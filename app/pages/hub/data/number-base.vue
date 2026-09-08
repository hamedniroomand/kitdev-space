<script setup lang="ts">
import type { NumberBase, TwosComplementWidth } from '#shared/utils/data/number-base'
import { convertFromBase, groupDigits, twosComplement, validateDigits } from '#shared/utils/data/number-base'

useToolSeo('number-base')

const decimalVal = ref('255')
const hexVal = ref('FF')
const binaryVal = ref('11111111')
const octalVal = ref('377')
const error = ref<string | null>(null)
const groupingEnabled = ref(false)
const twosWidth = ref<TwosComplementWidth>(8)

const { copy, label, color, icon } = useCopyFeedback()

useLiveTool(() => {
  if (error.value) {
    throw new Error(error.value)
  }
  return { decimal: decimalVal.value, hex: hexVal.value, binary: binaryVal.value, octal: octalVal.value }
})

function updateFrom(val: string, base: NumberBase) {
  if (!val.trim()) {
    error.value = null
    if (base !== 10)
      decimalVal.value = ''
    if (base !== 16)
      hexVal.value = ''
    if (base !== 2)
      binaryVal.value = ''
    if (base !== 8)
      octalVal.value = ''
    return
  }

  try {
    const res = convertFromBase(val, base)
    error.value = null
    if (base !== 10)
      decimalVal.value = res.decimal
    if (base !== 16)
      hexVal.value = res.hex
    if (base !== 2)
      binaryVal.value = res.binary
    if (base !== 8)
      octalVal.value = res.octal
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Invalid number.'
  }
}

function applyPreset(val: string) {
  decimalVal.value = val
  updateFrom(val, 10)
}

function handleCopy(text: string, key: string) {
  copy(text, key)
}

function displayValue(val: string, base: NumberBase): string {
  if (!groupingEnabled.value || !val) {
    return val
  }
  return groupDigits(val, base)
}

function hasInvalidDigits(val: string, base: NumberBase): boolean {
  if (!val.trim()) {
    return false
  }
  return validateDigits(val, base).some(v => !v)
}

const twosWidthItems = [
  { label: '8-bit', value: 8 },
  { label: '16-bit', value: 16 },
  { label: '32-bit', value: 32 },
  { label: '64-bit', value: 64 },
]

const twosResult = computed(() => {
  if (!decimalVal.value.trim()) {
    return null
  }
  return twosComplement(decimalVal.value, twosWidth.value)
})
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Error notice -->
      <ToolError
        v-if="error"
        :message="error"
      />

      <!-- Presets -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted font-medium mr-1">Presets:</span>
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="255 (8-bit max)"
          @click="applyPreset('255')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="1024 (1 KiB)"
          @click="applyPreset('1024')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="65535 (16-bit max)"
          @click="applyPreset('65535')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="4294967295 (32-bit max)"
          @click="applyPreset('4294967295')"
        />
      </div>

      <!-- Grouping toggle -->
      <div class="flex items-center gap-3">
        <UToggle
          v-model="groupingEnabled"
          aria-label="Enable digit grouping"
          size="sm"
        />
        <span class="text-sm text-muted">Group digits (binary by 4, decimal by 3, hex by 2)</span>
      </div>

      <!-- Base Inputs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Decimal (Base 10) -->
        <div
          class="p-4 rounded-xl border bg-elevated/40 space-y-2"
          :class="hasInvalidDigits(decimalVal, 10) ? 'border-error' : 'border-default'"
        >
          <UFormField label="Decimal (Base 10)">
            <template #hint>
              <div class="flex items-center gap-2">
                <span
                  v-if="hasInvalidDigits(decimalVal, 10)"
                  class="text-xs text-error font-semibold"
                  role="alert"
                  aria-label="Invalid decimal characters"
                >Invalid digits</span>
                <UButton
                  :label="label('dec')"
                  :color="color('dec')"
                  :icon="icon('dec')"
                  size="xs"
                  variant="ghost"
                  :disabled="!decimalVal"
                  @click="handleCopy(decimalVal, 'dec')"
                />
              </div>
            </template>
            <UInput
              v-model="decimalVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              :color="hasInvalidDigits(decimalVal, 10) ? 'error' : undefined"
              @update:model-value="updateFrom(decimalVal, 10)"
            />
            <p
              v-if="groupingEnabled && decimalVal && !hasInvalidDigits(decimalVal, 10)"
              class="text-xs text-muted font-mono mt-1"
            >
              {{ displayValue(decimalVal, 10) }}
            </p>
          </UFormField>
        </div>

        <!-- Hexadecimal (Base 16) -->
        <div
          class="p-4 rounded-xl border bg-elevated/40 space-y-2"
          :class="hasInvalidDigits(hexVal, 16) ? 'border-error' : 'border-default'"
        >
          <UFormField label="Hexadecimal (Base 16)">
            <template #hint>
              <div class="flex items-center gap-2">
                <span
                  v-if="hasInvalidDigits(hexVal, 16)"
                  class="text-xs text-error font-semibold"
                  role="alert"
                  aria-label="Invalid hexadecimal characters"
                >Invalid digits</span>
                <UButton
                  :label="label('hex')"
                  :color="color('hex')"
                  :icon="icon('hex')"
                  size="xs"
                  variant="ghost"
                  :disabled="!hexVal"
                  @click="handleCopy(hexVal, 'hex')"
                />
              </div>
            </template>
            <UInput
              v-model="hexVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              :color="hasInvalidDigits(hexVal, 16) ? 'error' : undefined"
              @update:model-value="updateFrom(hexVal, 16)"
            />
            <p
              v-if="groupingEnabled && hexVal && !hasInvalidDigits(hexVal, 16)"
              class="text-xs text-muted font-mono mt-1"
            >
              {{ displayValue(hexVal, 16) }}
            </p>
          </UFormField>
        </div>

        <!-- Binary (Base 2) -->
        <div
          class="p-4 rounded-xl border bg-elevated/40 space-y-2"
          :class="hasInvalidDigits(binaryVal, 2) ? 'border-error' : 'border-default'"
        >
          <UFormField label="Binary (Base 2)">
            <template #hint>
              <div class="flex items-center gap-2">
                <span
                  v-if="hasInvalidDigits(binaryVal, 2)"
                  class="text-xs text-error font-semibold"
                  role="alert"
                  aria-label="Invalid binary characters"
                >Invalid digits</span>
                <UButton
                  :label="label('bin')"
                  :color="color('bin')"
                  :icon="icon('bin')"
                  size="xs"
                  variant="ghost"
                  :disabled="!binaryVal"
                  @click="handleCopy(binaryVal, 'bin')"
                />
              </div>
            </template>
            <UInput
              v-model="binaryVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              :color="hasInvalidDigits(binaryVal, 2) ? 'error' : undefined"
              @update:model-value="updateFrom(binaryVal, 2)"
            />
            <p
              v-if="groupingEnabled && binaryVal && !hasInvalidDigits(binaryVal, 2)"
              class="text-xs text-muted font-mono mt-1"
            >
              {{ displayValue(binaryVal, 2) }}
            </p>
          </UFormField>
        </div>

        <!-- Octal (Base 8) -->
        <div
          class="p-4 rounded-xl border bg-elevated/40 space-y-2"
          :class="hasInvalidDigits(octalVal, 8) ? 'border-error' : 'border-default'"
        >
          <UFormField label="Octal (Base 8)">
            <template #hint>
              <div class="flex items-center gap-2">
                <span
                  v-if="hasInvalidDigits(octalVal, 8)"
                  class="text-xs text-error font-semibold"
                  role="alert"
                  aria-label="Invalid octal characters"
                >Invalid digits</span>
                <UButton
                  :label="label('oct')"
                  :color="color('oct')"
                  :icon="icon('oct')"
                  size="xs"
                  variant="ghost"
                  :disabled="!octalVal"
                  @click="handleCopy(octalVal, 'oct')"
                />
              </div>
            </template>
            <UInput
              v-model="octalVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              :color="hasInvalidDigits(octalVal, 8) ? 'error' : undefined"
              @update:model-value="updateFrom(octalVal, 8)"
            />
            <p
              v-if="groupingEnabled && octalVal && !hasInvalidDigits(octalVal, 8)"
              class="text-xs text-muted font-mono mt-1"
            >
              {{ displayValue(octalVal, 8) }}
            </p>
          </UFormField>
        </div>
      </div>

      <!-- Two's Complement Display -->
      <div class="p-4 rounded-xl border border-default bg-elevated/40 space-y-3">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-semibold">Two's Complement</span>
          <div class="flex gap-1">
            <UButton
              v-for="item in twosWidthItems"
              :key="item.value"
              :label="item.label"
              size="xs"
              :color="twosWidth === item.value ? 'primary' : 'neutral'"
              :variant="twosWidth === item.value ? 'solid' : 'subtle'"
              @click="twosWidth = item.value as TwosComplementWidth"
            />
          </div>
        </div>
        <div class="font-mono text-sm">
          <span
            v-if="twosResult === null && decimalVal"
            class="text-error"
          >Value is out of range for {{ twosWidth }}-bit signed integer.</span>
          <span
            v-else-if="twosResult"
            class="text-primary font-semibold tracking-wide"
            :aria-label="`${twosWidth}-bit two's complement: ${twosResult}`"
          >{{ twosResult }}</span>
          <span
            v-else
            class="text-muted"
          >Enter a decimal value to see the two's complement.</span>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About Number Bases">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts a number between binary, octal, decimal, and hexadecimal. Change any field and the other fields update.
          </p>
          <p>
            <strong>Invalid character detection:</strong> Each input field shows an "Invalid digits" badge when you type a character that is not valid for that base. For example, entering <code>2</code> in the binary field or <code>G</code> in the hex field triggers the badge.
          </p>
          <p>
            <strong>Digit grouping:</strong> Enable the grouping toggle to see digits separated for readability. Binary groups in blocks of 4, decimal in blocks of 3, and hexadecimal in blocks of 2.
          </p>
          <p>
            <strong>Two's complement:</strong> Displays the signed two's complement hex representation of the decimal value. Select 8, 16, 32, or 64 bits. Values outside the signed range for the selected width show an out-of-range message. For example, -1 in 8-bit mode shows <code>FF</code>.
          </p>
          <p>
            <strong>Boundary:</strong> The tool uses BigInt, so a value larger than 2^53 stays exact. The two's complement panel only supports standard bit widths. It does not calculate IEEE 754 floating-point representations.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Chmod Calculator', to: '/hub/dev/chmod' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Unicode Inspector', to: '/hub/data/unicode' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
