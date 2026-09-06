<script setup lang="ts">
import type { EmailHealthResult, HealthIssue, HealthLevel } from '#shared/utils/network/email-health'
import { DEFAULT_DKIM_SELECTORS } from '#shared/utils/network/email-health'

const domain = ref('')
const dkimSelectors = ref(DEFAULT_DKIM_SELECTORS.join(', '))
const { status, error, result, run, reset } = useTool<EmailHealthResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('email-health')
const { reportInput } = useToolInput()

function badgeColor(level: HealthLevel) {
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

function badgeLabel(issue: HealthIssue) {
  return issue.level === 'ok' ? 'OK' : issue.level
}

async function inspect() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: EmailHealthResult }>('/api/network/dns', {
      method: 'POST',
      body: {
        domain: domain.value,
        mode: 'email-health',
        dkimSelectors: dkimSelectors.value,
      },
    })
    return data.result
  }, 'The lookup failed.')
}

async function handleCopy() {
  if (status.value !== 'success' || result.value === null) {
    return
  }
  await copy(JSON.stringify(result.value, null, 2))
}

function handleClear() {
  domain.value = ''
  dkimSelectors.value = DEFAULT_DKIM_SELECTORS.join(', ')
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      inspect()
    },
  },
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.dns on the server through the DNS API."
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
      <UFormField
        label="DKIM selectors"
        class="min-w-56 flex-1"
        hint="Comma-separated. Default selectors are checked when empty."
      >
        <UInput
          v-model="dkimSelectors"
          placeholder="default, google, selector1"
          class="w-full"
          :ui="{ base: 'font-mono' }"
        />
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
      <section class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            SPF
          </h2>
          <UBadge
            v-for="issue in result.spf.issues"
            :key="`spf-${issue.code}`"
            :color="badgeColor(issue.level)"
            variant="subtle"
            class="capitalize"
          >
            {{ badgeLabel(issue) }}
          </UBadge>
        </div>
        <p
          v-for="issue in result.spf.issues"
          :key="`spf-msg-${issue.code}`"
          class="text-sm text-muted"
        >
          {{ issue.message }}
        </p>
        <ul
          v-if="result.spf.raw.length"
          class="divide-y divide-default rounded-md border border-default"
        >
          <li
            v-for="(row, index) in result.spf.raw"
            :key="`spf-raw-${index}`"
            class="px-3 py-2 font-mono text-sm text-highlighted"
          >
            {{ row }}
          </li>
        </ul>
        <div
          v-if="result.spf.mechanisms.length"
          class="space-y-2"
        >
          <p class="text-sm font-medium text-highlighted">
            Permissions
          </p>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="(mechanism, index) in result.spf.mechanisms"
              :key="`spf-mech-${index}`"
            >
              <UBadge
                color="neutral"
                variant="subtle"
                class="font-mono"
              >
                {{ mechanism.raw }}
              </UBadge>
            </li>
          </ul>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            DKIM
          </h2>
          <UBadge
            v-for="issue in result.dkim.issues"
            :key="`dkim-${issue.code}`"
            :color="badgeColor(issue.level)"
            variant="subtle"
            class="capitalize"
          >
            {{ badgeLabel(issue) }}
          </UBadge>
        </div>
        <p
          v-for="issue in result.dkim.issues"
          :key="`dkim-msg-${issue.code}`"
          class="text-sm text-muted"
        >
          {{ issue.message }}
        </p>
        <ul class="divide-y divide-default rounded-md border border-default">
          <li
            v-for="selector in result.dkim.selectors"
            :key="selector.selector"
            class="flex flex-wrap items-start justify-between gap-3 px-3 py-2"
          >
            <div class="space-y-1">
              <p class="font-mono text-sm text-highlighted">
                {{ selector.selector }}._domainkey.{{ result.domain }}
              </p>
              <p
                v-for="issue in selector.issues"
                :key="`${selector.selector}-${issue.code}`"
                class="text-sm text-muted"
              >
                {{ issue.message }}
              </p>
            </div>
            <UBadge
              :color="selector.present ? 'success' : 'warning'"
              variant="subtle"
            >
              {{ selector.present ? 'Present' : 'Missing' }}
            </UBadge>
          </li>
        </ul>
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            DMARC
          </h2>
          <UBadge
            v-for="issue in result.dmarc.issues"
            :key="`dmarc-${issue.code}`"
            :color="badgeColor(issue.level)"
            variant="subtle"
            class="capitalize"
          >
            {{ badgeLabel(issue) }}
          </UBadge>
        </div>
        <p
          v-for="issue in result.dmarc.issues"
          :key="`dmarc-msg-${issue.code}`"
          class="text-sm text-muted"
        >
          {{ issue.message }}
        </p>
        <ul
          v-if="result.dmarc.raw.length"
          class="divide-y divide-default rounded-md border border-default"
        >
          <li
            v-for="(row, index) in result.dmarc.raw"
            :key="`dmarc-raw-${index}`"
            class="break-all px-3 py-2 font-mono text-sm text-highlighted"
          >
            {{ row }}
          </li>
        </ul>
        <p
          v-else
          class="font-mono text-sm text-muted"
        >
          _dmarc.{{ result.domain }}
        </p>
        <dl
          v-if="result.dmarc.present"
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              Policy
            </dt>
            <dd class="font-mono text-sm text-highlighted">
              {{ result.dmarc.policy ?? '—' }}
            </dd>
          </div>
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              Subdomain policy
            </dt>
            <dd class="font-mono text-sm text-highlighted">
              {{ result.dmarc.subdomainPolicy ?? 'inherits' }}
            </dd>
          </div>
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              Coverage
            </dt>
            <dd class="font-mono text-sm text-highlighted">
              {{ result.dmarc.percent }}%
            </dd>
          </div>
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              Aggregate reports
            </dt>
            <dd class="break-all font-mono text-sm text-highlighted">
              {{ result.dmarc.aggregateReportUris.join(', ') || '—' }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            MX
          </h2>
          <UBadge
            v-for="issue in result.mx.issues"
            :key="`mx-${issue.code}`"
            :color="badgeColor(issue.level)"
            variant="subtle"
            class="capitalize"
          >
            {{ badgeLabel(issue) }}
          </UBadge>
        </div>
        <p
          v-for="issue in result.mx.issues"
          :key="`mx-msg-${issue.code}`"
          class="text-sm text-muted"
        >
          {{ issue.message }}
        </p>
        <div
          v-if="result.mx.records.length"
          class="overflow-x-auto rounded-md border border-default"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default">
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Priority
                </th>
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Exchange
                </th>
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Warnings
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="(row, index) in result.mx.records"
                :key="`mx-${index}-${row.exchange}`"
              >
                <td class="px-3 py-2 font-mono text-highlighted">
                  {{ row.priority }}
                </td>
                <td class="break-all px-3 py-2 font-mono text-highlighted">
                  {{ row.exchange }}
                </td>
                <td class="px-3 py-2">
                  <div
                    v-if="row.issues.length"
                    class="flex flex-wrap gap-1"
                  >
                    <UBadge
                      v-for="issue in row.issues"
                      :key="`${row.exchange}-${issue.code}`"
                      :color="badgeColor(issue.level)"
                      variant="subtle"
                      :title="issue.message"
                    >
                      {{ issue.code.replace('mx-', '') }}
                    </UBadge>
                  </div>
                  <span
                    v-else
                    class="text-muted"
                  >—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-else
          class="text-sm text-muted"
        >
          No MX records.
        </p>
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About email health">
        <div class="space-y-4 text-muted">
          <p>
            This tool inspects email DNS records for a domain.
          </p>
          <p>
            It parses SPF permissions, checks DKIM selector records, reads the DMARC policy, and sorts MX
            hosts by priority.
          </p>
          <p>
            DMARC is the record that mailbox providers use. It tells them what to do when SPF and DKIM
            fail. A domain with p=none gets no protection.
          </p>
          <p>
            Enter a domain. Optionally set DKIM selectors. Then select Inspect.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
