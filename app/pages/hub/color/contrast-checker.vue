<script setup lang="ts">
import type { LightnessFix } from '#shared/utils/color/contrast-fix'
import { contrastRatio, wcagLevel } from '#shared/utils/color/contrast'
import { suggestLightnessFix } from '#shared/utils/color/contrast-fix'
import { parseColor } from '#shared/utils/color/parse'

const DEFAULT_COLORS = { fg: '#ffffff', bg: '#7c3aed' }

const colors = reactive({ ...DEFAULT_COLORS })

useToolSeo('contrast')

const { error, result: ratio } = useLiveTool(() => contrastRatio(colors.fg, colors.bg))

const WCAG_TARGETS = [
  { label: 'AA', target: 4.5 },
  { label: 'AAA', target: 7 },
] as const

// The three sizes are the WCAG boundaries. The preview keeps the body font.
const TEXT_SAMPLES = [
  { label: '14px regular', size: '14px', weight: 400 },
  { label: '18.66px bold', size: '18.66px', weight: 700 },
  { label: '24px regular', size: '24px', weight: 400 },
] as const

const fixes = computed(() => {
  if (ratio.value === null) {
    return []
  }

  return WCAG_TARGETS.flatMap(({ label, target }) => {
    try {
      const fix = suggestLightnessFix(colors.fg, colors.bg, target)
      return fix ? [{ label, ...fix }] : []
    }
    catch {
      return []
    }
  })
})

// WCAG uses a lower bar for large text: 18.66px bold, or 24px and larger.
const results = computed(() => {
  if (ratio.value === null) {
    return null
  }

  return [
    { label: 'Normal text', hint: 'Below 24px', ...wcagLevel(ratio.value, false) },
    { label: 'Large text', hint: '24px, or 18.66px bold', ...wcagLevel(ratio.value, true) },
  ]
})

/** The picker needs a 6 digit hex value. An invalid input keeps the swatch black. */
function pickerHex(color: string): string {
  try {
    return parseColor(color).hex
  }
  catch {
    return '#000000'
  }
}

function alphaSuffix(color: string): string {
  try {
    const { alpha } = parseColor(color)
    return alpha === undefined ? '' : Math.round(alpha * 255).toString(16).padStart(2, '0')
  }
  catch {
    return ''
  }
}

/** The picker holds no alpha, so it writes the opaque part and keeps the alpha. */
function applyPicker(field: 'fg' | 'bg', hex: string) {
  colors[field] = hex + alphaSuffix(colors[field])
}

function swapColors() {
  const previous = colors.fg
  colors.fg = colors.bg
  colors.bg = previous
}

function handleReset() {
  Object.assign(colors, DEFAULT_COLORS)
}

function applyFix(fix: LightnessFix) {
  colors[fix.target === 'foreground' ? 'fg' : 'bg'] = fix.hex
}
</script>

<template>
  <ToolPage>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Text">
        <div class="flex items-center gap-2">
          <input
            :value="pickerHex(colors.fg)"
            type="color"
            class="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-default bg-transparent p-1"
            aria-label="Text color picker"
            @input="applyPicker('fg', ($event.target as HTMLInputElement).value)"
          >
          <UInput
            v-model="colors.fg"
            class="flex-1"
            :ui="{ base: 'font-mono' }"
          />
        </div>
      </UFormField>
      <UFormField label="Background">
        <div class="flex items-center gap-2">
          <input
            :value="pickerHex(colors.bg)"
            type="color"
            class="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-default bg-transparent p-1"
            aria-label="Background color picker"
            @input="applyPicker('bg', ($event.target as HTMLInputElement).value)"
          >
          <UInput
            v-model="colors.bg"
            class="flex-1"
            :ui="{ base: 'font-mono' }"
          />
        </div>
      </UFormField>
    </div>

    <p class="text-xs text-muted">
      Each field accepts HEX, RGB, HSL, and OKLCH. The picker sets the opaque color and keeps the
      alpha of the field. The ratio uses the opaque color, because WCAG needs the color that the
      user sees.
    </p>

    <div
      class="space-y-4 rounded-md border border-default p-6"
      :style="{ color: colors.fg, backgroundColor: colors.bg }"
    >
      <p
        v-for="sample in TEXT_SAMPLES"
        :key="sample.label"
        :style="{ fontSize: sample.size, fontWeight: sample.weight }"
      >
        {{ sample.label }} — the quick brown fox jumps over the lazy dog.
      </p>
      <!-- A span, not a button. The preview has no action, so it must not take focus. -->
      <span
        class="inline-block rounded-md border px-4 py-2"
        :style="{
          color: colors.fg,
          borderColor: colors.fg,
          fontSize: '14px',
          fontWeight: 500,
        }"
      >
        Button label
      </span>
    </div>

    <ToolActions>
      <UButton
        label="Swap"
        icon="i-lucide-arrow-left-right"
        aria-label="Swap the text color and the background"
        @click="swapColors"
      />
      <UButton
        label="Reset"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleReset"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="ratio !== null && results"
      class="space-y-4"
    >
      <p
        aria-label="Contrast ratio"
        class="text-2xl font-medium text-highlighted"
      >
        <span class="font-mono">{{ ratio.toFixed(2) }}:1</span>
      </p>

      <div class="overflow-x-auto rounded-md border border-default">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Text size
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                AA
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                AAA
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in results"
              :key="row.label"
            >
              <td class="px-3 py-2">
                <p class="text-highlighted">
                  {{ row.label }}
                </p>
                <p class="text-xs text-muted">
                  {{ row.hint }}
                </p>
              </td>
              <td class="px-3 py-2">
                <UBadge
                  :color="row.aa ? 'success' : 'error'"
                  variant="subtle"
                >
                  {{ row.aa ? 'Pass' : 'Fail' }}
                </UBadge>
              </td>
              <td class="px-3 py-2">
                <UBadge
                  :color="row.aaa ? 'success' : 'error'"
                  variant="subtle"
                >
                  {{ row.aaa ? 'Pass' : 'Fail' }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="fixes.length"
        class="space-y-2"
      >
        <h2 class="text-sm font-medium text-highlighted">
          Lightness fix
        </h2>
        <ul class="divide-y divide-default rounded-md border border-default">
          <li
            v-for="fix in fixes"
            :key="fix.label"
            class="flex flex-wrap items-center gap-3 px-3 py-2 text-sm"
          >
            <span
              class="size-6 shrink-0 rounded border border-default"
              :style="{ backgroundColor: fix.hex }"
            />
            <span class="text-muted">
              For {{ fix.label }}, set the
              {{ fix.target === 'foreground' ? 'text color' : 'background' }} to
              <span class="font-mono text-highlighted">{{ fix.hex }}</span>.
              The ratio becomes {{ fix.ratio.toFixed(2) }}:1.
            </span>
            <UButton
              :label="`Apply ${fix.label} fix`"
              size="sm"
              color="neutral"
              variant="subtle"
              icon="i-lucide-paintbrush"
              class="ms-auto"
              @click="applyFix(fix)"
            />
          </li>
        </ul>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About contrast">
        <div class="space-y-4 text-muted">
          <p>
            Contrast ratio helps people read text on a background.
          </p>
          <p>
            WCAG AA for normal text needs a ratio of at least 4.5:1. AAA needs 7:1.
          </p>
          <p>
            Large text has a lower bar. Text of 24px, or 18.66px in bold, needs 3:1 for AA and 4.5:1
            for AAA. The table shows both results, so you can see where a color pair is usable.
          </p>
          <p>
            The tool calculates the ratio while you type. Use Swap to exchange the text color and
            the background, which is the quickest test of a dark theme.
          </p>
          <p>
            The preview shows the pair at 14px regular, 18.66px bold, and 24px regular. It also
            shows a button. Use it to see the pair at the sizes that the table reports.
          </p>
          <p>
            When a pair fails, the tool suggests the smallest lightness change that makes it pass.
            The change keeps the hue and the chroma of the color, so the color stays near the
            original. The tool changes the text color or the background, and picks the one that
            needs the smaller change.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
            { label: 'CSS Gradient Studio', to: '/hub/color/gradient-studio' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
