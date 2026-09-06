<script setup lang="ts">
import type { SecurityHeaderReport, FindingLevel } from '#shared/utils/network/security-headers'

type HeaderInspectResult = {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
  security: SecurityHeaderReport
}

const url = ref('https://example.com')
const origin = ref('https://app.example.com')
const usePreflight = ref(false)
const { status, error, result, run, reset } = useTool<HeaderInspectResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('security-headers')

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
  await run(async () => {
    const data = await $fetch<{ result: HeaderInspectResult }>('/api/network/headers', {
      method: 'POST',
      body: {
        url: url.value,
        mode: 'security',
        origin: origin.value || undefined,
        method: usePreflight.value ? 'OPTIONS' : undefined
      }
    })
    return data.result
  }, 'The request failed.')
}

async function handleCopy() {
  if (!result.value) {
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
        title="CORS and Security Header Inspector"
        description="Audit CORS and security headers. Get a health score and fix guidance."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool extends the HTTP headers API. Optional Origin and OPTIONS help diagnose CORS."
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
        hint="Sent as the Origin request header."
      >
        <UInput
          v-model="origin"
          placeholder="https://app.example.com"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField label="CORS preflight">
        <USwitch v-model="usePreflight" />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Inspect"
        icon="i-lucide-shield-check"
        :loading="status === 'processing'"
        @click="inspect"
      />
      <UButton
        :label="copyLabel('default', 'Copy JSON')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!result"
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
        <p class="text-2xl font-semibold text-highlighted">
          {{ result.security.score }}/100
        </p>
        <UBadge
          :color="result.security.score >= 75 ? 'success' : result.security.score >= 50 ? 'warning' : 'error'"
          variant="subtle"
          size="lg"
        >
          Grade {{ result.security.grade }}
        </UBadge>
        <p class="font-mono text-sm text-muted">
          {{ result.status }} {{ result.statusText }} · {{ result.url }}
        </p>
      </div>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          CORS
        </h2>
        <div class="grid gap-2 sm:grid-cols-2">
          <p class="font-mono text-sm text-muted">
            Allow-Origin: {{ result.security.cors.allowOrigin || '—' }}
          </p>
          <p class="font-mono text-sm text-muted">
            Allow-Methods: {{ result.security.cors.allowMethods || '—' }}
          </p>
          <p class="font-mono text-sm text-muted">
            Allow-Headers: {{ result.security.cors.allowHeaders || '—' }}
          </p>
          <p class="font-mono text-sm text-muted">
            Allow-Credentials: {{ result.security.cors.allowCredentials || '—' }}
          </p>
          <p class="font-mono text-sm text-muted">
            Expose-Headers: {{ result.security.cors.exposeHeaders || '—' }}
          </p>
          <p class="font-mono text-sm text-muted">
            Max-Age: {{ result.security.cors.maxAge || '—' }}
          </p>
        </div>
      </section>

      <section class="space-y-3">
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
      </section>
    </div>

    <template #docs>
      <DataToolDocs title="About CORS and security headers">
        <div class="space-y-4 text-muted">
          <p>
            This tool audits response headers for CORS and common browser security controls.
          </p>
          <p>
            It checks CSP, HSTS, X-Content-Type-Options, X-Frame-Options, and Access-Control-Allow-* headers.
          </p>
          <p>
            Enter a URL. Optionally set a request Origin. Enable CORS preflight to send OPTIONS.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Headers', to: '/hub/network/http-headers' },
            { label: 'Redirect Checker', to: '/hub/network/redirect' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
