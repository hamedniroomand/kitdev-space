<script setup lang="ts">
import type { FindingLevel, SecurityHeaderReport } from '#shared/utils/network/security-headers'

interface RedirectHop {
  url: string
  status: number
  location?: string
}

interface HttpInspectResult {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
  hops: RedirectHop[]
  security: SecurityHeaderReport
}

type View = 'security' | 'headers' | 'redirects'

const VIEW_ITEMS: { label: string, value: View, icon: string }[] = [
  { label: 'Security', value: 'security', icon: 'i-lucide-shield-check' },
  { label: 'Headers', value: 'headers', icon: 'i-lucide-list-tree' },
  { label: 'Redirects', value: 'redirects', icon: 'i-lucide-route' },
]

const url = ref('')
const origin = ref('')
const usePreflight = ref(false)
const view = ref<View>('security')

const { status, error, result, run, reset } = useTool<HttpInspectResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('http-inspector')
const { reportInput } = useToolInput()

const headerRows = computed(() =>
  Object.entries(result.value?.headers ?? {}).map(([name, value]) => ({ name, value })),
)

const hopCount = computed(() => Math.max(0, (result.value?.hops.length ?? 1) - 1))

const scoreColor = computed(() => {
  const score = result.value?.security.score ?? 0
  return score >= 75 ? 'success' : score >= 50 ? 'warning' : 'error'
})

function levelColor(level: FindingLevel) {
  switch (level) {
    case 'ok':
      return 'success'
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
  }
}

async function inspect() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: HttpInspectResult }>('/api/network/headers', {
      method: 'POST',
      body: {
        url: url.value,
        origin: origin.value || undefined,
        method: usePreflight.value ? 'OPTIONS' : undefined,
      },
    })
    return data.result
  }, 'The request failed.')
}

async function handleCopy() {
  if (status.value !== 'success' || result.value === null) {
    return
  }
  await copy(JSON.stringify(result.value, null, 2))
}

function handleClear() {
  url.value = ''
  origin.value = ''
  usePreflight.value = false
  reset()
}

useToolShortcuts({
  onRun: () => inspect(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.fetch on the server. One request gives all three views."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField
        label="URL"
        class="min-w-56 flex-1"
      >
        <UInput
          v-model="url"
          placeholder="https://example.com"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField
        label="Request Origin"
        class="min-w-56 flex-1"
        hint="Sent as the Origin request header. Leave it empty to skip the CORS check."
      >
        <UInput
          v-model="origin"
          placeholder="https://app.example.com"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField
        label="CORS preflight"
        hint="Send OPTIONS."
      >
        <USwitch v-model="usePreflight" />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-search"
        :loading="status === 'processing'"
        @click="inspect"
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
      class="space-y-6"
    >
      <div class="flex flex-wrap items-center gap-3">
        <UBadge
          :color="scoreColor"
          variant="subtle"
          size="lg"
        >
          {{ result.security.score }}/100 · Grade {{ result.security.grade }}
        </UBadge>
        <p class="font-mono text-sm text-muted">
          {{ result.status }} {{ result.statusText }} · {{ headerRows.length }} headers ·
          {{ hopCount }} redirect{{ hopCount === 1 ? '' : 's' }}
        </p>
        <p class="break-all font-mono text-sm text-muted">
          {{ result.url }}
        </p>
      </div>

      <UTabs
        v-model="view"
        :items="VIEW_ITEMS"
        :content="false"
      />

      <section
        v-if="view === 'security'"
        class="space-y-6"
      >
        <div class="space-y-3">
          <h2 class="text-sm font-medium text-highlighted">
            CORS
          </h2>
          <div class="grid gap-2 sm:grid-cols-2">
            <p class="break-all font-mono text-sm text-muted">
              Allow-Origin: {{ result.security.cors.allowOrigin || '—' }}
            </p>
            <p class="break-all font-mono text-sm text-muted">
              Allow-Methods: {{ result.security.cors.allowMethods || '—' }}
            </p>
            <p class="break-all font-mono text-sm text-muted">
              Allow-Headers: {{ result.security.cors.allowHeaders || '—' }}
            </p>
            <p class="break-all font-mono text-sm text-muted">
              Allow-Credentials: {{ result.security.cors.allowCredentials || '—' }}
            </p>
            <p class="break-all font-mono text-sm text-muted">
              Expose-Headers: {{ result.security.cors.exposeHeaders || '—' }}
            </p>
            <p class="break-all font-mono text-sm text-muted">
              Max-Age: {{ result.security.cors.maxAge || '—' }}
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <h2 class="text-sm font-medium text-highlighted">
            Findings
          </h2>
          <ul class="divide-y divide-default rounded-md border border-default">
            <li
              v-for="item in result.security.findings"
              :key="item.id + item.header"
              class="space-y-2 px-3 py-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="levelColor(item.level)"
                  variant="subtle"
                  class="capitalize"
                >
                  {{ item.level }}
                </UBadge>
                <p class="text-sm font-medium text-highlighted">
                  {{ item.title }}
                </p>
                <p class="font-mono text-xs text-muted">
                  {{ item.header }}
                </p>
              </div>
              <p class="break-all text-sm text-muted">
                {{ item.detail }}
              </p>
              <p
                v-if="item.fix"
                class="text-sm text-highlighted"
              >
                Fix: {{ item.fix }}
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section
        v-else-if="view === 'headers'"
        class="space-y-2"
      >
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
      </section>

      <section
        v-else
        class="space-y-2"
      >
        <div
          v-if="result.hops.length"
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
                v-for="(hop, index) in result.hops"
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
                <td class="break-all px-3 py-2 font-mono text-muted">
                  {{ hop.location || '—' }}
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
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About the HTTP Inspector">
        <div class="space-y-4 text-muted">
          <p>
            This tool sends one request to a URL. It then shows three views of the answer: the security
            report, the response headers, and the redirect chain.
          </p>
          <p>
            The security view scores CSP, HSTS, X-Content-Type-Options, X-Frame-Options, and the
            Access-Control-Allow-* headers, and it gives a fix for each problem. The header view lists
            every response header. The redirect view lists each hop, with a maximum of 5.
          </p>
          <p>
            Enter a URL. To test CORS, set a request Origin. To send an OPTIONS preflight, turn on
            CORS preflight. Then select Inspect. The tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'TLS Inspector', to: '/hub/network/tls-inspector' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
