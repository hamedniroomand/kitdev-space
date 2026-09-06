<script setup lang="ts">
import { inspectUnicode } from '#shared/utils/data/unicode'

const input = ref('Hello 👋 World! \u200B\u00E9')
const { copy } = useCopyFeedback()

const sampleText = 'Code 🚀 & Data — café \u200B\uFEFF'

const analysis = computed(() => inspectUnicode(input.value))

function handleLoadSample() {
  input.value = sampleText
}

function handleClear() {
  input.value = ''
}

function copyText(val: string) {
  copy(val)
}

useSeoMeta({
  title: 'Unicode Inspector — KitDev Space',
  description: 'Inspect Unicode code points, UTF-8 bytes, normalization forms, and hidden characters.'
})
</script>

<template>
  <ToolPage
    title="Unicode Inspector"
    description="Inspect Unicode characters, code points, byte encodings, and hidden zero-width marks."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-text"
            label="Load Sample"
            @click="handleLoadSample"
          />
        </div>

        <div class="flex items-center gap-2">
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

      <!-- Input Area -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-default">
          Input Text
        </label>
        <UTextarea
          v-model="input"
          :rows="4"
          placeholder="Paste or type text to inspect Unicode characters..."
          class="w-full font-mono text-sm"
        />
      </div>

      <!-- Warning Alerts for Hidden / Zero-width characters -->
      <div
        v-if="analysis.hasZeroWidth"
        class="space-y-2"
      >
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Hidden Characters Detected"
          description="This text contains zero-width or hidden characters. These marks are invisible in standard editors."
        />
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 border border-default rounded-xl bg-elevated/40 text-center">
          <div class="text-xs text-muted">
            Code Points
          </div>
          <div class="text-xl font-bold font-mono mt-1">
            {{ analysis.totalCodePoints }}
          </div>
        </div>
        <div class="p-3 border border-default rounded-xl bg-elevated/40 text-center">
          <div class="text-xs text-muted">
            UTF-16 Length
          </div>
          <div class="text-xl font-bold font-mono mt-1">
            {{ analysis.totalChars }}
          </div>
        </div>
        <div class="p-3 border border-default rounded-xl bg-elevated/40 text-center">
          <div class="text-xs text-muted">
            Zero-Width Marks
          </div>
          <div
            class="text-xl font-bold font-mono mt-1"
            :class="analysis.hasZeroWidth ? 'text-warning' : 'text-success'"
          >
            {{ analysis.hasZeroWidth ? 'Found' : 'None' }}
          </div>
        </div>
        <div class="p-3 border border-default rounded-xl bg-elevated/40 text-center">
          <div class="text-xs text-muted">
            Normalization (NFC)
          </div>
          <div class="text-xl font-bold font-mono mt-1">
            {{ analysis.normalization.isNfc ? 'Yes' : 'No' }}
          </div>
        </div>
      </div>

      <!-- Normalization Overview -->
      <div class="p-4 border border-default rounded-xl bg-elevated/20 space-y-3">
        <h3 class="text-sm font-semibold text-default">
          Unicode Normalization Forms
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="flex items-center justify-between p-2 rounded-lg bg-default border border-default">
            <div>
              <span class="font-bold">NFC:</span>
              <span class="ml-2 font-mono">{{ analysis.normalization.nfc }}</span>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-copy"
              @click="copyText(analysis.normalization.nfc)"
            />
          </div>
          <div class="flex items-center justify-between p-2 rounded-lg bg-default border border-default">
            <div>
              <span class="font-bold">NFD:</span>
              <span class="ml-2 font-mono">{{ analysis.normalization.nfd }}</span>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-copy"
              @click="copyText(analysis.normalization.nfd)"
            />
          </div>
        </div>
      </div>

      <!-- Character Breakdown Table -->
      <div class="border border-default rounded-xl overflow-hidden">
        <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
          Character Breakdown ({{ analysis.chars.length }})
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-elevated/60 sticky top-0 border-b border-default text-muted">
              <tr>
                <th class="p-2.5 font-medium">
                  Char
                </th>
                <th class="p-2.5 font-medium">
                  Code Point
                </th>
                <th class="p-2.5 font-medium">
                  Decimal
                </th>
                <th class="p-2.5 font-medium">
                  Category
                </th>
                <th class="p-2.5 font-medium">
                  UTF-8 (Hex)
                </th>
                <th class="p-2.5 font-medium">
                  UTF-16
                </th>
                <th class="p-2.5 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default font-mono">
              <tr
                v-for="(item, idx) in analysis.chars"
                :key="idx"
                class="hover:bg-elevated/30 transition-colors"
                :class="{ 'bg-warning/10': item.isZeroWidth }"
              >
                <td class="p-2.5 font-sans font-bold text-base">
                  <span
                    v-if="item.isZeroWidth || item.isControl"
                    class="px-1.5 py-0.5 rounded text-xs font-mono font-normal bg-warning/20 text-warning"
                  >
                    {{ item.displayChar }}
                  </span>
                  <span v-else>
                    {{ item.displayChar }}
                  </span>
                </td>
                <td class="p-2.5 text-primary">
                  {{ item.hex }}
                </td>
                <td class="p-2.5 text-muted">
                  {{ item.codePoint }}
                </td>
                <td class="p-2.5 font-sans">
                  {{ item.category }}
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ item.utf8Bytes.join(' ') }}</span>
                </td>
                <td class="p-2.5 text-muted">
                  {{ item.utf16Hex.join(' ') }}
                </td>
                <td class="p-2.5 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copyText(item.hex)"
                  />
                </td>
              </tr>
              <tr v-if="analysis.chars.length === 0">
                <td
                  colspan="7"
                  class="p-6 text-center text-muted font-sans"
                >
                  No text to inspect. Enter text above to see character details.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
