<script setup lang="ts">
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

const input = ref('#7c3aed')
const hex = ref('')
const rgb = ref('')
const hsl = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('color-converter')

async function convert() {
  await run(() => {
    const color = parseColor(input.value)
    hex.value = color.hex
    rgb.value = toRgbString(color.rgb)
    hsl.value = toHslString(color.hsl)
    return color.hex
  })
}

async function copyValue(value: string, key: string) {
  await copy(value, key)
}

function handleClear() {
  input.value = ''
  hex.value = ''
  rgb.value = ''
  hsl.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      convert()
    }
  }
})

onMounted(() => {
  convert()
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Color Converter"
        description="Convert colors between formats."
      />
    </template>

    <div class="flex flex-wrap items-end gap-4">
      <UFormField
        label="Color"
        class="flex-1 min-w-48"
      >
        <UInput
          v-model="input"
          placeholder="#7c3aed"
        />
      </UFormField>
      <div
        class="size-12 rounded-md border border-default"
        :style="{ backgroundColor: hex || 'transparent' }"
      />
    </div>

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-palette"
        :loading="status === 'processing'"
        @click="convert"
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

    <div
      v-if="status === 'success'"
      class="space-y-3"
    >
      <div
        v-for="item in [
          { label: 'HEX', value: hex },
          { label: 'RGB', value: rgb },
          { label: 'HSL', value: hsl }
        ]"
        :key="item.label"
        class="flex items-center justify-between gap-3 font-mono text-sm"
      >
        <span class="text-muted w-12">{{ item.label }}</span>
        <span class="flex-1 text-highlighted">{{ item.value }}</span>
        <UButton
          size="xs"
          variant="ghost"
          :icon="copyIcon(item.label.toLowerCase())"
          :color="copyColor(item.label.toLowerCase())"
          :aria-label="`Copy ${item.label}`"
          @click="copyValue(item.value, item.label.toLowerCase())"
        />
      </div>
    </div>

    <template #docs>
      <DataToolDocs title="About color conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts between HEX, RGB, and HSL color values.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
            { label: 'Color Inspector', to: '/hub/color/inspector' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
