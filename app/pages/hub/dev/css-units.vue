<script setup lang="ts">
import {
  convertAllCssUnits,
  type CssUnit
} from '~~/shared/utils/dev/css-units'

const inputValue = ref(16)
const sourceUnit = ref<CssUnit>('px')
const rootFontSize = ref(16)
const viewportWidth = ref(1920)
const viewportHeight = ref(1080)

const toast = useToast()
const { copy } = useClipboard({ legacy: true })

useToolSeo('css-units')

const unitOptions = [
  { label: 'px (Pixels)', value: 'px' },
  { label: 'rem (Root EM)', value: 'rem' },
  { label: 'em (Element EM)', value: 'em' },
  { label: 'vw (Viewport Width %)', value: 'vw' },
  { label: 'vh (Viewport Height %)', value: 'vh' }
]

function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toString()
  }
  return Number(num.toFixed(4)).toString()
}

const conversions = computed(() => {
  const results = convertAllCssUnits(Number(inputValue.value) || 0, sourceUnit.value, {
    rootFontSize: Number(rootFontSize.value) || 16,
    viewportWidth: Number(viewportWidth.value) || 1920,
    viewportHeight: Number(viewportHeight.value) || 1080
  })

  return [
    { label: 'Pixels (px)', unit: 'px', value: `${formatNumber(results.px)}px`, raw: results.px },
    { label: 'Root EM (rem)', unit: 'rem', value: `${formatNumber(results.rem)}rem`, raw: results.rem },
    { label: 'Element EM (em)', unit: 'em', value: `${formatNumber(results.em)}em`, raw: results.em },
    { label: 'Viewport Width (vw)', unit: 'vw', value: `${formatNumber(results.vw)}vw`, raw: results.vw },
    { label: 'Viewport Height (vh)', unit: 'vh', value: `${formatNumber(results.vh)}vh`, raw: results.vh }
  ]
})

async function handleCopy(val: string, label: string) {
  await copy(val)
  toast.add({
    title: `Copied ${label}`,
    color: 'success'
  })
}

function handleReset() {
  inputValue.value = 16
  sourceUnit.value = 'px'
  rootFontSize.value = 16
  viewportWidth.value = 1920
  viewportHeight.value = 1080
}
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="CSS Unit Converter"
        description="Convert values between px, rem, em, vw, and vh units."
      />
    </template>

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

    <div class="grid gap-4 sm:grid-cols-3 rounded-[12px] border border-default bg-elevated/50 p-4">
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
      <div
        v-for="item in conversions"
        :key="item.unit"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-default bg-elevated p-4"
        :class="{ 'ring-1 ring-primary/40': item.unit === sourceUnit }"
      >
        <div class="min-w-0 flex-1">
          <p class="font-mono text-xs font-medium text-muted uppercase">
            {{ item.label }}
          </p>
          <p class="mt-1 font-mono text-base font-semibold text-highlighted">
            {{ item.value }}
          </p>
        </div>
        <UButton
          label="Copy"
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-copy"
          @click="handleCopy(item.value, item.label)"
        />
      </div>
    </div>

    <template #docs>
      <DataToolDocs title="About CSS Units">
        <div class="space-y-4 text-muted">
          <p>
            Pixels (px) provide absolute lengths on screens.
          </p>
          <p>
            Root EM (rem) scales relative to the HTML root font size. It improves accessibility.
          </p>
          <p>
            Viewport Width (vw) and Viewport Height (vh) calculate lengths relative to browser window dimensions.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
