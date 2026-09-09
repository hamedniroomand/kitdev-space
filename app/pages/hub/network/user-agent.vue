<script setup lang="ts">
import type { ClientHints } from '#shared/utils/network/user-agent'
import { computedAsync, useSupported } from '@vueuse/core'
import { normalizeClientHints, parseUserAgent, unknownUserAgentInfo } from '#shared/utils/network/user-agent'

useToolSeo('user-agent')

const input = ref('')
const { copy } = useCopyFeedback()

// A share link fills the input first. The local User Agent is the fallback.
// Keep this call above the `onMounted` hook below. `useToolQuery` restores the
// input in its own `onMounted` hook, and Vue runs the hooks in this order.
useToolQuery({ input })

const presets = [
  {
    label: 'My Browser',
    value: () => (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
  },
  {
    label: 'Chrome on macOS',
    value: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
  {
    label: 'Safari on iPhone',
    value: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Firefox on Windows',
    value: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  },
  {
    label: 'Googlebot',
    value: () => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
]

// `parseUserAgent` loads the parser library on demand, so the value is async.
const parsed = computedAsync(() => parseUserAgent(input.value), unknownUserAgentInfo())
useLiveTool(parsed)

// Client Hints come from the local browser. `navigator.userAgentData` is not in
// Safari and not in Firefox, so the value can stay empty.
const clientHintsSupported = useSupported(() => typeof navigator !== 'undefined' && 'userAgentData' in navigator)
const clientHints = ref<ClientHints | null>(null)

onMounted(() => {
  if (!input.value && navigator.userAgent) {
    input.value = navigator.userAgent
  }
  clientHints.value = normalizeClientHints((navigator as Navigator & { userAgentData?: unknown }).userAgentData)
})

const isLocalUserAgent = computed(
  () => typeof navigator !== 'undefined' && input.value.trim() === navigator.userAgent,
)

const exportResult = computed(() => ({
  userAgent: input.value.trim(),
  ...parsed.value,
  ...(isLocalUserAgent.value && clientHints.value ? { clientHints: clientHints.value } : {}),
}))

function handlePreset(getter: () => string) {
  input.value = getter()
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar with presets -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.label"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.value)"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ToolResultActions
            v-if="input.trim()"
            :result="exportResult"
            :input="input"
            tool-id="user-agent"
            filename="user-agent.json"
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

      <!-- Input -->
      <UFormField label="User Agent String">
        <UTextarea
          v-model="input"
          :rows="3"
          placeholder="Paste user agent string here..."
          class="font-mono text-sm w-full"
        />
      </UFormField>

      <!-- Analysis Results -->
      <div
        v-if="input.trim()"
        class="space-y-6"
      >
        <!-- Overview Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Browser"
            :value="parsed.browser.name"
            :description="parsed.browser.version ? `v${parsed.browser.version}` : undefined"
            color="primary"
          />
          <StatCard
            label="Operating System"
            :value="parsed.os.name"
            :description="parsed.os.version ? parsed.os.version : undefined"
          />
          <StatCard
            label="Device Type"
            :value="parsed.device.type"
            :description="parsed.device.model ? parsed.device.model : undefined"
          />
          <StatCard
            label="Client Type"
            :value="parsed.isBot ? 'Bot / Crawler' : 'User Browser'"
            :description="parsed.browser.type || undefined"
            :color="parsed.isBot ? 'warning' : 'success'"
          />
        </div>

        <!-- Details Table -->
        <div class="border border-default rounded-xl overflow-hidden">
          <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
            Parsed Components
          </div>
          <table class="w-full text-left text-sm border-collapse">
            <tbody class="divide-y divide-default">
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted w-1/3">
                  Browser Name
                </td>
                <td class="p-3 font-semibold text-default">
                  {{ parsed.browser.name }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.browser.name)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Browser Version
                </td>
                <td class="p-3 font-mono text-default">
                  {{ parsed.browser.version || 'Unknown' }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    :disabled="!parsed.browser.version"
                    @click="copy(parsed.browser.version)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Operating System
                </td>
                <td class="p-3 font-semibold text-default">
                  {{ parsed.os.name }} {{ parsed.os.version }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(`${parsed.os.name} ${parsed.os.version}`.trim())"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Rendering Engine
                </td>
                <td class="p-3 font-mono text-default">
                  {{ parsed.engine.name }} {{ parsed.engine.version }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.engine.name)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Device Category
                </td>
                <td class="p-3 font-mono text-default capitalize">
                  {{ parsed.device.type }} {{ parsed.device.model ? `(${parsed.device.model})` : '' }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.device.type)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UAlert
          v-if="parsed.isFrozen"
          color="warning"
          variant="subtle"
          icon="i-lucide-snowflake"
          title="The string holds a frozen version"
          description="The browser sends a fixed platform version and a fixed WebKit version. Read the Client Hints to get the true values."
        />

        <!-- Client Hints of the local browser -->
        <div
          v-if="isLocalUserAgent"
          class="border border-default rounded-xl overflow-hidden"
        >
          <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm flex items-center gap-2">
            <UIcon name="i-lucide-badge-info" />
            Client Hints of this browser
          </div>

          <div
            v-if="clientHints"
            class="p-3 space-y-3 text-sm"
          >
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="brand in clientHints.brands"
                :key="brand.brand"
                color="neutral"
                variant="subtle"
                class="font-mono"
              >
                {{ brand.brand }} {{ brand.version }}
              </UBadge>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <span class="text-xs text-muted font-medium block">Platform</span>
                <span class="font-mono text-default">{{ clientHints.platform }}</span>
              </div>
              <div>
                <span class="text-xs text-muted font-medium block">Mobile</span>
                <span class="font-mono text-default">{{ clientHints.mobile ? 'Yes' : 'No' }}</span>
              </div>
            </div>
          </div>

          <p
            v-else
            class="p-3 text-sm text-muted"
          >
            {{ clientHintsSupported ? 'This browser gives no Client Hints values.' : 'This browser has no navigator.userAgentData. Safari and Firefox do not support Client Hints.' }}
          </p>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About User Agent strings">
        <div class="space-y-4 text-muted">
          <p>
            A browser sends a User Agent string with each request. This tool separates it into the browser, the version, the engine, the operating system, and the device type.
          </p>
          <p>
            The string is not reliable. Every browser holds the names of older browsers for compatibility, and a user can change the value. Use it for analytics and for a support ticket. Do not use it to decide a feature; test for the feature itself.
          </p>
          <p>
            Paste a string from a log file or from a bug report to see which client made the request.
          </p>
          <h3 class="text-default font-medium">
            User Agent reduction
          </h3>
          <p>
            Chrome and Edge send a shorter string. This is User Agent reduction. The string keeps the browser name and the major version. It drops the minor version, and it gives a fixed value for the platform version and for the device model. Chrome on macOS always sends <code>Mac OS X 10_15_7</code>. Chrome on Windows always sends <code>Windows NT 10.0</code>. Chrome on Android always sends <code>Android 10</code> and the model <code>K</code>.
          </p>
          <h3 class="text-default font-medium">
            Frozen versions
          </h3>
          <p>
            The string also holds frozen tokens. <code>AppleWebKit/537.36</code> and <code>Safari/537.36</code> do not change, and Chrome keeps <code>Mozilla/5.0</code> from an old browser. Do not read a frozen token as a true version. The tool shows a warning when it finds a frozen string.
          </p>
          <h3 class="text-default font-medium">
            Client Hints
          </h3>
          <p>
            User Agent Client Hints give the true values. The browser puts them in <code>navigator.userAgentData</code>, and it sends them in the <code>Sec-CH-UA</code> request headers. The tool shows the low entropy values of your browser: the brand list, the platform, and the mobile flag. The values stay in your browser. Safari and Firefox do not support Client Hints, so the tool shows a note there.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'IP Address Info', to: '/hub/network/ip-info' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
