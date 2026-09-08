<script setup lang="ts">
import { toOklchString } from '#shared/utils/color/oklch'
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

const input = ref('#7c3aed')
const hex = ref('')
const rgb = ref('')
const hsl = ref('')
const oklch = ref('')
const channels = ref({ r: 0, g: 0, b: 0 })
const { status, error, run, reset } = useTool<string>()

useToolSeo('color-inspector')

async function inspect() {
  await run(() => {
    const color = parseColor(input.value)
    hex.value = color.hex
    rgb.value = toRgbString(color.rgb)
    hsl.value = toHslString(color.hsl)
    oklch.value = toOklchString(color.oklch)
    channels.value = color.rgb
    return color.hex
  })
}

function handleClear() {
  hex.value = ''
  rgb.value = ''
  hsl.value = ''
  oklch.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => inspect(),
})

onMounted(() => {
  inspect()
})
</script>

<template>
  <ToolPage>
    <UFormField label="Color">
      <UInput
        v-model="input"
        placeholder="#7c3aed, rgb(124 58 237), or oklch(53% 0.24 293)"
        class="max-w-sm"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-pipette"
        :loading="status === 'processing'"
        @click="inspect"
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
      class="space-y-6"
    >
      <div
        class="flex h-40 items-end rounded-md border border-default p-4"
        :style="{ backgroundColor: hex }"
      >
        <p class="rounded bg-default/80 px-2 py-1 font-mono text-sm text-highlighted">
          {{ hex }}
        </p>
      </div>

      <dl class="grid gap-3 font-mono text-sm sm:grid-cols-4">
        <div>
          <dt class="text-muted">
            HEX
          </dt>
          <dd class="text-highlighted">
            {{ hex }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            RGB
          </dt>
          <dd class="text-highlighted">
            {{ rgb }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            HSL
          </dt>
          <dd class="text-highlighted">
            {{ hsl }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            OKLCH
          </dt>
          <dd class="break-all text-highlighted">
            {{ oklch }}
          </dd>
        </div>
      </dl>

      <div class="space-y-2">
        <p class="text-sm text-muted">
          Channels
        </p>
        <p class="font-mono text-sm text-highlighted">
          R {{ channels.r }} · G {{ channels.g }} · B {{ channels.b }}
        </p>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About color inspection">
        <div class="space-y-4 text-muted">
          <p>
            This tool shows a color swatch and the main channel values.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
