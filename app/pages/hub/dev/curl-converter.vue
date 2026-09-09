<script setup lang="ts">
import type { CurlTargetLanguage } from '#shared/utils/dev/curl-converter'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'
import { generateCode, parseCurl } from '#shared/utils/dev/curl-converter'
import { formatBytes } from '#shared/utils/format'

useToolSeo('curl-to-code')

const samplePostCurl = `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my-secret-token" \\
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'`

const sampleGetCurl = `curl "https://api.example.com/v1/items?limit=10" \\
  -H "Accept: application/json"`

const input = ref(samplePostCurl)
const target = ref<CurlTargetLanguage>('fetch')

const { copy, label, color, icon } = useCopyFeedback()

const languages: { label: string, value: CurlTargetLanguage, editorLang: ToolEditorLang }[] = [
  { label: 'Fetch', value: 'fetch', editorLang: 'javascript' },
  { label: 'Axios', value: 'axios', editorLang: 'javascript' },
  { label: 'Python Requests', value: 'python', editorLang: 'text' },
  { label: 'Go net/http', value: 'go', editorLang: 'text' },
]

const currentEditorLang = computed(() => {
  return languages.find(l => l.value === target.value)?.editorLang || 'text'
})

const maskCredentials = useToolOption('mask-credentials', false)

const parsed = computed(() => (input.value.trim() ? parseCurl(input.value) : null))

// A security notice comes first, because it changes what the request does.
const notices = computed(() => {
  return [...(parsed.value?.notices ?? [])].sort((a, b) => Number(b.security) - Number(a.security))
})

const summary = computed(() => {
  const request = parsed.value
  if (!request?.url) {
    return null
  }
  return {
    method: request.method,
    url: request.url,
    headers: Object.keys(request.headers).length,
    payload: formatBytes(new TextEncoder().encode(request.data ?? '').length),
  }
})

const conversion = computed(() => {
  if (!parsed.value)
    return { code: '', error: null }
  try {
    const code = generateCode(parsed.value, target.value, {
      maskCredentials: maskCredentials.value,
    })
    return { code, error: null }
  }
  catch (err) {
    return {
      code: '',
      error: err instanceof Error ? err.message : 'Failed to parse cURL command.',
    }
  }
})

function handleLoadSample(type: 'post' | 'get') {
  input.value = type === 'post' ? samplePostCurl : sampleGetCurl
}

function handleClear() {
  input.value = ''
}

function handleCopy() {
  if (conversion.value.code) {
    copy(conversion.value.code)
  }
}

useToolShortcuts({
  onCopy: handleCopy,
  onClear: handleClear,
})
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Target Language -->
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              v-for="l in languages"
              :key="l.value"
              size="xs"
              :variant="target === l.value ? 'solid' : 'ghost'"
              :color="target === l.value ? 'primary' : 'neutral'"
              :label="l.label"
              @click="target = l.value"
            />
          </div>

          <!-- Samples -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-code"
            label="Load POST Sample"
            @click="handleLoadSample('post')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-code"
            label="Load GET Sample"
            @click="handleLoadSample('get')"
          />

          <USwitch
            v-model="maskCredentials"
            label="Mask credentials"
            size="xs"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!conversion.code"
            @click="handleCopy"
          />
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="conversion.error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Parse Error"
        :description="conversion.error"
      />

      <!-- Request Summary -->
      <div
        v-if="summary"
        class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Method"
          :value="summary.method"
        />
        <StatCard
          label="Target URL"
          :value="summary.url"
          :title="summary.url"
        >
          <span class="mt-1 block truncate font-mono text-sm text-highlighted">{{ summary.url }}</span>
        </StatCard>
        <StatCard
          label="Headers"
          :value="summary.headers"
        />
        <StatCard
          label="Payload"
          :value="summary.payload"
        />
      </div>

      <!-- Dual Editors -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyToolEditor
          v-model="input"
          hydrate-on-idle
          label="cURL Command"
          lang="text"
          :rows="18"
          placeholder="Paste curl command here..."
        />

        <LazyToolEditor
          hydrate-on-idle
          :model-value="conversion.code"
          :label="`${languages.find(l => l.value === target)?.label || 'Generated'} Code`"
          :lang="currentEditorLang"
          :rows="18"
          readonly
          placeholder="Converted code appears here..."
        />
      </div>

      <!-- Ignored Options -->
      <UAlert
        v-if="notices.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Some cURL options are not in the code"
      >
        <template #description>
          <ul class="list-disc space-y-1 pl-4">
            <li
              v-for="notice in notices"
              :key="notice.flag"
            >
              <code class="font-mono text-highlighted">{{ notice.flag }}</code>
              <UBadge
                v-if="notice.security"
                label="Security"
                color="error"
                variant="subtle"
                size="sm"
                class="mx-1.5 align-middle"
              />
              <span :class="notice.security ? '' : 'ml-1.5'">{{ notice.message }}</span>
            </li>
          </ul>
        </template>
      </UAlert>
    </div>

    <template #docs>
      <ToolDocs title="About cURL conversion">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads a cURL command and writes the same request as code: Fetch, Axios, Python Requests, or Go. It keeps the method, the headers, the body, and the query values.
          </p>
          <p>
            A browser gives you a cURL command through Copy as cURL in the network panel. Paste it here to turn a request that you captured into working code.
          </p>
          <p>
            Check the command before you paste it. A captured request often holds a session cookie or an authorization header. Remove the secret, and never commit it.
          </p>
          <p>
            The card under the output names each cURL option that the code does not use. An option that changes the credentials, the proxy, or the TLS check gets a Security mark. Read the card, then add the same behavior to your client.
          </p>
          <p>
            The tool applies URL encoding to each <code>--data-urlencode</code> value. The tool reads no local file. A <code>@filename</code> value becomes a placeholder in the code, and you must put the file content in its place.
          </p>
          <p>
            The Mask credentials switch writes <code>&lt;redacted&gt;</code> in place of an authorization token, a cookie value, and a password. Turn it on before you share the code or a screenshot.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
