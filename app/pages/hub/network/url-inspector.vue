<script setup lang="ts">
import type { UrlParts, UrlQueryParam } from '#shared/utils/network/url'
import { isTrackingParam, stripTrackingParams } from '#shared/utils/network/tracking-params'
import { buildUrlWithParams, inspectUrl, maskUrlCredentials, maskUrlParts } from '#shared/utils/network/url'

const input = ref('https://user:pass@example.com:8443/path?q=hello+world&q=2&utm_source=news#top')
const revealCredentials = ref(false)
const rows = ref<UrlQueryParam[]>([])

const { status, error, result, run, reset } = useTool<UrlParts>()

useToolSeo('url-inspector')
useToolQuery({ input })
const { reportInput } = useToolInput()

const rebuiltUrl = computed(() => (result.value ? buildUrlWithParams(result.value.href, rows.value) : ''))

const activeParts = computed<UrlParts | null>(() => {
  if (status.value !== 'success' || !result.value) {
    return null
  }
  try {
    return inspectUrl(rebuiltUrl.value)
  }
  catch {
    return result.value
  }
})

// Every rendered value and every export comes from this one masked source.
const displayParts = computed<UrlParts | null>(() => {
  if (!activeParts.value) {
    return null
  }
  return revealCredentials.value ? activeParts.value : maskUrlParts(activeParts.value)
})

const hasCredentials = computed(() => Boolean(activeParts.value?.username || activeParts.value?.password))

// A share link never carries credentials, even when the user reveals them.
const shareInput = computed(() => maskUrlCredentials(rebuiltUrl.value || input.value))

const fieldRows = computed(() => {
  const parts = displayParts.value
  if (!parts) {
    return []
  }
  return [
    { name: 'href', value: parts.href },
    { name: 'protocol', value: parts.protocol },
    { name: 'username', value: parts.username },
    { name: 'password', value: parts.password },
    { name: 'host', value: parts.host },
    { name: 'hostname', value: parts.hostname },
    { name: 'port', value: parts.port },
    { name: 'pathname', value: parts.pathname },
    { name: 'pathnameDecoded', value: parts.pathnameDecoded },
    { name: 'search', value: parts.search },
    { name: 'hash', value: parts.hash },
  ]
})

async function inspect() {
  reportInput('url')
  await run(() => inspectUrl(input.value))
  if (status.value === 'success' && result.value) {
    rows.value = result.value.params.map(param => ({ ...param }))
  }
}

const trackingCount = computed(() => rows.value.filter(param => isTrackingParam(param.key)).length)

function removeTracking() {
  rows.value = stripTrackingParams(rows.value).params
}

function handleClear() {
  input.value = ''
  rows.value = []
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

    <template v-if="displayParts">
      <ToolResultRow
        label="Rebuilt URL"
        :value="displayParts.href"
        description="The URL with your parameter edits"
      />

      <ToolResultActions
        :result="displayParts"
        :input="shareInput"
        tool-id="url-inspector"
        filename="url-inspector.json"
      />

      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-highlighted">
            Query parameters
          </h2>
          <UButton
            label="Remove tracking parameters"
            size="xs"
            color="neutral"
            variant="subtle"
            icon="i-lucide-filter-x"
            :disabled="trackingCount === 0"
            @click="removeTracking"
          />
        </div>
        <UrlParamTable v-model="rows" />
      </div>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-highlighted">
            URL fields
          </h2>
          <USwitch
            v-if="hasCredentials"
            v-model="revealCredentials"
            label="Show credentials"
            aria-label="Show the user name and the password"
          />
        </div>

        <div class="overflow-x-auto rounded-md border border-default">
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
      </div>
    </template>

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
            Each query parameter is one row. A key that occurs two times keeps two rows. Edit a row,
            add a row, remove a row, or move a row. The rebuilt URL changes with each edit.
          </p>
          <p>
            The raw column shows the percent-encoded text from the URL. The decoded column shows the
            same text after a decode. In a query, a plus sign is a space. In a path, a plus sign
            stays a plus sign.
          </p>
          <p>
            The tool masks a user name and a password in the fields, in the rebuilt URL, and in the
            JSON output. Set Show credentials to see them. A share link keeps the mask.
          </p>
          <p>
            Select Remove tracking parameters to delete keys such as
            <code>utm_source</code>, <code>fbclid</code>, and <code>gclid</code>. A key that an
            application can use, such as <code>ref</code> or <code>id</code>, stays. Then select
            Share to make a link to the clean URL.
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
