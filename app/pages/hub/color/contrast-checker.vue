<script setup lang="ts">
import { contrastRatio, wcagLevel } from '#shared/utils/color/contrast'

const foreground = ref('#ffffff')
const background = ref('#7c3aed')
const ratio = ref<number | null>(null)
const levels = ref<{ aa: boolean, aaa: boolean } | null>(null)
const { status, error, run, reset } = useTool<string>()

useToolSeo('contrast')

async function check() {
  await run(() => {
    const next = contrastRatio(foreground.value, background.value)
    ratio.value = next
    levels.value = wcagLevel(next)
    return String(next)
  })
}

function handleClear() {
  ratio.value = null
  levels.value = null
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      check()
    }
  }
})

onMounted(() => {
  check()
})
</script>

<template>
  <ToolPage>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Text">
        <UInput v-model="foreground" />
      </UFormField>
      <UFormField label="Background">
        <UInput v-model="background" />
      </UFormField>
    </div>

    <div
      class="rounded-md border border-default p-8 text-lg"
      :style="{ color: foreground, backgroundColor: background }"
    >
      Sample text for contrast.
    </div>

    <ToolActions>
      <UButton
        label="Check"
        icon="i-lucide-contrast"
        :loading="status === 'processing'"
        @click="check"
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
      v-if="ratio !== null && levels"
      class="flex flex-wrap items-center gap-3"
    >
      <p class="font-mono text-highlighted">
        {{ ratio.toFixed(2) }}:1
      </p>
      <UBadge :color="levels.aa ? 'success' : 'error'">
        AA {{ levels.aa ? 'Pass' : 'Fail' }}
      </UBadge>
      <UBadge :color="levels.aaa ? 'success' : 'error'">
        AAA {{ levels.aaa ? 'Pass' : 'Fail' }}
      </UBadge>
    </div>

    <template #docs>
      <ToolDocs title="About contrast">
        <div class="space-y-4 text-muted">
          <p>
            Contrast ratio helps people read text on a background.
          </p>
          <p>
            WCAG AA for normal text needs a ratio of at least 4.5:1.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
            { label: 'CSS Gradient Studio', to: '/hub/color/gradient-studio' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
