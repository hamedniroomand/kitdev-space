<script setup lang="ts">
import type { GradientStop, GradientType } from '#shared/utils/color/gradient'
import {
  checkGradientTextContrast,
  createGradientStop,
  formatGradientCss,
  formatGradientDeclaration,
} from '#shared/utils/color/gradient'

const type = ref<GradientType>('linear')
const angle = ref(135)
const textColor = ref('#ffffff')
const stops = ref<GradientStop[]>([
  createGradientStop('#7c3aed', 0, 'stop-a'),
  createGradientStop('#06b6d4', 100, 'stop-b'),
])

const toast = useToast()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const typeItems = [
  { label: 'Linear', value: 'linear' },
  { label: 'Radial', value: 'radial' },
]

useToolSeo('gradient-studio')

const cssValue = computed(() => {
  try {
    return formatGradientCss({
      type: type.value,
      angle: angle.value,
      stops: stops.value,
    })
  }
  catch {
    return ''
  }
})

const cssDeclaration = computed(() => {
  if (!cssValue.value) {
    return ''
  }
  return formatGradientDeclaration({
    type: type.value,
    angle: angle.value,
    stops: stops.value,
  })
})

const contrast = computed(() => {
  try {
    return checkGradientTextContrast(textColor.value, stops.value)
  }
  catch {
    return null
  }
})

function updateStopColor(id: string, color: string) {
  const stop = stops.value.find(item => item.id === id)
  if (stop) {
    stop.color = color
  }
}

function updateStopPosition(id: string, position: number) {
  const stop = stops.value.find(item => item.id === id)
  if (stop) {
    stop.position = position
  }
}

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
  stops.value = [
    createGradientStop('#7c3aed', 0, 'stop-a'),
    createGradientStop('#06b6d4', 100, 'stop-b'),
  ]
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      copyCss()
    },
  },
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Contrast uses the same WCAG checks as the Contrast Checker."
    />

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

      <ul class="space-y-3">
        <li
          v-for="(stop, index) in stops"
          :key="stop.id"
          class="flex flex-wrap items-end gap-3 rounded-md border border-default p-3"
        >
          <UFormField :label="`Stop ${index + 1}`">
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
          Text contrast
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
            Use the angle control for linear gradients. Move each stop to set its position.
          </p>
          <p>
            Contrast checks the text color against each stop and against the average stop color.
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
