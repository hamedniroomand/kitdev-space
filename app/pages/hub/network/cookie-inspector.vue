<script setup lang="ts">
import type { FindingLevel } from '#shared/utils/network/cookie'
import { inspectCookies } from '#shared/utils/network/cookie'

useToolSeo('cookie-inspector')

const SAMPLE = [
  'Set-Cookie: session=eyJhbGciOiJIUzI1NiJ9.e30.abc; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600',
  'Set-Cookie: theme=dark; Path=/; SameSite=None',
  'Set-Cookie: __Host-csrf=9f2c; Path=/; Domain=example.com; Secure'
].join('\n')

const presets: { label: string, value: string }[] = [
  { label: 'Sample headers', value: SAMPLE },
  { label: 'Secure session cookie', value: 'Set-Cookie: sid=abc123; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400' },
  { label: 'Request header', value: 'Cookie: sid=abc123; theme=dark; consent=1' }
]

const input = ref(SAMPLE)
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const report = computed(() => inspectCookies(input.value))
const total = computed(() => report.value.setCookies.length + report.value.requestCookies.length)

const LEVEL_COLOR: Record<FindingLevel, 'error' | 'warning' | 'info'> = {
  error: 'error',
  warning: 'warning',
  info: 'info'
}

const LEVEL_ICON: Record<FindingLevel, string> = {
  error: 'i-lucide-circle-x',
  warning: 'i-lucide-triangle-alert',
  info: 'i-lucide-info'
}

function lifetimeLabel(seconds: number | null): string {
  if (seconds === null) {
    return 'Session. The cookie ends when the browser closes.'
  }
  if (seconds <= 0) {
    return 'Expired. This header deletes the cookie.'
  }
  const days = seconds / 86400
  if (days >= 1) {
    return `${Math.round(days * 10) / 10} days`
  }
  const hours = seconds / 3600
  if (hours >= 1) {
    return `${Math.round(hours * 10) / 10} hours`
  }
  return `${seconds} seconds`
}

async function handleCopy() {
  await copy(JSON.stringify(report.value, null, 2))
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The headers stay in your browser"
      description="The parser runs on your device. Paste a header from a response, nothing is sent anywhere."
    />

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-medium text-muted">Presets:</span>
      <UButton
        v-for="preset in presets"
        :key="preset.label"
        size="xs"
        color="neutral"
        variant="ghost"
        :label="preset.label"
        @click="input = preset.value"
      />
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Headers, one per line"
      placeholder="Set-Cookie: name=value; Path=/; Secure; HttpOnly; SameSite=Lax"
      :rows="6"
    />

    <ToolActions>
      <UButton
        :label="copyLabel('default', 'Copy the report as JSON')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="total === 0"
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

    <p
      v-if="input.trim() && total === 0"
      class="text-sm text-muted"
    >
      No cookie found. Paste one header per line, such as
      <code class="font-mono">Set-Cookie: name=value; Path=/</code>.
    </p>

    <section
      v-for="(cookie, index) in report.setCookies"
      :key="`set-${index}-${cookie.name}`"
      class="space-y-4 rounded-md border border-default bg-elevated/40 p-4"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-muted">
            Set-Cookie
          </p>
          <h2 class="break-all font-mono text-base text-highlighted">
            {{ cookie.name || '(no name)' }}
          </h2>
          <p class="break-all font-mono text-sm text-muted">
            {{ cookie.value || '(empty value)' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge
            :color="cookie.secure ? 'success' : 'warning'"
            variant="subtle"
          >
            {{ cookie.secure ? 'Secure' : 'No Secure' }}
          </UBadge>
          <UBadge
            :color="cookie.httpOnly ? 'success' : 'warning'"
            variant="subtle"
          >
            {{ cookie.httpOnly ? 'HttpOnly' : 'No HttpOnly' }}
          </UBadge>
          <UBadge
            :color="cookie.sameSite ? 'success' : 'warning'"
            variant="subtle"
          >
            {{ cookie.sameSite ? `SameSite=${cookie.sameSite}` : 'No SameSite' }}
          </UBadge>
          <UBadge
            v-if="cookie.partitioned"
            color="neutral"
            variant="subtle"
          >
            Partitioned
          </UBadge>
        </div>
      </div>

      <dl class="grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt class="text-xs text-muted">
            Domain
          </dt>
          <dd class="break-all font-mono text-highlighted">
            {{ cookie.domain ?? 'host only' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Path
          </dt>
          <dd class="break-all font-mono text-highlighted">
            {{ cookie.path ?? 'default' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Lifetime
          </dt>
          <dd class="text-highlighted">
            {{ lifetimeLabel(cookie.lifetimeSeconds) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Size
          </dt>
          <dd class="font-mono text-highlighted">
            {{ cookie.size }} bytes
          </dd>
        </div>
      </dl>

      <ul
        v-if="cookie.findings.length"
        class="space-y-2"
      >
        <li
          v-for="(finding, findingIndex) in cookie.findings"
          :key="findingIndex"
          class="flex items-start gap-2 text-sm"
        >
          <UIcon
            :name="LEVEL_ICON[finding.level]"
            class="mt-0.5 size-4 shrink-0"
            :class="`text-${LEVEL_COLOR[finding.level]}`"
          />
          <span class="text-muted">{{ finding.message }}</span>
        </li>
      </ul>
      <p
        v-else
        class="flex items-center gap-2 text-sm text-success"
      >
        <UIcon
          name="i-lucide-circle-check"
          class="size-4"
        />
        No finding. The attributes follow current browser rules.
      </p>
    </section>

    <section
      v-if="report.requestCookies.length"
      class="space-y-3 rounded-md border border-default bg-elevated/40 p-4"
    >
      <h2 class="text-sm font-medium text-highlighted">
        Cookie request header · {{ report.requestCookies.length }} cookies
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-left text-xs text-muted">
              <th class="py-2 pr-4 font-medium">
                Name
              </th>
              <th class="py-2 font-medium">
                Value
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(cookie, index) in report.requestCookies"
              :key="`req-${index}-${cookie.name}`"
            >
              <td class="py-2 pr-4 font-mono text-highlighted">
                {{ cookie.name }}
              </td>
              <td class="break-all py-2 font-mono text-muted">
                {{ cookie.value || '(empty)' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-muted">
        A request header carries names and values only. The attributes live in the Set-Cookie response
        header, so the checks apply to Set-Cookie lines.
      </p>
    </section>

    <template #docs>
      <ToolDocs title="About cookie headers">
        <div class="space-y-4 text-muted">
          <p>
            A server sets a cookie with a Set-Cookie response header. The header holds the name, the
            value, and the attributes that control where the browser sends the cookie and for how long.
            A browser sends the cookie back in a Cookie request header, with the names and the values only.
          </p>
          <p>
            Three attributes decide the safety of a cookie. Secure keeps it off plain HTTP. HttpOnly keeps
            it away from script, so an XSS bug cannot read it. SameSite controls whether another site can
            make the browser send it. SameSite=None needs Secure, or the browser rejects the cookie.
          </p>
          <p>
            The __Host- prefix is the strictest form: it needs Secure, Path=/, and no Domain, so a
            subdomain cannot overwrite it. The tool checks these rules, the 400 day cap that Chrome puts on
            the lifetime, and the 4096 byte limit that every browser applies.
          </p>
          <p>
            Paste one header per line. Copy the header from the Network panel of the browser, from a curl
            response, or from the HTTP Inspector on this site. The parser runs in your browser.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
