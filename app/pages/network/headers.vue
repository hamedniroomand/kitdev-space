<script setup lang="ts">
type HeaderInspectResult = {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
}

const url = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<HeaderInspectResult>()
const { copy } = useClipboard()

const headerRows = computed(() => {
  if (!result.value) {
    return []
  }

  return Object.entries(result.value.headers).map(([name, value]) => ({
    name,
    value
  }))
})

useSeoMeta({
  title: 'HTTP Headers',
  description: 'Inspect HTTP response headers.'
})

async function inspect() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: HeaderInspectResult }>('/api/network/headers', {
        method: 'POST',
        body: {
          url: url.value
        }
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      const message = fetchError.data?.message
        || fetchError.statusMessage
        || 'The request failed.'
      throw new Error(message, { cause })
    }
  })
}

async function handleCopy() {
  if (status.value !== 'success' || result.value === null) {
    return
  }
  const ok = await copy(JSON.stringify(result.value, null, 2))
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
}

function handleClear() {
  url.value = ''
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
        title="HTTP Headers"
        description="Inspect HTTP response headers."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.fetch on the server."
    />

    <UFormField
      label="URL"
      class="min-w-56"
    >
      <UInput
        v-model="url"
        placeholder="https://example.com"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-list-tree"
        :loading="status === 'processing'"
        @click="inspect"
      />
      <UButton
        label="Copy JSON"
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
      class="space-y-2"
    >
      <p class="text-sm font-medium text-highlighted">
        {{ result.status }} {{ result.statusText }}
      </p>
      <p class="font-mono text-sm text-muted">
        {{ result.url }}
      </p>
      <div
        v-if="headerRows.length"
        class="overflow-x-auto rounded-md border border-default"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Name
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Value
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(row, index) in headerRows"
              :key="`${index}-${row.name}`"
            >
              <td class="px-3 py-2 font-mono text-highlighted">
                {{ row.name }}
              </td>
              <td class="break-all px-3 py-2 font-mono text-highlighted">
                {{ row.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-else
        class="text-sm text-muted"
      >
        No headers.
      </p>
    </div>

    <template #docs>
      <DataToolDocs title="About HTTP headers">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads response headers for a URL.
          </p>
          <p>
            Enter a URL. Then select Inspect.
          </p>
          <p>
            The tool does not follow redirects. The tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/network/dns' },
            { label: 'URL Inspector', to: '/network/url' },
            { label: 'Redirect Checker', to: '/network/redirect' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
