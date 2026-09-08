<script setup lang="ts">
import { isOutOfSrgbGamut, toOklchString } from '#shared/utils/color/oklch'
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

const input = ref('#7c3aed')
const hex = ref('')
const rgb = ref('')
const hsl = ref('')
const oklch = ref('')
const outOfGamut = ref(false)
const { status, error, run, reset } = useTool<string>()

useToolSeo('color-converter')

async function convert() {
  await run(() => {
    const color = parseColor(input.value)
    hex.value = color.hex
    rgb.value = toRgbString(color.rgb)
    hsl.value = toHslString(color.hsl)
    oklch.value = toOklchString(color.oklch)
    outOfGamut.value = isOutOfSrgbGamut(color.oklch)
    return color.hex
  })
}

function handleClear() {
  input.value = ''
  hex.value = ''
  rgb.value = ''
  hsl.value = ''
  oklch.value = ''
  outOfGamut.value = false
  reset()
}

useToolShortcuts({
  onRun: () => convert(),
})

onMounted(() => {
  convert()
})
</script>

<template>
  <ToolPage>
    <div class="flex flex-wrap items-end gap-4">
      <UFormField
        label="Color"
        class="flex-1 min-w-48"
      >
        <UInput
          v-model="input"
          placeholder="#7c3aed, rgb(124 58 237), or oklch(53% 0.24 293)"
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
      <ToolResultRow
        v-for="item in [
          { label: 'HEX', value: hex },
          { label: 'RGB', value: rgb },
          { label: 'HSL', value: hsl },
          { label: 'OKLCH', value: oklch },
        ]"
        :key="item.label"
        :label="item.label"
        :value="item.value"
      />
    </div>

    <UAlert
      v-if="outOfGamut"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Outside the sRGB gamut"
      description="A standard screen cannot show this color. The HEX and the RGB values are the nearest match."
    />

    <template #docs>
      <ToolDocs title="About color conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts between HEX, RGB, HSL, and OKLCH color values.
          </p>
          <p>
            OKLCH is a perceptual color space. Two colors with the same L value look equally bright.
            CSS accepts the oklch() form, so you can paste the result into a stylesheet.
          </p>
          <p>
            Enter a color in any of the four forms. The tool shows the other three.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
            { label: 'Color Inspector', to: '/hub/color/inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
