<script setup lang="ts">
import { formatDnsRecord } from '~~/shared/utils/network/dns'

type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'CAA'

const domain = ref('')
const recordType = ref<DnsRecordType>('A')
const rows = ref<string[]>([])
const toast = useToast()
const { status, error, result, run, reset } = useTool<string[] | object[]>()
const { copy, copied } = useClipboard({ legacy: true })

const recordTypeItems = [
  { label: 'A', value: 'A' },
  { label: 'AAAA', value: 'AAAA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'MX', value: 'MX' },
  { label: 'NS', value: 'NS' },
  { label: 'TXT', value: 'TXT' },
  { label: 'CAA', value: 'CAA' }
]

useToolSeo('dns')

async function lookup() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: string[] | object[] }>('/api/network/dns', {
        method: 'POST',
        body: {
          domain: domain.value,
          type: recordType.value
        }
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      const message = fetchError.data?.message
        || fetchError.statusMessage
        || 'The lookup failed.'
      throw new Error(message, { cause })
    }
  })

  if (status.value === 'success' && result.value !== null) {
    rows.value = result.value.map(record => formatDnsRecord(record))
  }
}

async function handleCopy() {
  if (!rows.value.length) {
    return
  }
  await copy(rows.value.join('\n'))
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
}

function handleClear() {
  domain.value = ''
  rows.value = []
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      lookup()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="DNS Lookup"
        description="Look up DNS records for a domain."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.dns on the server."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField
        label="Domain"
        class="min-w-56 flex-1"
      >
        <UInput
          v-model="domain"
          placeholder="example.com"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField label="Record type">
        <USelect
          v-model="recordType"
          :items="recordTypeItems"
          class="w-40"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Lookup"
        icon="i-lucide-globe"
        :loading="status === 'processing'"
        @click="lookup"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!rows.length"
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
      v-if="status === 'success'"
      class="space-y-2"
    >
      <p class="text-sm font-medium text-highlighted">
        Result
      </p>
      <ul
        v-if="rows.length"
        class="divide-y divide-default rounded-md border border-default"
      >
        <li
          v-for="(row, index) in rows"
          :key="`${index}-${row}`"
          class="px-3 py-2 font-mono text-sm text-highlighted"
        >
          {{ row }}
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-muted"
      >
        No records.
      </p>
    </div>

    <template #docs>
      <DataToolDocs title="About DNS lookup">
        <div class="space-y-4 text-muted">
          <p>
            A DNS lookup asks name servers for records for a domain.
          </p>
          <p>
            Enter a domain. Select a record type. Then select Lookup.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Headers', to: '/hub/network/http-headers' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
            { label: 'Redirect Checker', to: '/hub/network/redirect' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
