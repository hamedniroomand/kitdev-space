<script setup lang="ts">
import { inspectUrl, type UrlParts } from '~~/shared/utils/network/url'

const input = ref('https://user:pass@example.com:8443/path?q=1#top')
const toast = useToast()
const { status, error, result, run, reset } = useTool<UrlParts>()
const { copy } = useClipboard()

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
    { name: 'hash', value: parts.hash }
  ]
})

useToolSeo('url-inspector')

async function inspect() {
  await run(() => inspectUrl(input.value))
}

async function handleCopy() {
  if (status.value !== 'success' || result.value === null) {
    return
  }
  const ok = await copy(JSON.stringify(result.value, null, 2))
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
}

function handleClear() {
  input.value = ''
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
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="URL Inspector"
        description="Inspect and parse URL parts."
      />
    </template>

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
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
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
      <DataToolDocs title="About URL inspection">
        <div class="space-y-4 text-muted">
          <p>
            This tool parses a URL into its parts.
          </p>
          <p>
            Enter a URL. Then click Inspect.
          </p>
          <p>
            The tool does not fetch the URL. The tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/network/dns' },
            { label: 'HTTP Headers', to: '/network/headers' },
            { label: 'Redirect Checker', to: '/network/redirect' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
