<script setup lang="ts">
import type { ResolveMode } from '#shared/utils/dev/ast'

export interface AstResolveItem {
  specifier: string
  ok: boolean
  path: string | null
  error: string | null
  packageJsonPath: string | null
}

const props = defineProps<{
  imports: string[]
}>()

const RESOLVE_MODE_ITEMS: { label: string, value: ResolveMode }[] = [
  { label: 'ESM (import)', value: 'esm' },
  { label: 'Node (require)', value: 'node' }
]

const mode = ref<ResolveMode>('esm')
const directory = ref('')
const manualSpecifier = ref('')
const rows = ref<AstResolveItem[]>([])
const { status, error, run } = useTool<string>()

const specifiers = computed(() => {
  const extra = manualSpecifier.value.trim()
  if (!extra) {
    return props.imports
  }
  return [...new Set([...props.imports, extra])]
})

async function resolve() {
  if (specifiers.value.length === 0) {
    return
  }

  await run(async () => {
    const data = await $fetch<{ result: AstResolveItem[] }>('/api/dev/ast', {
      method: 'POST',
      body: {
        mode: 'resolve',
        resolveMode: mode.value,
        directory: directory.value || undefined,
        specifiers: specifiers.value
      }
    })
    rows.value = data.result
    return JSON.stringify(data.result)
  }, 'The resolve operation failed.')
}

function clear() {
  rows.value = []
}

defineExpose({ resolve, clear })
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-4">
      <UFormField label="Resolve mode">
        <USelect
          v-model="mode"
          :items="RESOLVE_MODE_ITEMS"
          class="w-44"
        />
      </UFormField>
      <UFormField
        label="From directory"
        class="min-w-56 flex-1"
        hint="Defaults to the server working directory."
      >
        <UInput
          v-model="directory"
          placeholder="Leave empty for project root"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField
        label="Extra specifier"
        class="min-w-40 flex-1"
      >
        <UInput
          v-model="manualSpecifier"
          placeholder="lodash/get"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
    </div>

    <div
      v-if="imports.length"
      class="flex flex-wrap gap-2"
    >
      <UBadge
        v-for="item in imports"
        :key="item"
        color="neutral"
        variant="subtle"
        class="font-mono"
      >
        {{ item }}
      </UBadge>
    </div>

    <UButton
      label="Resolve"
      icon="i-lucide-folder-symlink"
      :loading="status === 'processing'"
      :disabled="specifiers.length === 0"
      @click="resolve"
    />

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="rows.length"
      class="overflow-x-auto rounded-md border border-default"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default">
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Specifier
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Result
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Path
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="row in rows"
            :key="row.specifier"
          >
            <td class="px-3 py-2 font-mono text-highlighted">
              {{ row.specifier }}
            </td>
            <td class="px-3 py-2">
              <UBadge
                :color="row.ok ? 'success' : 'error'"
                variant="subtle"
              >
                {{ row.ok ? 'Resolved' : 'Failed' }}
              </UBadge>
            </td>
            <td class="break-all px-3 py-2 font-mono text-muted">
              {{ row.path || row.error }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
