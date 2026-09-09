<script setup lang="ts">
import type { CssUnit } from '#shared/utils/dev/css-units'
import { convertAllCssUnits, convertPxSnippetToRem, formatCssNumber } from '#shared/utils/dev/css-units'

const inputValue = ref(16)
const sourceUnit = ref<CssUnit>('px')
const rootFontSize = ref(16)
const parentFontSize = ref(16)
const viewportWidth = ref(1920)
const viewportHeight = ref(1080)
const snippet = ref('')

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('css-units')

const unitOptions = [
  { label: 'px (Pixels)', value: 'px' },
  { label: 'rem (Root EM)', value: 'rem' },
  { label: 'em (Element EM)', value: 'em' },
  { label: 'vw (Viewport Width %)', value: 'vw' },
  { label: 'vh (Viewport Height %)', value: 'vh' },
]

const safeRootFontSize = computed(() => Number(rootFontSize.value) || 16)

const conversions = computed(() => {
  const results = convertAllCssUnits(Number(inputValue.value) || 0, sourceUnit.value, {
    rootFontSize: safeRootFontSize.value,
    parentFontSize: Number(parentFontSize.value) || safeRootFontSize.value,
    viewportWidth: Number(viewportWidth.value) || 1920,
    viewportHeight: Number(viewportHeight.value) || 1080,
  })

  return [
    { label: 'Pixels (px)', unit: 'px', value: `${formatCssNumber(results.px)}px`, raw: results.px },
    { label: 'Root EM (rem)', unit: 'rem', value: `${formatCssNumber(results.rem)}rem`, raw: results.rem },
    { label: 'Element EM (em)', unit: 'em', value: `${formatCssNumber(results.em)}em`, raw: results.em },
    { label: 'Viewport Width (vw)', unit: 'vw', value: `${formatCssNumber(results.vw)}vw`, raw: results.vw },
    { label: 'Viewport Height (vh)', unit: 'vh', value: `${formatCssNumber(results.vh)}vh`, raw: results.vh },
  ]
})

const convertedSnippet = computed(() => convertPxSnippetToRem(snippet.value, safeRootFontSize.value))

useLiveTool(computed(() => ({ conversions: conversions.value, snippet: convertedSnippet.value })))

function handleReset() {
  inputValue.value = 16
  sourceUnit.value = 'px'
  rootFontSize.value = 16
  parentFontSize.value = 16
  viewportWidth.value = 1920
  viewportHeight.value = 1080
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Value">
        <UInput
          v-model.number="inputValue"
          type="number"
          step="any"
          class="w-full font-mono"
        />
      </UFormField>

      <UFormField label="Source Unit">
        <USelect
          v-model="sourceUnit"
          :items="unitOptions"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-[12px] border border-default bg-elevated/50 p-4">
      <UFormField
        label="Root Font Size (px)"
        description="Base 1rem font size."
      >
        <UInput
          v-model.number="rootFontSize"
          type="number"
          :min="1"
          class="w-full font-mono"
        />
      </UFormField>

      <UFormField
        label="Parent Font Size (px)"
        description="Base 1em font size."
      >
        <UInput
          v-model.number="parentFontSize"
          type="number"
          :min="1"
          class="w-full font-mono"
        />
      </UFormField>

      <UFormField
        label="Viewport Width (px)"
        description="Reference for 100vw."
      >
        <UInput
          v-model.number="viewportWidth"
          type="number"
          :min="1"
          class="w-full font-mono"
        />
      </UFormField>

      <UFormField
        label="Viewport Height (px)"
        description="Reference for 100vh."
      >
        <UInput
          v-model.number="viewportHeight"
          type="number"
          :min="1"
          class="w-full font-mono"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Reset Defaults"
        color="neutral"
        variant="ghost"
        icon="i-lucide-rotate-ccw"
        @click="handleReset"
      />
    </ToolActions>

    <div class="space-y-3">
      <ToolResultRow
        v-for="item in conversions"
        :key="item.unit"
        :label="item.label"
        :value="item.value"
        :active="item.unit === sourceUnit"
      />
    </div>

    <div class="space-y-4 rounded-[12px] border border-default p-4">
      <h2 class="text-sm font-medium text-highlighted">
        Snippet converter
      </h2>
      <p class="text-sm text-muted">
        Paste CSS to change each px length to rem. A 0px length becomes 0. A 1px length stays.
      </p>

      <LazyToolEditor
        v-model="snippet"
        hydrate-on-idle
        label="CSS Snippet"
        lang="css"
        :rows="8"
        placeholder="Paste CSS here"
      />

      <LazyToolEditor
        :model-value="convertedSnippet"
        hydrate-on-idle
        label="Converted CSS"
        lang="css"
        :rows="8"
        readonly
      />

      <ToolActions>
        <UButton
          :label="copyLabel('snippet', 'Copy CSS')"
          :color="copyColor('snippet')"
          variant="subtle"
          :icon="copyIcon('snippet')"
          :disabled="!convertedSnippet"
          @click="copy(convertedSnippet, 'snippet', 'snippet')"
        />
        <UButton
          label="Clear Snippet"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eraser"
          :disabled="!snippet"
          @click="snippet = ''"
        />
      </ToolActions>
    </div>

    <template #docs>
      <ToolDocs title="About CSS Units">
        <div class="space-y-4 text-muted">
          <p>
            Pixels (px) give an absolute length on a screen.
          </p>
          <p>
            Root EM (rem) is relative to the font size of the HTML root element. The tool starts at
            16 px, which is the default root font size of a browser.
          </p>
          <p>
            Element EM (em) is relative to the font size of the parent element. The Parent Font Size
            field sets that value. Change it to a value other than the root font size, and the em
            result differs from the rem result.
          </p>
          <p>
            Viewport Width (vw) and Viewport Height (vh) are relative to the viewport. The tool does
            not read your browser window. It uses the Viewport Width and Viewport Height fields, and
            they start at 1920 px and 1080 px. Change the fields to match your target screen.
          </p>
          <p>
            The snippet converter changes each px length to rem with the Root Font Size value. A 0px
            length becomes 0, because a zero length needs no unit. A 1px length stays, because a
            hairline border in rem can blur or disappear. A px value in a comment, a string, or a
            <code>url()</code> stays.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
