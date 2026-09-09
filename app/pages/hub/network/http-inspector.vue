<script setup lang="ts">
import type { HttpInspectResult } from '#shared/utils/network/http-report'
import { diffHttpReports, parseHttpReport } from '#shared/utils/network/http-diff'
import { buildHttpReport } from '#shared/utils/network/http-report'
import { groupFindingsBySeverity } from '#shared/utils/network/security-headers'

type View = 'security' | 'headers' | 'redirects' | 'compare'

const VIEW_ITEMS: { label: string, value: View, icon: string }[] = [
  { label: 'Security', value: 'security', icon: 'i-lucide-shield-check' },
  { label: 'Headers', value: 'headers', icon: 'i-lucide-list-tree' },
  { label: 'Redirects', value: 'redirects', icon: 'i-lucide-route' },
  { label: 'Compare', value: 'compare', icon: 'i-lucide-git-compare-arrows' },
]

const url = ref('')
const view = ref<View>('security')

const PREFLIGHT_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']

// One stable object. The share action reads it and writes it to the query string.
const options = reactive({
  origin: '',
  preflight: false,
  requestMethod: 'GET',
})

// A preflight needs an Origin. Without it the request is not a CORS request.
const canPreflight = computed(() => options.origin.trim().length > 0)

const { status, error, result, run, reset } = useTool<HttpInspectResult>()

useToolSeo('http-inspector')
const { reportInput } = useToolInput()

const headerRows = computed(() =>
  Object.entries(result.value?.headers ?? {}).map(([name, value]) => ({ name, value })),
)

// One line for each Set-Cookie value of the response. The Cookie Inspector
// reads the same text.
const setCookieLines = computed(() =>
  (result.value?.headers['set-cookie'] ?? '').split('\n').filter(Boolean),
)

const hopCount = computed(() => Math.max(0, (result.value?.hops.length ?? 1) - 1))

const scoreColor = computed(() => {
  const score = result.value?.security.score ?? 0
  return score >= 75 ? 'success' : score >= 50 ? 'warning' : 'error'
})

const findingGroups = computed(() =>
  groupFindingsBySeverity(result.value?.security.findings ?? []),
)

/** The JSON file of the Download JSON action, and the input of the diff view. */
const report = computed(() => (result.value ? buildHttpReport(result.value) : null))

// The comparison runs in the browser. The prior report never goes to the server.
const priorText = ref('')
const priorReport = computed(() => (priorText.value.trim() ? parseHttpReport(priorText.value) : null))
const priorError = computed(() =>
  priorText.value.trim() && !priorReport.value ? 'This file is not an HTTP Inspector report.' : null,
)
const diff = computed(() =>
  priorReport.value && report.value ? diffHttpReports(priorReport.value, report.value) : null,
)

async function inspect() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: HttpInspectResult }>('/api/network/headers', {
      method: 'POST',
      body: {
        url: url.value,
        origin: options.origin || undefined,
        method: options.preflight && canPreflight.value ? 'OPTIONS' : undefined,
        requestMethod: options.requestMethod,
      },
    })
    return data.result
  }, 'The request failed.')
}

function handleClear() {
  url.value = ''
  options.origin = ''
  options.preflight = false
  options.requestMethod = 'GET'
  priorText.value = ''
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
      description="This tool uses Bun.fetch on the server. One request gives the security report, the headers, and the redirect chain. The comparison runs in your browser."
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
          v-model="options.origin"
          placeholder="https://app.example.com"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField
        label="Request Method"
        hint="Sent as Access-Control-Request-Method."
      >
        <USelect
          v-model="options.requestMethod"
          :items="PREFLIGHT_METHODS"
          :disabled="!canPreflight"
          class="w-32"
        />
      </UFormField>
      <UFormField
        label="CORS preflight"
        :hint="canPreflight ? 'Send OPTIONS.' : 'Enter a request Origin first.'"
      >
        <USwitch
          v-model="options.preflight"
          :disabled="!canPreflight"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-search"
        :loading="status === 'processing'"
        @click="inspect"
      />
      <ToolResultActions
        :result="report"
        :input="url"
        tool-id="http-inspector"
        filename="http-inspector.json"
        :options="options"
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
          <HttpFindingGroups :groups="findingGroups" />
        </div>
      </section>

      <section
        v-else-if="view === 'headers'"
        class="space-y-4"
      >
        <div
          v-if="setCookieLines.length"
          class="space-y-1"
        >
          <h2 class="text-sm font-medium text-highlighted">
            Set-Cookie
          </h2>
          <p
            v-for="(cookie, index) in setCookieLines"
            :key="index"
            class="break-all font-mono text-sm text-muted"
          >
            {{ cookie }}
          </p>
        </div>

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
                <td class="whitespace-pre-line break-all px-3 py-2 font-mono text-highlighted">
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
        v-else-if="view === 'redirects'"
        class="space-y-2"
      >
        <HttpRedirectTable :hops="result.hops" />
        <p class="text-sm text-muted">
          The tool follows at most 10 redirects. It stops when a Location points back to a URL that
          is already in the chain.
        </p>
      </section>

      <section
        v-else
        class="space-y-4"
      >
        <LazyToolEditor
          v-model="priorText"
          hydrate-on-idle
          label="Prior report"
          lang="json"
          :rows="8"
          accept="application/json,.json"
          placeholder="Drop a report file here, or paste the JSON of an earlier check."
        />

        <ToolError
          v-if="priorError"
          :message="priorError"
        />

        <HttpReportDiff
          v-else-if="diff"
          :diff="diff"
        />

        <p
          v-else
          class="text-sm text-muted"
        >
          Drop an earlier report to see the added, resolved, and modified findings.
        </p>
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About the HTTP Inspector">
        <div class="space-y-4 text-muted">
          <p>
            This tool sends one request to a URL. It then shows four views of the answer: the
            security report, the response headers, the redirect chain, and a comparison with an
            earlier report.
          </p>
          <p>
            The security view groups the findings into Critical, Warning, Info, and Pass, and it
            gives a fix for each problem. It reads CSP directives, HSTS and its preload
            requirements, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
            Permissions-Policy, the three Cross-Origin-* policies, the deprecated
            X-XSS-Protection header, the Server and X-Powered-By values, Cache-Control on an HTML
            response, and the Access-Control-Allow-* headers.
          </p>
          <p>
            The header view lists every response header, and it lists each Set-Cookie value on its
            own line. The redirect view lists each hop with its status, its time, and its headers.
            It follows at most 10 redirects, and it stops on a loop.
          </p>
          <p>
            Enter a URL. To test CORS, set a request Origin, select a request method, and turn on
            CORS preflight. Then select Inspect. Select Download JSON to save the report with the
            time of the check, the URL, the method, and the raw header map. To see what changed,
            open Compare and drop an earlier report file. The comparison runs in your browser. The
            tool does not store your input.
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
