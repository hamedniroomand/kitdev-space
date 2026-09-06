<script setup lang="ts">
type RedirectHop = {
  url: string
  status: number
  location?: string
}

const url = ref('')
const { status, error, result, run, reset } = useTool<RedirectHop[]>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('redirect-checker')

async function check() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: RedirectHop[] }>('/api/network/redirect', {
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
  await copy(JSON.stringify(result.value, null, 2))
}

function handleClear() {
  url.value = ''
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
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Redirect Checker"
        description="Follow and inspect URL redirects."
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
        label="Check"
        icon="i-lucide-route"
        :loading="status === 'processing'"
        @click="check"
      />
      <UButton
        :label="copyLabel('default', 'Copy JSON')"
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
      class="space-y-2"
    >
      <p class="text-sm font-medium text-highlighted">
        Hops
      </p>
      <div
        v-if="result.length"
        class="overflow-x-auto rounded-md border border-default"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Hop
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Status
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                URL
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Location
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(hop, index) in result"
              :key="`${index}-${hop.url}`"
            >
              <td class="px-3 py-2 font-mono text-highlighted">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2 font-mono text-highlighted">
                {{ hop.status }}
              </td>
              <td class="break-all px-3 py-2 font-mono text-highlighted">
                {{ hop.url }}
              </td>
              <td class="break-all px-3 py-2 font-mono text-highlighted">
                {{ hop.location }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-else
        class="text-sm text-muted"
      >
        No hops.
      </p>
    </div>

    <template #docs>
      <DataToolDocs title="About redirect checker">
        <div class="space-y-4 text-muted">
          <p>
            This tool follows HTTP redirects for a URL.
          </p>
          <p>
            Enter a URL. Then select Check.
          </p>
          <p>
            The tool follows a maximum of 5 redirects. The tool checks each hop. The tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'HTTP Headers', to: '/hub/network/http-headers' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
