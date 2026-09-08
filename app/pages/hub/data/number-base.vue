<script setup lang="ts">
import type { NumberBase } from '#shared/utils/data/number-base'
import { convertFromBase } from '#shared/utils/data/number-base'

useToolSeo('number-base')

const decimalVal = ref('255')
const hexVal = ref('FF')
const binaryVal = ref('11111111')
const octalVal = ref('377')
const error = ref<string | null>(null)

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

      <!-- Base Inputs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Decimal (Base 10) -->
        <div class="p-4 rounded-xl border border-default bg-elevated/40 space-y-2">
          <UFormField label="Decimal (Base 10)">
            <template #hint>
              <UButton
                :label="label('dec')"
                :color="color('dec')"
                :icon="icon('dec')"
                size="xs"
                variant="ghost"
                :disabled="!decimalVal"
                @click="handleCopy(decimalVal, 'dec')"
              />
            </template>
            <UInput
              v-model="decimalVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              @update:model-value="updateFrom(decimalVal, 10)"
            />
          </UFormField>
        </div>

        <!-- Hexadecimal (Base 16) -->
        <div class="p-4 rounded-xl border border-default bg-elevated/40 space-y-2">
          <UFormField label="Hexadecimal (Base 16)">
            <template #hint>
              <UButton
                :label="label('hex')"
                :color="color('hex')"
                :icon="icon('hex')"
                size="xs"
                variant="ghost"
                :disabled="!hexVal"
                @click="handleCopy(hexVal, 'hex')"
              />
            </template>
            <UInput
              v-model="hexVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              @update:model-value="updateFrom(hexVal, 16)"
            />
          </UFormField>
        </div>

        <!-- Binary (Base 2) -->
        <div class="p-4 rounded-xl border border-default bg-elevated/40 space-y-2">
          <UFormField label="Binary (Base 2)">
            <template #hint>
              <UButton
                :label="label('bin')"
                :color="color('bin')"
                :icon="icon('bin')"
                size="xs"
                variant="ghost"
                :disabled="!binaryVal"
                @click="handleCopy(binaryVal, 'bin')"
              />
            </template>
            <UInput
              v-model="binaryVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              @update:model-value="updateFrom(binaryVal, 2)"
            />
          </UFormField>
        </div>

        <!-- Octal (Base 8) -->
        <div class="p-4 rounded-xl border border-default bg-elevated/40 space-y-2">
          <UFormField label="Octal (Base 8)">
            <template #hint>
              <UButton
                :label="label('oct')"
                :color="color('oct')"
                :icon="icon('oct')"
                size="xs"
                variant="ghost"
                :disabled="!octalVal"
                @click="handleCopy(octalVal, 'oct')"
              />
            </template>
            <UInput
              v-model="octalVal"
              placeholder="0"
              size="lg"
              class="font-mono text-sm"
              @update:model-value="updateFrom(octalVal, 8)"
            />
          </UFormField>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About number bases">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts a number between binary, octal, decimal, and hexadecimal. Change any field and the other fields update.
          </p>
          <p>
            The tool uses BigInt, so a value larger than 2^53 stays exact. A 64-bit identifier or a large bit mask does not lose a digit.
          </p>
          <p>
            Binary shows the bits of a flag or a permission. Hexadecimal is shorter, and it maps four bits to one digit, so it suits a color value, a byte dump, or a memory address.
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
