<script setup lang="ts">
import type { GradientInterpolation, GradientStop, GradientType } from '#shared/utils/color/gradient'
import {
  checkGradientTextContrast,
  clampPosition,
  createGradientStop,
  formatGradientCss,
  formatGradientDeclaration,
} from '#shared/utils/color/gradient'
import { parseGradientCss } from '#shared/utils/color/gradient-parse'
import { parseColor } from '#shared/utils/color/parse'

const type = ref<GradientType>('linear')
const angle = ref(135)
const textColor = ref('#ffffff')
const interpolation = ref<GradientInterpolation>('srgb')
const stops = ref<GradientStop[]>([
  createGradientStop('#7c3aed', 0, 'stop-a'),
  createGradientStop('#06b6d4', 100, 'stop-b'),
])
const pastedCss = ref('')
const parseError = ref<string | null>(null)
const parseWarnings = ref<string[]>([])

const toast = useToast()
const { reportInput } = useToolInput()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const typeItems = [
  { label: 'Linear', value: 'linear' },
  { label: 'Radial', value: 'radial' },
]

useToolSeo('gradient-studio')

const gradient = computed(() => ({
  type: type.value,
  angle: angle.value,
  stops: stops.value,
  interpolation: interpolation.value,
}))

const cssValue = computed(() => {
  try {
    return formatGradientCss(gradient.value)
  }
  catch {
    return ''
  }
})

const cssDeclaration = computed(() => (cssValue.value ? formatGradientDeclaration(gradient.value) : ''))

const contrast = computed(() => {
  try {
    return checkGradientTextContrast(textColor.value, stops.value)
  }
  catch {
    return null
  }
})

function loadCss() {
  parseError.value = null
  parseWarnings.value = []
  if (!pastedCss.value.trim()) {
    return
  }

  reportInput('paste')

  try {
    const parsed = parseGradientCss(pastedCss.value)
    type.value = parsed.type
    angle.value = parsed.angle
    interpolation.value = parsed.interpolation
    stops.value = parsed.stops
    parseWarnings.value = parsed.warnings
  }
  catch (cause) {
    parseError.value = cause instanceof Error ? cause.message : 'The gradient is not valid.'
  }
}

function updateStopColor(id: string, color: string) {
  const stop = stops.value.find(item => item.id === id)
  if (stop) {
    stop.color = color
  }
}

function updateStopPosition(id: string, position: number) {
  const stop = stops.value.find(item => item.id === id)
  if (stop) {
    stop.position = clampPosition(position)
  }
}

function updateStopAlpha(id: string, alpha: number) {
  const stop = stops.value.find(item => item.id === id)
  if (stop) {
    stop.alpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1
  }
}

function stopColorError(color: string): string | undefined {
  try {
    parseColor(color)
    return undefined
  }
  catch {
    return 'Use a hex color such as #7c3aed.'
  }
}

const bar = ref<HTMLElement | null>(null)
const dragId = ref<string | null>(null)
const { left: barLeft, width: barWidth } = useElementBounding(bar)
const { x: pointerX } = usePointer()
const { pressed } = useMousePressed({ target: bar })

watch([pointerX, pressed], () => {
  if (!pressed.value) {
    dragId.value = null
    return
  }
  if (!dragId.value || barWidth.value === 0) {
    return
  }
  updateStopPosition(dragId.value, ((pointerX.value - barLeft.value) / barWidth.value) * 100)
})

function addStop() {
  const last = stops.value[stops.value.length - 1]
  const position = last ? Math.min(100, last.position + 10) : 50
  stops.value.push(createGradientStop('#f59e0b', position))
}

function removeStop(id: string) {
  if (stops.value.length <= 2) {
    toast.add({ title: 'Keep at least two stops', color: 'warning' })
    return
  }
  stops.value = stops.value.filter(stop => stop.id !== id)
}

async function copyCss() {
  if (!cssDeclaration.value) {
    return
  }
  await copy(cssDeclaration.value)
}

function handleReset() {
  type.value = 'linear'
  angle.value = 135
  textColor.value = '#ffffff'
  interpolation.value = 'srgb'
  parseError.value = null
  parseWarnings.value = []
  stops.value = [
    createGradientStop('#7c3aed', 0, 'stop-a'),
    createGradientStop('#06b6d4', 100, 'stop-b'),
  ]
}

useToolShortcuts({
  onRun: () => copyCss(),
  onCopy: () => copyCss(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Contrast is sampled at each color stop and the average stop color, not across every rendered gradient pixel."
    />

    <section class="space-y-3">
      <UFormField
        label="Paste CSS gradient"
        help="Paste a linear-gradient() or a radial-gradient() value. The tool reads the stops and the angle."
      >
        <UTextarea
          v-model="pastedCss"
          :rows="2"
          class="w-full"
          placeholder="linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UButton
        label="Load CSS"
        size="sm"
        color="neutral"
        variant="subtle"
        icon="i-lucide-clipboard-paste"
        :disabled="!pastedCss.trim()"
        @click="loadCss"
      />
      <ToolError
        v-if="parseError"
        :message="parseError"
      />
      <UAlert
        v-if="parseWarnings.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Some CSS was not kept"
      >
        <template #description>
          <ul class="list-disc space-y-1 pl-4">
            <li
              v-for="warning in parseWarnings"
              :key="warning"
            >
              {{ warning }}
            </li>
          </ul>
        </template>
      </UAlert>
    </section>

    <div class="flex flex-wrap gap-4">
      <UFormField label="Type">
        <USelect
          v-model="type"
          :items="typeItems"
          class="w-36"
        />
      </UFormField>
      <UFormField
        v-if="type === 'linear'"
        label="Angle"
      >
        <div class="flex w-56 items-center gap-3">
          <USlider
            :model-value="angle"
            :min="0"
            :max="360"
            :step="1"
            class="flex-1"
            @update:model-value="angle = Number($event)"
          />
          <span class="w-12 font-mono text-sm text-muted">{{ angle }}°</span>
        </div>
      </UFormField>
      <UFormField label="Text color">
        <div class="flex items-center gap-2">
          <input
            v-model="textColor"
            type="color"
            class="h-9 w-12 cursor-pointer rounded-md border border-default bg-transparent p-1"
            aria-label="Text color picker"
          >
          <UInput
            v-model="textColor"
            class="w-32"
            :ui="{ base: 'font-mono' }"
          />
        </div>
      </UFormField>
    </div>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-highlighted">
          Color stops
        </h2>
        <UButton
          label="Add stop"
          size="sm"
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          @click="addStop"
        />
      </div>

      <div
        ref="bar"
        class="relative h-8 touch-none select-none rounded-md border border-default"
        :style="{ background: cssValue || undefined }"
      >
        <button
          v-for="(stop, index) in stops"
          :key="stop.id"
          type="button"
          class="absolute top-0 h-8 w-3 -translate-x-1/2 cursor-ew-resize rounded-sm border-2 border-inverted outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :style="{ left: `${stop.position}%`, background: stop.color }"
          :aria-label="`Stop ${index + 1} position, ${stop.position} percent`"
          @pointerdown="dragId = stop.id"
          @keydown.left.prevent="updateStopPosition(stop.id, stop.position - 1)"
          @keydown.right.prevent="updateStopPosition(stop.id, stop.position + 1)"
        />
      </div>
      <p class="text-sm text-muted">
        Drag a marker to move the stop.
      </p>

      <ul class="space-y-3">
        <li
          v-for="(stop, index) in stops"
          :key="stop.id"
          class="flex flex-wrap items-end gap-3 rounded-md border border-default p-3"
        >
          <UFormField
            :label="`Stop ${index + 1}`"
            :error="stopColorError(stop.color)"
          >
            <div class="flex items-center gap-2">
              <input
                :value="stop.color"
                type="color"
                class="h-9 w-12 cursor-pointer rounded-md border border-default bg-transparent p-1"
                :aria-label="`Stop ${index + 1} color`"
                @input="updateStopColor(stop.id, ($event.target as HTMLInputElement).value)"
              >
              <UInput
                :model-value="stop.color"
                class="w-32"
                :ui="{ base: 'font-mono' }"
                @update:model-value="updateStopColor(stop.id, String($event))"
              />
            </div>
          </UFormField>
          <UFormField
            label="Alpha"
            class="w-24"
          >
            <UInput
              :model-value="stop.alpha ?? 1"
              type="number"
              :min="0"
              :max="1"
              :step="0.05"
              class="w-full"
              :aria-label="`Stop ${index + 1} alpha`"
              @update:model-value="updateStopAlpha(stop.id, Number($event))"
            />
          </UFormField>
          <UFormField
            label="Position"
            class="min-w-40 flex-1"
          >
            <div class="flex items-center gap-3">
              <USlider
                :model-value="stop.position"
                :min="0"
                :max="100"
                :step="1"
                class="flex-1"
                @update:model-value="updateStopPosition(stop.id, Number($event))"
              />
              <span class="w-10 font-mono text-sm text-muted">{{ stop.position }}%</span>
            </div>
          </UFormField>
          <UButton
            label="Remove"
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="stops.length <= 2"
            @click="removeStop(stop.id)"
          />
        </li>
      </ul>
    </section>

    <div
      class="flex min-h-48 items-center justify-center rounded-md border border-default p-8 text-center text-xl font-medium"
      :style="{ background: cssValue || undefined, color: textColor }"
    >
      Sample text on gradient
    </div>

    <ToolActions>
      <UButton
        :label="copyLabel('default', 'Copy CSS')"
        :icon="copyIcon()"
        :color="copyColor()"
        :disabled="!cssDeclaration"
        @click="copyCss"
      />
      <UButton
        label="Reset"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleReset"
      />
    </ToolActions>

    <div
      v-if="cssDeclaration"
      class="space-y-2"
    >
      <p class="text-sm font-medium text-highlighted">
        CSS
      </p>
      <pre class="overflow-x-auto rounded-md border border-default bg-elevated p-3 font-mono text-sm text-highlighted">{{ cssDeclaration }}</pre>
    </div>

    <div
      v-if="contrast"
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-sm font-medium text-highlighted">
          Text contrast, sampled at stops and average
        </p>
        <p class="font-mono text-sm text-highlighted">
          worst {{ contrast.worstRatio.toFixed(2) }}:1
        </p>
        <UBadge :color="contrast.levels.aa ? 'success' : 'error'">
          AA {{ contrast.levels.aa ? 'Pass' : 'Fail' }}
        </UBadge>
        <UBadge :color="contrast.levels.aaa ? 'success' : 'error'">
          AAA {{ contrast.levels.aaa ? 'Pass' : 'Fail' }}
        </UBadge>
      </div>
      <p class="text-sm text-muted">
        Each row is one sample. The tool measures the text color against each stop color and against the average stop color. It does not measure every pixel between two stops.
      </p>
      <ul class="divide-y divide-default rounded-md border border-default">
        <li
          v-for="sample in contrast.samples"
          :key="sample.label"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
        >
          <span class="text-muted">{{ sample.label }}</span>
          <span class="font-mono text-highlighted">
            {{ sample.color }} · {{ sample.ratio.toFixed(2) }}:1
          </span>
        </li>
      </ul>
    </div>

    <template #docs>
      <ToolDocs title="About CSS gradients">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds linear and radial CSS gradients from color stops.
          </p>
          <p>
            Use the angle control for linear gradients. Drag a stop marker on the gradient bar, or use the position slider. Set Alpha to make a stop transparent.
          </p>
          <p>
            Paste a CSS gradient to load its stops and its angle. The tool reads one gradient layer. It does not read conic or repeating gradients.
          </p>
          <p>
            Contrast is sampled at each explicit color stop and their average color. It estimates readability at those points, but does not test every interpolated point across the rendered gradient canvas.
          </p>
          <p>
            This tool does not store your input.
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
