<script setup lang="ts">
import type { ParsedColor } from '#shared/utils/color/types'
import { isOutOfP3Gamut, isOutOfSrgbGamut, toOklchString } from '#shared/utils/color/oklch'
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

const input = ref('#7c3aed')
const color = ref<ParsedColor | null>(null)
const { status, error, run, reset } = useTool<string>()

useToolSeo('color-converter')

const formats = computed(() => {
  if (!color.value) {
    return []
  }
  return [
    { label: 'HEX', value: color.value.hex },
    { label: 'RGB', value: toRgbString(color.value.rgb) },
    { label: 'HSL', value: toHslString(color.value.hsl) },
    { label: 'OKLCH', value: toOklchString(color.value.oklch) },
  ]
})

const channels = computed(() => {
  if (!color.value) {
    return []
  }
  const { rgb, hsl, oklch } = color.value
  return [
    { group: 'sRGB', items: [['R', rgb.r], ['G', rgb.g], ['B', rgb.b]] as const },
    {
      group: 'HSL',
      items: [
        ['H', `${Math.round(hsl.h)}°`],
        ['S', `${Math.round(hsl.s)}%`],
        ['L', `${Math.round(hsl.l)}%`],
      ] as const,
    },
    {
      group: 'OKLCH',
      items: [['L', `${oklch.l}%`], ['C', oklch.c], ['H', `${oklch.h}°`]] as const,
    },
  ]
})

const outOfSrgb = computed(() => (color.value ? isOutOfSrgbGamut(color.value.oklch) : false))
const outOfP3 = computed(() => (color.value ? isOutOfP3Gamut(color.value.oklch) : false))

async function convert() {
  await run(() => {
    const next = parseColor(input.value)
    color.value = next
    return next.hex
  })
}

function handleClear() {
  input.value = ''
  color.value = null
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
        :style="{ backgroundColor: color?.hex || 'transparent' }"
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
      v-if="color"
      class="space-y-6"
    >
      <div
        class="flex h-40 items-end rounded-md border border-default p-4"
        :style="{ backgroundColor: color.hex }"
      >
        <p class="rounded bg-default/80 px-2 py-1 font-mono text-sm text-highlighted">
          {{ color.hex }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge
          :color="outOfSrgb ? 'warning' : 'success'"
          variant="subtle"
        >
          sRGB: {{ outOfSrgb ? 'outside' : 'inside' }}
        </UBadge>
        <UBadge
          :color="outOfP3 ? 'warning' : 'success'"
          variant="subtle"
        >
          Display P3: {{ outOfP3 ? 'outside' : 'inside' }}
        </UBadge>
      </div>

      <UAlert
        v-if="outOfSrgb && !outOfP3"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Outside the sRGB gamut"
        description="A standard screen cannot show this color. A Display P3 screen can show it. The HEX and the RGB values are the nearest sRGB match."
      />
      <UAlert
        v-else-if="outOfP3"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Outside the sRGB and the Display P3 gamut"
        description="No common screen can show this color. The HEX and the RGB values are the nearest sRGB match."
      />

      <div class="space-y-3">
        <ToolResultRow
          v-for="item in formats"
          :key="item.label"
          :label="item.label"
          :value="item.value"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="group in channels"
          :key="group.group"
          class="rounded-md border border-default p-3"
        >
          <p class="font-mono text-xs font-medium text-muted uppercase">
            {{ group.group }}
          </p>
          <dl class="mt-2 space-y-1 font-mono text-sm">
            <div
              v-for="[name, value] in group.items"
              :key="name"
              class="flex justify-between gap-3"
            >
              <dt class="text-muted">
                {{ name }}
              </dt>
              <dd class="text-highlighted">
                {{ value }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About color conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts between HEX, RGB, HSL, and OKLCH color values. It also shows a large
            swatch, the channel values of each space, and a copy action for each format.
          </p>
          <p>
            OKLCH is a perceptual color space. Two colors with the same L value look equally bright.
            CSS accepts the oklch() form, so you can paste the result into a stylesheet.
          </p>
          <p>
            OKLCH holds colors that a screen cannot show. The gamut badges tell you if the color fits
            in sRGB, which every screen shows, and in Display P3, which a wide-gamut screen shows.
            The HEX and the RGB values are always the nearest sRGB match.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
