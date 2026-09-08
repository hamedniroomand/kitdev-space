<script setup lang="ts">
import type { UrlParts } from '#shared/utils/network/url'
import { inspectUrl } from '#shared/utils/network/url'

const input = ref('https://user:pass@example.com:8443/path?q=1#top')
const { status, error, result, run, reset } = useTool<UrlParts>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const fieldRows = computed(() => {
  if (!result.value) {
    return []
  }

  const parts = result.value
  return [
    { name: 'href', value: parts.href },
    { name: 'protocol', value: parts.protocol },
    { name: 'username', value: parts.username },
    { name: 'password', value: parts.password },
    { name: 'host', value: parts.host },
    { name: 'hostname', value: parts.hostname },
    { name: 'port', value: parts.port },
    { name: 'pathname', value: parts.pathname },
    { name: 'search', value: parts.search },
    { name: 'searchParams', value: JSON.stringify(parts.searchParams) },
    { name: 'hash', value: parts.hash },
  ]
})

useToolSeo('url-inspector')
const { reportInput } = useToolInput()

async function inspect() {
  reportInput('url')
  await run(() => inspectUrl(input.value))
}

async function handleCopy() {
  if (status.value !== 'success' || result.value === null) {
    return
  }
  await copy(JSON.stringify(result.value, null, 2))
}

function handleClear() {
  input.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => inspect(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. It does not fetch the URL."
    />

    <UFormField
      label="URL"
      class="min-w-56"
    >
      <UInput
        v-model="input"
        placeholder="https://example.com/path?q=1"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-link"
        :loading="status === 'processing'"
        @click="inspect"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="status !== 'success' || !result"
        @click="handleCopy"
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
      v-if="status === 'success' && result"
      class="overflow-x-auto rounded-md border border-default"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default">
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Field
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Value
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="row in fieldRows"
            :key="row.name"
          >
            <td class="px-3 py-2 font-mono text-highlighted">
              {{ row.name }}
            </td>
            <td class="break-all px-3 py-2 font-mono text-highlighted">
              {{ row.value || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #docs>
      <ToolDocs title="About URL inspection">
        <div class="space-y-4 text-muted">
          <p>
            This tool parses a URL into its parts.
          </p>
          <p>
            Enter a URL. Then select Inspect.
          </p>
          <p>
            The tool does not fetch the URL. The tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
