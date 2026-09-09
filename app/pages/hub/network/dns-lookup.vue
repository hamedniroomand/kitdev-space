<script setup lang="ts">
import type { DnsRecordType, DnsSummary } from '#shared/utils/network/dns'
import { buildDigCommand, DNS_RECORD_TYPES } from '#shared/utils/network/dns'

const domain = ref('')
const options = reactive({ type: 'ALL' as DnsRecordType | 'ALL' })
const { status, error, result, run, reset } = useTool<DnsSummary>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const recordTypeItems = [
  { label: 'All records', value: 'ALL' },
  ...DNS_RECORD_TYPES.map(type => ({ label: type, value: type })),
]

useToolSeo('dns')
const { reportInput } = useToolInput()
useToolQuery({ input: domain, options })

const answers = computed(() => {
  const summary = result.value
  if (!summary) {
    return []
  }
  return options.type === 'ALL'
    ? summary.answers
    : summary.answers.filter(answer => answer.type === options.type)
})

const rows = computed(() => answers.value.flatMap(answer => answer.records))
const emptyAnswers = computed(() => answers.value.filter(answer => answer.status !== 'ok'))

const digCommand = computed(() => buildDigCommand(
  domain.value.trim(),
  options.type === 'ALL' ? DNS_RECORD_TYPES : [options.type],
))

async function lookup() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: DnsSummary }>('/api/network/dns', {
      method: 'POST',
      body: { domain: domain.value },
    })
    return data.result
  }, 'The lookup failed.', { option: options.type })
}

async function handleCopyDig() {
  await copy(digCommand.value, 'dig', 'snippet')
}

function handleClear() {
  domain.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => lookup(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.dns on the server. One lookup reads one resolver at one moment. Name servers can hold different records."
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
          v-model="options.type"
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
        :label="copyLabel('dig', 'Copy dig command')"
        :color="copyColor('dig')"
        variant="subtle"
        :icon="copyIcon('dig', 'i-lucide-terminal')"
        :disabled="!domain.trim()"
        @click="handleCopyDig"
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
      class="space-y-4"
    >
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Records"
          :value="rows.length"
        />
        <StatCard
          label="Query time"
          :value="result.elapsedMs"
          unit="ms"
        />
        <StatCard
          label="Resolver"
          :value="result.resolver"
          description="The resolver of the server"
        />
      </div>

      <ToolResultActions
        :result="result"
        :input="domain"
        tool-id="dns"
        filename="dns-lookup.json"
        :options="options"
      />

      <UAlert
        v-if="result.status !== 'ok'"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="result.status === 'nxdomain' ? 'Domain not found' : 'No answer'"
        :description="result.message"
      />

      <div
        v-if="rows.length"
        class="overflow-x-auto rounded-md border border-default"
      >
        <table class="w-full text-sm">
          <thead class="bg-elevated text-left text-xs text-muted uppercase">
            <tr>
              <th
                scope="col"
                class="px-3 py-2 font-medium"
              >
                Type
              </th>
              <th
                scope="col"
                class="px-3 py-2 font-medium"
              >
                Value
              </th>
              <th
                scope="col"
                class="px-3 py-2 font-medium"
              >
                TTL
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(row, index) in rows"
              :key="`${row.type}-${index}-${row.value}`"
            >
              <td class="px-3 py-2 font-mono text-xs text-muted">
                {{ row.type }}
              </td>
              <td class="px-3 py-2 font-mono break-all text-highlighted">
                {{ row.value }}
              </td>
              <td class="px-3 py-2 font-mono text-xs text-muted">
                {{ row.ttl === null ? '—' : `${row.ttl}s` }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul
        v-if="emptyAnswers.length"
        class="space-y-1 text-sm text-muted"
      >
        <li
          v-for="answer in emptyAnswers"
          :key="answer.type"
        >
          <span class="font-mono text-xs">{{ answer.type }}</span>
          — {{ answer.message }}
        </li>
      </ul>
    </div>

    <template #docs>
      <ToolDocs title="About DNS lookup">
        <div class="space-y-4 text-muted">
          <p>
            A DNS lookup asks name servers for records for a domain. One lookup reads A, AAAA,
            CNAME, MX, NS, SOA, TXT, and CAA records in one request.
          </p>
          <p>
            Enter a domain. Then select Lookup. Select a record type to filter the table.
          </p>
          <p>
            The result shows the TTL of each address record, the query time, and the IP address of
            the resolver. The resolver gives a TTL for A and AAAA records only.
          </p>
          <p>
            The table separates three conditions. A domain that does not exist shows NXDOMAIN. A
            domain with no record of one type shows a message for that type. A resolver error shows
            a failed lookup.
          </p>
          <p>
            Select Copy dig command to get the same query for your terminal. The server runs no
            shell command.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Email Health Inspector', to: '/hub/network/email-health' },
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
