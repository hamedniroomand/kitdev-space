<script setup lang="ts">
import { contrastRatio, wcagLevel } from '#shared/utils/color/contrast'

const foreground = ref('#ffffff')
const background = ref('#7c3aed')
const ratio = ref<number | null>(null)
const { status, error, run, reset } = useTool<string>()

useToolSeo('contrast')

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

async function check() {
  await run(() => {
    const next = contrastRatio(foreground.value, background.value)
    ratio.value = next
    return String(next)
  })
}

function handleClear() {
  ratio.value = null
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      check()
    },
  },
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
      v-if="ratio !== null && results"
      class="space-y-4"
    >
      <p class="text-2xl font-medium text-highlighted">
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
