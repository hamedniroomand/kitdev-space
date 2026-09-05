<script setup lang="ts">
import { parseColor, toHslString, toRgbString } from '~~/shared/utils/color/parse'

const input = ref('#7c3aed')
const hex = ref('')
const rgb = ref('')
const hsl = ref('')
const channels = ref({ r: 0, g: 0, b: 0 })
const { status, error, run, reset } = useTool<string>()

useToolSeo('color-inspector')

async function inspect() {
  await run(() => {
    const color = parseColor(input.value)
    hex.value = color.hex
    rgb.value = toRgbString(color.rgb)
    hsl.value = toHslString(color.hsl)
    channels.value = color.rgb
    return color.hex
  })
}

function handleClear() {
  hex.value = ''
  rgb.value = ''
  hsl.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      inspect()
    }
  }
})

onMounted(() => {
  inspect()
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Color Inspector"
        description="Inspect color values and details."
      />
    </template>

    <UFormField label="Color">
      <UInput
        v-model="input"
        placeholder="#7c3aed"
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

      <dl class="grid gap-3 font-mono text-sm sm:grid-cols-3">
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
      <DataToolDocs title="About color inspection">
        <div class="space-y-4 text-muted">
          <p>
            This tool shows a color swatch and the main channel values.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/color/converter' },
            { label: 'Palette Generator', to: '/color/palette' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
