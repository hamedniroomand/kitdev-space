<script setup lang="ts">
import type { ShadeKey, TailwindShade } from '#shared/utils/color/tailwind'
import { contrastRatio, wcagLevel } from '#shared/utils/color/contrast'
import {
  DEFAULT_ANCHOR,
  formatAsCssVars,
  formatAsSemanticTokens,
  formatAsTailwindV3,
  formatAsTailwindV4,
  generateTailwindPalette,
  SHADE_KEYS,
} from '#shared/utils/color/tailwind'

useToolSeo('tailwind-shades')

const inputColor = ref('#3b82f6')
const colorName = ref('brand')
const anchorShade = ref<ShadeKey>(DEFAULT_ANCHOR)
const format = ref<'v4' | 'v3' | 'css' | 'tokens'>('v4')

const anchorItems = SHADE_KEYS.map(shade => ({ label: shade, value: shade }))

const ROLE_ITEMS = [
  { key: 'surface', label: 'Surface' },
  { key: 'border', label: 'Border' },
  { key: 'text', label: 'Text' },
  { key: 'primary', label: 'Primary' },
]

const ROLE_DEFAULTS: Record<string, ShadeKey> = {
  surface: '50',
  border: '200',
  text: '900',
  primary: '500',
}

const roleShades = ref<Record<string, ShadeKey>>({ ...ROLE_DEFAULTS })

const { copy, label, color, icon } = useCopyFeedback()

const presets = [
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Violet', hex: '#8b5cf6' },
]

/** A hex value that replaces one generated step. The key is the shade step. */
const overrides = ref<Record<string, string>>({})

const palette = computed<TailwindShade[]>(() => {
  try {
    return generateTailwindPalette(inputColor.value, anchorShade.value).map((shade) => {
      const override = overrides.value[shade.shade]
      return override ? { ...shade, hex: override } : shade
    })
  }
  catch {
    return []
  }
})

const WHITE = '#ffffff'
const BLACK = '#000000'

/** Each step with its WCAG AA result for white text and for black text. */
const chips = computed(() => palette.value.map((shade) => {
  const onWhite = contrastRatio(shade.hex, WHITE)
  const onBlack = contrastRatio(shade.hex, BLACK)
  return {
    ...shade,
    foreground: onWhite >= onBlack ? WHITE : BLACK,
    white: WHITE,
    black: BLACK,
    whiteAa: wcagLevel(onWhite).aa,
    blackAa: wcagLevel(onBlack).aa,
  }
}))

const codeOutput = computed(() => {
  if (palette.value.length === 0)
    return ''
  const name = colorName.value.trim() || 'brand'
  if (format.value === 'v4') {
    return formatAsTailwindV4(palette.value, name)
  }
  if (format.value === 'v3') {
    return formatAsTailwindV3(palette.value, name)
  }
  if (format.value === 'tokens') {
    return formatAsSemanticTokens(palette.value, roleShades.value, name)
  }
  return formatAsCssVars(palette.value, name)
})

function handlePreset(hex: string) {
  inputColor.value = hex
}

// An override survives every other change. Only the user clears it.
function setOverride(shade: string, hex: string) {
  overrides.value = { ...overrides.value, [shade]: hex }
}

function clearOverride(shade: string) {
  const { [shade]: _removed, ...rest } = overrides.value
  overrides.value = rest
}

function handleCopyCode() {
  if (codeOutput.value) {
    copy(codeOutput.value)
  }
}

useToolShortcuts({
  onCopy: handleCopyCode,
})
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar & Presets -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.hex"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.hex)"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!codeOutput"
            @click="handleCopyCode"
          />
        </div>
      </div>

      <!-- Inputs Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Color Input -->
        <UFormField
          label="Base Color"
          class="lg:col-span-2"
        >
          <div class="flex items-center gap-3">
            <input
              v-model="inputColor"
              type="color"
              aria-label="Base color picker"
              class="w-10 h-10 rounded-lg border border-default cursor-pointer p-0 bg-transparent shrink-0"
            >
            <UInput
              v-model="inputColor"
              placeholder="#3b82f6"
              class="font-mono text-sm w-full"
            />
          </div>
        </UFormField>

        <!-- Color Name Input -->
        <UFormField label="Token Name">
          <UInput
            v-model="colorName"
            placeholder="e.g. brand, primary, accent"
            class="font-mono text-sm w-full"
          />
        </UFormField>

        <!-- The step that holds the base color. The scale grows around it. -->
        <UFormField
          label="Base Shade"
          help="The step that keeps your color"
        >
          <USelect
            v-model="anchorShade"
            :items="anchorItems"
            aria-label="Base shade"
            class="font-mono text-sm w-full"
          />
        </UFormField>
      </div>

      <!-- Color Swatches Grid -->
      <div
        v-if="palette.length > 0"
        class="space-y-2"
      >
        <span class="block text-sm font-medium text-default">
          Generated 50–950 Shade Scale (Click any swatch to copy hex)
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          <div
            v-for="s in chips"
            :key="s.shade"
            class="group relative"
          >
            <button
              type="button"
              class="w-full rounded-xl p-3 text-center transition-transform hover:scale-105 shadow-xs border border-default/20 flex flex-col items-center justify-between gap-1 min-h-24 cursor-pointer"
              :style="{ backgroundColor: s.hex, color: s.foreground }"
              :aria-label="`Copy shade ${s.shade}`"
              @click="copy(s.hex)"
            >
              <span class="font-bold text-xs font-mono">
                {{ s.shade }}
              </span>

              <!-- Which text color reads on this shade. A cross means it fails WCAG AA. -->
              <span class="flex items-center gap-1.5 text-[10px] font-bold leading-none">
                <span
                  role="img"
                  class="inline-flex items-center"
                  :style="{ color: s.white }"
                  :aria-label="`White text ${s.whiteAa ? 'passes' : 'fails'} WCAG AA`"
                >
                  A
                  <UIcon
                    :name="s.whiteAa ? 'i-lucide-check' : 'i-lucide-x'"
                    class="size-2.5"
                  />
                </span>
                <span
                  role="img"
                  class="inline-flex items-center"
                  :style="{ color: s.black }"
                  :aria-label="`Black text ${s.blackAa ? 'passes' : 'fails'} WCAG AA`"
                >
                  A
                  <UIcon
                    :name="s.blackAa ? 'i-lucide-check' : 'i-lucide-x'"
                    class="size-2.5"
                  />
                </span>
              </span>

              <span class="text-[11px] font-mono tracking-tight opacity-90 group-hover:opacity-100">
                {{ s.hex }}
              </span>
            </button>

            <!-- The color input covers the icon, so the chip keeps one clear affordance. -->
            <span class="absolute top-1 right-1 inline-flex size-5 items-center justify-center rounded-md bg-default/80 shadow-xs">
              <UIcon
                name="i-lucide-pencil"
                class="size-3 text-default"
              />
              <input
                type="color"
                :value="s.hex"
                :aria-label="`Override shade ${s.shade}`"
                class="absolute inset-0 size-full cursor-pointer opacity-0"
                @input="setOverride(s.shade, ($event.target as HTMLInputElement).value)"
              >
            </span>

            <UButton
              v-if="overrides[s.shade]"
              icon="i-lucide-rotate-ccw"
              size="xs"
              color="neutral"
              variant="solid"
              class="absolute bottom-1 right-1"
              :aria-label="`Reset shade ${s.shade}`"
              @click="clearOverride(s.shade)"
            />
          </div>
        </div>
      </div>

      <!-- Code Export -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="format === 'v4' ? 'solid' : 'ghost'"
              color="neutral"
              label="Tailwind v4 (@theme)"
              @click="format = 'v4'"
            />
            <UButton
              size="xs"
              :variant="format === 'v3' ? 'solid' : 'ghost'"
              color="neutral"
              label="Tailwind v3 (config)"
              @click="format = 'v3'"
            />
            <UButton
              size="xs"
              :variant="format === 'css' ? 'solid' : 'ghost'"
              color="neutral"
              label="CSS Variables"
              @click="format = 'css'"
            />
            <UButton
              size="xs"
              :variant="format === 'tokens' ? 'solid' : 'ghost'"
              color="neutral"
              label="Semantic Tokens"
              @click="format = 'tokens'"
            />
          </div>

          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            @click="handleCopyCode"
          />
        </div>

        <!-- One shade step for each semantic role of a theme. -->
        <div
          v-if="format === 'tokens'"
          class="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <UFormField
            v-for="role in ROLE_ITEMS"
            :key="role.key"
            :label="role.label"
          >
            <USelect
              v-model="roleShades[role.key]"
              :items="anchorItems"
              :aria-label="`${role.label} shade`"
              class="font-mono text-sm w-full"
            />
          </UFormField>
        </div>

        <LazyToolEditor
          hydrate-on-idle
          :model-value="codeOutput"
          label="Configuration Code"
          lang="css"
          :rows="12"
          readonly
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About shade scales">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a full 50 to 950 scale from one color. Tailwind CSS uses these steps, so the result drops into a theme with no change.
          </p>
          <p>
            A scale keeps the character of the color at every step. A hand-picked set of shades often drifts in hue, which makes a interface look inconsistent.
          </p>
          <p>
            Use a light step for a background, a middle step for a border, and a dark step for text. Check the pair with the Contrast Checker before you ship it.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
            { label: 'Color Converter', to: '/hub/color/converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
