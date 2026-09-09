<script setup lang="ts">
import { detectSecurityChars, getEscapeFormats, groupGraphemes, inspectUnicode, removeInvisibleChars } from '#shared/utils/data/unicode'

useToolSeo('unicode')

const input = ref('Hello 👋 World! \u200B\u00E9')
const { copy } = useCopyFeedback()
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const sampleText = 'Code 🚀 & Data — café \u200B\uFEFF'

type ViewMode = 'code-points' | 'graphemes' | 'escapes'
const viewMode = ref<ViewMode>('code-points')

const analysis = computed(() => inspectUnicode(input.value))
const graphemes = computed(() => groupGraphemes(input.value))
const securityDiags = computed(() => detectSecurityChars(input.value))
const cleanText = computed(() => removeInvisibleChars(input.value))
const hasInvisible = computed(() => cleanText.value !== input.value)

useLiveTool(analysis)

// Virtual list for code-points view (handles 20k chars smoothly)
const { list: virtualChars, containerProps, wrapperProps } = useVirtualList(
  computed(() => analysis.value.chars),
  { itemHeight: 40 },
)

function handleLoadSample() {
  input.value = sampleText
}

function handleClear() {
  input.value = ''
}

function copyText(val: string) {
  copy(val)
}

function handleCopyClean() {
  copy(cleanText.value)
}

/**
 * Highlight the character at the given code-point index in the textarea.
 * DATA-50: clicking a row selects the corresponding input character.
 */
function highlightChar(charIndex: number) {
  if (!textareaRef.value) {
    return
  }
  // charIndex maps to the code-point array; find the UTF-16 offset
  let utf16Start = 0
  for (let i = 0; i < charIndex && i < analysis.value.chars.length; i++) {
    utf16Start += analysis.value.chars[i]!.char.length
  }
  const ch = analysis.value.chars[charIndex]
  if (!ch) {
    return
  }
  const utf16End = utf16Start + ch.char.length
  textareaRef.value.focus()
  textareaRef.value.setSelectionRange(utf16Start, utf16End)
}
</script>

<template>
  <ToolPage>
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
      <UFormField label="Input Text">
        <UTextarea
          ref="textareaRef"
          v-model="input"
          :rows="4"
          placeholder="Paste or type text to inspect Unicode characters..."
          class="w-full font-mono text-sm"
        />
      </UFormField>

      <!-- Security Warnings (DATA-53) -->
      <div
        v-if="securityDiags.length"
        class="rounded-xl border border-error/40 bg-error/5 p-3 space-y-2"
        role="alert"
        aria-label="Security character warnings"
      >
        <p class="text-xs font-semibold text-error uppercase tracking-wide">
          Security warning — {{ securityDiags.length }} issue{{ securityDiags.length === 1 ? '' : 's' }} detected
        </p>
        <ul class="space-y-1">
          <li
            v-for="d in securityDiags"
            :key="d.hex + d.kind"
            class="text-xs font-mono text-warning"
          >
            {{ d.description }}
          </li>
        </ul>
      </div>

      <!-- Hidden Character Warning -->
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

      <!-- Clean Preview (DATA-52) -->
      <div
        v-if="hasInvisible"
        class="p-4 rounded-xl border border-default bg-elevated/40 space-y-2"
      >
        <p class="text-xs font-semibold text-muted uppercase tracking-wide">
          Clean preview — invisible characters removed
        </p>
        <p class="font-mono text-sm break-all">
          {{ cleanText }}
        </p>
        <UButton
          label="Copy clean text"
          icon="i-lucide-clipboard"
          size="xs"
          color="neutral"
          variant="subtle"
          aria-label="Copy clean text with invisible characters removed"
          @click="handleCopyClean"
        />
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Code Points"
          :value="analysis.totalCodePoints"
        />
        <StatCard
          label="Graphemes"
          :value="graphemes.length"
        />
        <StatCard
          label="Zero-Width Marks"
          :value="analysis.hasZeroWidth ? 'Found' : 'None'"
          :color="analysis.hasZeroWidth ? 'warning' : 'success'"
        />
        <StatCard
          label="Normalization (NFC)"
          :value="analysis.normalization.isNfc ? 'Yes' : 'No'"
        />
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
              aria-label="Copy NFC form"
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
              aria-label="Copy NFD form"
              @click="copyText(analysis.normalization.nfd)"
            />
          </div>
        </div>
      </div>

      <!-- View Mode Tabs -->
      <div class="flex items-center gap-1 p-1 rounded-lg border border-default bg-elevated/40 w-fit">
        <UButton
          size="xs"
          :variant="viewMode === 'code-points' ? 'solid' : 'ghost'"
          color="neutral"
          label="Code Points"
          @click="viewMode = 'code-points'"
        />
        <UButton
          size="xs"
          :variant="viewMode === 'graphemes' ? 'solid' : 'ghost'"
          color="neutral"
          label="Graphemes"
          @click="viewMode = 'graphemes'"
        />
        <UButton
          size="xs"
          :variant="viewMode === 'escapes' ? 'solid' : 'ghost'"
          color="neutral"
          label="Escape Codes"
          @click="viewMode = 'escapes'"
        />
      </div>

      <!-- Code Points View (virtualized, DATA-54) -->
      <div
        v-if="viewMode === 'code-points'"
        class="border border-default rounded-xl overflow-hidden"
      >
        <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
          Character Breakdown ({{ analysis.chars.length }})
        </div>
        <div
          v-bind="containerProps"
          class="max-h-96 overflow-y-auto"
        >
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
            <tbody
              v-bind="wrapperProps"
              class="divide-y divide-default font-mono"
            >
              <tr
                v-for="{ data: item, index } in virtualChars"
                :key="index"
                class="hover:bg-elevated/30 transition-colors cursor-pointer"
                :class="{ 'bg-warning/10': item.isZeroWidth }"
                :aria-label="`Character ${item.hex} — click to highlight in input`"
                @click="highlightChar(index)"
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
                    :aria-label="`Copy code point ${item.hex}`"
                    @click.stop="copyText(item.hex)"
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

      <!-- Grapheme Clusters View (DATA-51) -->
      <div
        v-if="viewMode === 'graphemes'"
        class="border border-default rounded-xl overflow-hidden"
      >
        <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
          Grapheme Clusters ({{ graphemes.length }})
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-elevated/60 sticky top-0 border-b border-default text-muted">
              <tr>
                <th class="p-2.5 font-medium">
                  Grapheme
                </th>
                <th class="p-2.5 font-medium">
                  Code Points
                </th>
                <th class="p-2.5 font-medium">
                  Multi?
                </th>
                <th class="p-2.5 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default font-mono">
              <tr
                v-for="(g, idx) in graphemes"
                :key="idx"
                class="hover:bg-elevated/30 transition-colors"
              >
                <td class="p-2.5 font-sans text-base">
                  {{ g.grapheme }}
                </td>
                <td class="p-2.5 text-muted">
                  {{ g.codePoints.map(cp => cp.hex).join(', ') }}
                </td>
                <td class="p-2.5">
                  <UBadge
                    v-if="g.isMultiCodePoint"
                    color="warning"
                    variant="subtle"
                    size="xs"
                    label="ZWJ sequence"
                  />
                  <span
                    v-else
                    class="text-muted"
                  >—</span>
                </td>
                <td class="p-2.5 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    :aria-label="`Copy grapheme ${g.grapheme}`"
                    @click="copyText(g.grapheme)"
                  />
                </td>
              </tr>
              <tr v-if="graphemes.length === 0">
                <td
                  colspan="4"
                  class="p-6 text-center text-muted font-sans"
                >
                  No text to inspect.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Escape Codes View (DATA-54) -->
      <div
        v-if="viewMode === 'escapes'"
        class="border border-default rounded-xl overflow-hidden"
      >
        <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
          Escape Sequences ({{ analysis.chars.length }} code points)
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-elevated/60 sticky top-0 border-b border-default text-muted">
              <tr>
                <th class="p-2.5 font-medium">
                  Char
                </th>
                <th class="p-2.5 font-medium">
                  JS \\u
                </th>
                <th class="p-2.5 font-medium">
                  JS \\u{}
                </th>
                <th class="p-2.5 font-medium">
                  HTML Entity
                </th>
                <th class="p-2.5 font-medium">
                  CSS
                </th>
                <th class="p-2.5 font-medium">
                  Python
                </th>
                <th class="p-2.5 font-medium">
                  URL %enc
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default font-mono">
              <tr
                v-for="(item, idx) in analysis.chars"
                :key="idx"
                class="hover:bg-elevated/30 transition-colors"
              >
                <td class="p-2.5 font-sans font-bold text-base">
                  {{ item.displayChar }}
                </td>
                <td class="p-2.5">
                  <span class="text-primary">{{ getEscapeFormats(item.char).jsUnicode }}</span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    class="ml-1"
                    :aria-label="`Copy JS \\u escape for ${item.hex}`"
                    @click="copyText(getEscapeFormats(item.char).jsUnicode)"
                  />
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ getEscapeFormats(item.char).jsCodePoint }}</span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    class="ml-1"
                    :aria-label="`Copy JS \\u{} escape for ${item.hex}`"
                    @click="copyText(getEscapeFormats(item.char).jsCodePoint)"
                  />
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ getEscapeFormats(item.char).htmlEntity }}</span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    class="ml-1"
                    :aria-label="`Copy HTML entity for ${item.hex}`"
                    @click="copyText(getEscapeFormats(item.char).htmlEntity)"
                  />
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ getEscapeFormats(item.char).css }}</span>
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ getEscapeFormats(item.char).python }}</span>
                </td>
                <td class="p-2.5">
                  <span class="text-muted">{{ getEscapeFormats(item.char).url }}</span>
                </td>
              </tr>
              <tr v-if="analysis.chars.length === 0">
                <td
                  colspan="7"
                  class="p-6 text-center text-muted font-sans"
                >
                  No text to inspect.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About Unicode">
        <div class="space-y-4 text-muted">
          <p>
            This tool shows each code point of a text with its category, decimal value, UTF-8 bytes, and UTF-16 code units. Use it when a character does not show correctly, or when a string comparison fails.
          </p>
          <p>
            <strong>Code points vs graphemes:</strong>
            A code point is a Unicode scalar value. A grapheme is a user-perceived character. A family emoji is one grapheme but many code points joined by Zero-Width Joiner (ZWJ). The Graphemes view groups these sequences into one row.
          </p>
          <p>
            <strong>Source highlighting:</strong>
            Click any row in the Code Points view to select and highlight the corresponding character in the input box. The selection stays while you move between rows.
          </p>
          <p>
            <strong>Clean preview:</strong>
            When the text contains invisible characters, the tool shows a clean copy with those marks removed. The original input stays completely unchanged until you decide to copy the clean version.
          </p>
          <p>
            <strong>Security warnings:</strong>
            The tool flags bidirectional control characters (U+202A–U+202E, U+2066–U+2069), soft hyphens, variation selectors, tag characters, and mixed Latin/Cyrillic homoglyphs. These characters can hide content or confuse text comparison. The tool only warns — it never blocks copying.
          </p>
          <p>
            <strong>Escape codes:</strong>
            The Escape Codes view shows each character as JavaScript <code>\uXXXX</code> and <code>\u{XXXXXX}</code>, HTML entity, CSS escape, Python escape, and URL percent-encoding.
          </p>
          <p>
            A zero-width character has no width on screen but is present in the data. It comes from a copy out of a web page or a document, and it breaks a search, a login, and a key comparison. The tool marks each one.
          </p>
          <p>
            Normalization makes two texts that look the same become the same data. NFC composes an accent into one code point. NFD separates it. Compare the forms before you store a name or a user identifier.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Statistics', to: '/hub/data/text-stats' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Text Diff', to: '/hub/data/text-diff' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
