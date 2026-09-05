<script setup lang="ts">
import { createPalette } from '~~/shared/utils/color/palette'

const base = ref('#7c3aed')
const count = ref(5)
const palette = ref<string[]>([])
const toast = useToast()
const { status, error, run, reset } = useTool<string>()
const { copy } = useClipboard()

useToolSeo('palette')

async function generate() {
  await run(() => {
    palette.value = createPalette(base.value, count.value)
    return palette.value.join(', ')
  })
}

async function copyValue(value: string) {
  const ok = await copy(value)
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
}

function handleClear() {
  palette.value = []
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      generate()
    }
  }
})

onMounted(() => {
  generate()
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Palette Generator"
        description="Generate color palettes."
      />
    </template>

    <div class="flex flex-wrap gap-4">
      <UFormField label="Base color">
        <UInput
          v-model="base"
          class="w-40"
        />
      </UFormField>
      <UFormField label="Count">
        <UInput
          v-model.number="count"
          type="number"
          :min="3"
          :max="12"
          class="w-24"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-swatch-book"
        :loading="status === 'processing'"
        @click="generate"
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
      v-if="palette.length"
      class="grid grid-cols-2 gap-3 sm:grid-cols-5"
    >
      <button
        v-for="color in palette"
        :key="color"
        type="button"
        class="overflow-hidden rounded-md border border-default text-left"
        @click="copyValue(color)"
      >
        <div
          class="h-20"
          :style="{ backgroundColor: color }"
        />
        <p class="px-2 py-1 font-mono text-xs text-muted">
          {{ color }}
        </p>
      </button>
    </div>

    <template #docs>
      <DataToolDocs title="About palettes">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds lighter and darker stops from one base color.
          </p>
          <p>
            Select a swatch to copy its HEX value.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/color/converter' },
            { label: 'Contrast Checker', to: '/color/contrast' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
