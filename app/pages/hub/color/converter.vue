<script setup lang="ts">
import { isOutOfP3Gamut, isOutOfSrgbGamut, roundTo, toOklchString } from '#shared/utils/color/oklch'
import { parseColor, rgbToHex, toHslString, toRgbString } from '#shared/utils/color/parse'

const input = ref('#7c3aed')
const precision = ref(2)

const precisionItems = [0, 1, 2, 3, 4].map(value => ({ label: String(value), value }))

useToolSeo('color-converter')

const conversion = computed(() => {
  if (!input.value.trim()) {
    return { data: null, error: null }
  }
  try {
    return { data: parseColor(input.value), error: null }
  }
  catch (cause) {
    return { data: null, error: cause instanceof Error ? cause.message : 'Invalid color.' }
  }
})

useLiveTool(conversion, { option: () => `precision-${precision.value}` })

const color = computed(() => conversion.value.data)
const error = computed(() => conversion.value.error)

const formats = computed(() => {
  if (!color.value) {
    return []
  }
  return [
    { label: 'HEX', value: color.value.hex },
    { label: 'RGB', value: toRgbString(color.value.rgb) },
    { label: 'HSL', value: toHslString(color.value.hsl, precision.value) },
    { label: 'OKLCH', value: toOklchString(color.value.oklch, precision.value) },
  ]
})

interface ChannelGroup {
  group: string
  items: [string, string | number][]
}

const channels = computed<ChannelGroup[]>(() => {
  if (!color.value) {
    return []
  }
  const { rgb, hsl, oklch, alpha } = color.value
  const srgb: [string, string | number][] = [['R', rgb.r], ['G', rgb.g], ['B', rgb.b]]
  if (alpha !== undefined) {
    srgb.push(['A', alpha])
  }
  return [
    { group: 'sRGB', items: srgb },
    {
      group: 'HSL',
      items: [
        ['H', `${roundTo(hsl.h, precision.value)}°`],
        ['S', `${roundTo(hsl.s, precision.value)}%`],
        ['L', `${roundTo(hsl.l, precision.value)}%`],
      ],
    },
    {
      group: 'OKLCH',
      items: [
        ['L', `${roundTo(oklch.l, precision.value)}%`],
        ['C', roundTo(oklch.c, precision.value)],
        ['H', `${roundTo(oklch.h, precision.value)}°`],
      ],
    },
  ]
})

const outOfSrgb = computed(() => (color.value ? isOutOfSrgbGamut(color.value.oklch) : false))
const outOfP3 = computed(() => (color.value ? isOutOfP3Gamut(color.value.oklch) : false))

/** The native picker holds an opaque 6-digit hex, so the alpha value stays in the text input. */
const pickerHex = computed(() => {
  if (!color.value) {
    return '#000000'
  }
  const { r, g, b } = color.value.rgb
  return rgbToHex({ r, g, b })
})

function handlePick(event: Event) {
  const picked = (event.target as HTMLInputElement).value
  const alpha = color.value?.alpha
  input.value = alpha === undefined ? picked : rgbToHex({ ...parseColor(picked).rgb, a: alpha })
}

function handleClear() {
  input.value = ''
}
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
      <input
        :value="pickerHex"
        type="color"
        class="size-12 cursor-pointer rounded-md border border-default bg-transparent p-1"
        aria-label="Color picker"
        @input="handlePick"
      >
    </div>

    <ToolActions>
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

      <UFormField
        label="Decimals"
        help="Sets the decimal places of the HSL and the OKLCH values."
        class="w-24"
      >
        <USelect
          v-model="precision"
          :items="precisionItems"
        />
      </UFormField>

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
            swatch, the channel values of each space, and a copy action for each format. Type a
            color or drag the color picker. Each output changes immediately.
          </p>
          <p>
            Each output format keeps the alpha value. An 8-digit hex holds it, and the rgb(), hsl(),
            and oklch() forms hold it after a slash. No output format of this tool discards alpha.
            The color picker sets only the R, G, and B channels, and it keeps the current alpha
            value.
          </p>
          <p>
            The Decimals control sets the decimal places of the HSL and the OKLCH values. HEX uses
            hexadecimal bytes and RGB uses integer channels, so the control does not change them.
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
