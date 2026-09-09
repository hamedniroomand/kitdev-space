<script setup lang="ts">
import type { EmailHealthResult, HealthLevel } from '#shared/utils/network/email-health'
import { DEFAULT_DKIM_SELECTORS } from '#shared/utils/network/email-health'

const domain = ref('')
const dkimSelectors = ref(DEFAULT_DKIM_SELECTORS.join(', '))
const { status, error, result, run, reset } = useTool<EmailHealthResult>()

useToolSeo('email-health')
const { reportInput } = useToolInput()

const shareOptions = computed(() => ({ dkimSelectors: dkimSelectors.value }))

const policies = computed(() => {
  const data = result.value
  if (!data) {
    return []
  }
  return [
    { title: 'MTA-STS', report: data.mtaSts },
    { title: 'SMTP TLS Reporting', report: data.tlsRpt },
    { title: 'BIMI', report: data.bimi },
  ].filter(item => item.report !== undefined)
})

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

function handleClear() {
  domain.value = ''
  dkimSelectors.value = DEFAULT_DKIM_SELECTORS.join(', ')
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
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
      <ToolResultActions
        v-if="status === 'success' && result"
        :result="result"
        :input="domain"
        tool-id="email-health"
        :options="shareOptions"
        :filename="`email-health-${result.domain}.json`"
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
      <EmailScoreCard
        v-if="result.score"
        :score="result.score"
      />

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          SPF
        </h2>
        <EmailIssueList :issues="result.spf.issues" />
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
        <EmailSpfTrace
          v-if="result.spf.trace"
          :trace="result.spf.trace"
        />
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          DKIM
        </h2>
        <EmailIssueList :issues="result.dkim.issues" />
        <ul class="divide-y divide-default rounded-md border border-default">
          <li
            v-for="selector in result.dkim.selectors"
            :key="selector.selector"
            class="flex flex-wrap items-start justify-between gap-3 px-3 py-2"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <p class="font-mono text-sm break-all text-highlighted">
                {{ selector.selector }}._domainkey.{{ result.domain }}
              </p>
              <p
                v-if="selector.cname"
                class="font-mono text-xs break-all text-muted"
              >
                CNAME: {{ selector.cname }}
              </p>
              <div
                v-if="selector.key"
                class="flex flex-wrap gap-1"
              >
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="font-mono"
                >
                  k={{ selector.key.keyType }}
                </UBadge>
                <UBadge
                  v-if="selector.key.keyBits"
                  color="neutral"
                  variant="subtle"
                  class="font-mono"
                >
                  {{ selector.key.keyBits }}-bit
                </UBadge>
                <UBadge
                  v-for="flag in selector.key.flags"
                  :key="`${selector.selector}-t-${flag}`"
                  color="warning"
                  variant="subtle"
                  class="font-mono"
                >
                  t={{ flag }}
                </UBadge>
                <UBadge
                  v-if="selector.key.revoked"
                  color="error"
                  variant="subtle"
                >
                  Revoked
                </UBadge>
              </div>
              <EmailIssueList :issues="selector.issues" />
            </div>
            <UBadge
              :color="selector.present ? 'success' : 'warning'"
              variant="subtle"
            >
              {{ selector.present ? 'Present' : 'Missing' }}
            </UBadge>
          </li>
        </ul>
        <div
          v-if="result.dkim.skipped?.length"
          class="space-y-2"
        >
          <p class="text-sm font-medium text-highlighted">
            Not checked
          </p>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="item in result.dkim.skipped"
              :key="`skipped-${item.selector}`"
            >
              <UBadge
                color="neutral"
                variant="subtle"
                class="font-mono"
              >
                {{ item.selector }} · {{ item.provider }}
              </UBadge>
            </li>
          </ul>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          DMARC
        </h2>
        <EmailIssueList :issues="result.dmarc.issues" />
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
        <h2 class="text-sm font-medium text-highlighted">
          MX
        </h2>
        <EmailIssueList :issues="result.mx.issues" />
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

      <section
        v-if="policies.length"
        class="space-y-3"
      >
        <h2 class="text-sm font-medium text-highlighted">
          Transport and brand records
        </h2>
        <div
          v-for="policy in policies"
          :key="policy.title"
          class="space-y-2"
        >
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-medium text-highlighted">
              {{ policy.title }}
            </p>
            <span class="font-mono text-xs text-muted">{{ policy.report!.name }}</span>
            <UBadge
              :color="policy.report!.present ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ policy.report!.present ? 'Present' : 'Missing' }}
            </UBadge>
          </div>
          <p
            v-for="(row, index) in policy.report!.raw"
            :key="`${policy.title}-raw-${index}`"
            class="font-mono text-xs break-all text-highlighted"
          >
            {{ row }}
          </p>
          <EmailIssueList :issues="policy.report!.issues" />
        </div>
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About email health">
        <div class="space-y-4 text-muted">
          <p>
            This tool inspects email DNS records for a domain.
          </p>
          <p>
            It parses SPF permissions, traces each include and redirect, checks DKIM selector records,
            reads the DMARC policy, and sorts MX hosts by priority. It also reads the MTA-STS, SMTP TLS
            Reporting, and BIMI records.
          </p>
          <p>
            Each finding shows the observed DNS string, the effect on delivery, and one step that
            corrects it.
          </p>
          <p>
            The SPF trace stops at the RFC 7208 limit of 10 DNS lookups. It counts void lookups against
            the RFC limit of 2, and it flattens the authorized IPv4 and IPv6 ranges.
          </p>
          <p>
            The grade adds points for each check and shows the points of each one. It rates the DNS
            records only. It does not measure inbox placement, and it gives no delivery guarantee. The
            tool reads DNS only. It does not fetch the MTA-STS policy file over HTTPS, and it does not
            send test messages.
          </p>
          <p>
            A DKIM selector is a free label, so DNS gives no way to list every selector of a domain. The
            tool checks the selectors that you give, plus a short default list. It does not try hundreds
            of names. Read the s= tag in the DKIM-Signature header of a sent message to find your
            selector.
          </p>
          <p>
            A failed DNS query and an absent record are not the same. The tool marks a failed query as a
            warning, because the record status is then unknown.
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
