<script setup lang="ts">
import type { RdapResult } from '#shared/utils/network/types'
import { describeExpiry, EXPIRY_WARNING_DAYS, explainEppStatus } from '#shared/utils/network/epp-status'

/** The API adds the source of the answer. The server module holds the same shape. */
interface RdapLookupResult extends RdapResult {
  server?: string
  queriedAt?: string
  durationMs?: number
  redactedFields?: string[]
  referrals?: string[]
}

// The query is a domain name or an IP address, so it goes in the query string.
// The IP Info tool links to this page with `?ip=`.
const params = reactive({ query: 'github.com', ip: '' })
useToolQuery({ options: params })

if (params.ip) {
  params.query = params.ip
  params.ip = ''
}

const { status, error, result, run, reset } = useTool<RdapLookupResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('rdap-lookup')
const { reportInput } = useToolInput()

const expiryWarning = computed(() => {
  const days = result.value?.daysUntilExpiration
  if (!result.value?.found || days === undefined || days > EXPIRY_WARNING_DAYS) {
    return null
  }
  return describeExpiry(days)
})

const expiryLabel = computed(() => {
  const days = result.value?.daysUntilExpiration
  if (days === undefined) {
    return '—'
  }
  return days < 0 ? 'Expired' : `${days} days`
})

const redactedFields = computed(() => new Set(result.value?.redactedFields ?? []))

function isRedacted(label: string): boolean {
  return redactedFields.value.has(label)
}

const queriedAtLabel = useDateFormat(() => result.value?.queriedAt ?? '', 'YYYY-MM-DD HH:mm:ss')

const statusList = computed(() => (result.value?.status ?? []).map(code => ({
  code,
  text: explainEppStatus(code),
})))

async function lookup() {
  reportInput('url')
  if (!params.query.trim())
    return

  await run(async () => {
    const data = await $fetch<{ result: RdapLookupResult }>('/api/network/rdap', {
      method: 'POST',
      body: {
        query: params.query.trim(),
      },
    })
    return data.result
  }, 'The RDAP lookup failed.')
}

function handleCopy() {
  if (!result.value?.raw)
    return
  copy(JSON.stringify(result.value.raw, null, 2))
}

function handleReset() {
  params.query = ''
  reset()
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Search Input Section -->
      <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
        <UFormField label="Domain Name or IP Address">
          <div class="flex gap-2">
            <UInput
              v-model="params.query"
              placeholder="e.g. example.com or 1.1.1.1"
              icon="i-lucide-globe"
              class="w-full flex-1"
              @keydown.enter="lookup"
            />
            <UButton
              label="Lookup"
              icon="i-lucide-search"
              color="primary"
              size="sm"
              :loading="status === 'processing'"
              @click="lookup"
            />
          </div>
        </UFormField>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">Try:</span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="github.com"
              @click="params.query = 'github.com'; lookup()"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="google.com"
              @click="params.query = 'google.com'; lookup()"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="1.1.1.1"
              @click="params.query = '1.1.1.1'; lookup()"
            />
          </div>

          <ToolActions class="gap-2">
            <UButton
              label="Clear"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-eraser"
              :disabled="!params.query && !result"
              @click="handleReset"
            />
          </ToolActions>
        </div>
      </div>

      <!-- Error Alert -->
      <ToolError
        v-if="error"
        :message="error"
      />

      <!-- Results View -->
      <div
        v-if="result"
        class="space-y-6"
      >
        <!-- Unregistered / Available Notice -->
        <div
          v-if="!result.found"
          class="p-6 rounded-xl border border-info/40 bg-info/5 text-center space-y-2"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-8 h-8 text-info mx-auto"
          />
          <div class="text-base font-semibold text-default">
            {{ result.type === 'ip' ? `${result.query} is Not Allocated` : `${result.query} is Available` }}
          </div>
          <div class="text-xs text-muted">
            {{ result.type === 'ip' ? 'No active RDAP allocation records exist for this IP address.' : 'No active RDAP registration records exist for this query.' }}
          </div>
        </div>

        <!-- Registered Domain / IP Report -->
        <template v-else>
          <!-- Expiry Warning -->
          <UAlert
            v-if="expiryWarning"
            color="warning"
            variant="subtle"
            icon="i-lucide-calendar-clock"
            :title="expiryLabel === 'Expired' ? 'The registration expired' : 'The domain expires soon'"
            :description="expiryWarning"
          />

          <!-- Top Metric Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Registration Status
              </div>
              <div class="flex items-center gap-1.5 pt-1">
                <UBadge
                  size="md"
                  color="success"
                  variant="subtle"
                  class="font-semibold"
                >
                  Registered
                </UBadge>
                <UBadge
                  v-if="result.dnssec"
                  size="sm"
                  color="primary"
                  variant="outline"
                >
                  DNSSEC
                </UBadge>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Time Until Expiration
              </div>
              <div
                class="text-xl font-bold font-mono pt-1"
                :class="expiryWarning ? 'text-warning' : 'text-default'"
              >
                {{ expiryLabel }}
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Created On
              </div>
              <div class="text-sm font-semibold font-mono text-default pt-1">
                {{ result.registrationDate ? result.registrationDate.split('T')[0] : '—' }}
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Expires On
              </div>
              <div class="text-sm font-semibold font-mono text-default pt-1">
                {{ result.expirationDate ? result.expirationDate.split('T')[0] : '—' }}
              </div>
            </div>
          </div>

          <!-- Registrar & Status Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Registrar Card -->
            <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
              <h3 class="text-sm font-semibold text-default flex items-center gap-2">
                <UIcon
                  name="i-lucide-building-2"
                  class="w-4 h-4 text-primary"
                />
                Registrar Information
              </h3>

              <div class="space-y-2 text-xs">
                <RdapField
                  label="Name"
                  :value="result.registrar?.name"
                  :redacted="isRedacted('Name')"
                />
                <RdapField
                  label="IANA ID"
                  :value="result.registrar?.ianaId"
                />
                <RdapField
                  label="Abuse Email"
                  :value="result.registrar?.abuseEmail"
                  :redacted="isRedacted('Abuse Email')"
                />
                <RdapField
                  label="Abuse Phone"
                  :value="result.registrar?.abusePhone"
                  :redacted="isRedacted('Abuse Phone')"
                />
              </div>

              <div
                v-if="result.redactedFields?.length"
                class="pt-1 space-y-1"
              >
                <p class="text-xs text-muted">
                  The registry hides these fields for privacy. The data exists, but the registry does not publish it.
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="field in result.redactedFields"
                    :key="field"
                    size="xs"
                    color="warning"
                    variant="subtle"
                  >
                    {{ field }}
                  </UBadge>
                </div>
              </div>
            </div>

            <!-- Domain Status Codes & Dates -->
            <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
              <h3 class="text-sm font-semibold text-default flex items-center gap-2">
                <UIcon
                  name="i-lucide-activity"
                  class="w-4 h-4 text-primary"
                />
                Domain Status Flags
              </h3>

              <ul
                v-if="statusList.length > 0"
                class="space-y-2 max-h-56 overflow-y-auto"
              >
                <li
                  v-for="st in statusList"
                  :key="st.code"
                  class="space-y-1"
                >
                  <UBadge
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    class="font-mono text-[11px]"
                  >
                    {{ st.code }}
                  </UBadge>
                  <p class="text-xs text-muted">
                    {{ st.text }}
                  </p>
                </li>
              </ul>
              <p
                v-else
                class="text-xs text-muted"
              >
                The registry reports no status code.
              </p>

              <div
                v-if="result.updatedDate"
                class="pt-2 text-xs text-muted"
              >
                Last updated: <span class="font-mono text-default">{{ result.updatedDate.split('T')[0] }}</span>
              </div>
            </div>
          </div>

          <!-- Nameservers -->
          <div
            v-if="result.nameservers.length > 0"
            class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3"
          >
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-server"
                class="w-4 h-4 text-primary"
              />
              Authoritative Nameservers ({{ result.nameservers.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="ns in result.nameservers"
                :key="ns"
                size="xs"
                color="neutral"
                variant="outline"
                class="font-mono text-xs px-2.5 py-1"
              >
                {{ ns }}
              </UBadge>
            </div>
          </div>

          <!-- Raw RDAP JSON Section -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-default flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-file-json"
                  class="w-3.5 h-3.5 text-primary"
                />
                Raw RDAP Response
              </span>
              <UButton
                size="xs"
                variant="subtle"
                :label="copyLabel()"
                :color="copyColor()"
                :icon="copyIcon()"
                @click="handleCopy"
              />
            </div>
            <LazyToolEditor
              hydrate-on-idle
              :model-value="JSON.stringify(result.raw, null, 2)"
              label="RDAP JSON"
              lang="json"
              :rows="14"
              readonly
            />
          </div>
        </template>

        <!-- Query Source -->
        <div
          v-if="result.server"
          class="p-4 rounded-xl border border-default bg-elevated/10 space-y-2 text-xs"
        >
          <h3 class="text-sm font-semibold text-default flex items-center gap-2">
            <UIcon
              name="i-lucide-database"
              class="w-4 h-4 text-primary"
            />
            Query Source
          </h3>
          <div class="grid grid-cols-3 gap-1 py-1 border-b border-default">
            <span class="text-muted">RDAP server:</span>
            <span class="col-span-2 text-default font-mono break-all">{{ result.server }}</span>
          </div>
          <div
            v-if="result.queriedAt"
            class="grid grid-cols-3 gap-1 py-1 border-b border-default"
          >
            <span class="text-muted">Query time:</span>
            <span class="col-span-2 text-default font-mono">{{ queriedAtLabel }}</span>
          </div>
          <div
            v-if="result.durationMs !== undefined"
            class="grid grid-cols-3 gap-1 py-1"
          >
            <span class="text-muted">Answer after:</span>
            <span class="col-span-2 text-default font-mono">{{ result.durationMs }} ms</span>
          </div>
          <div
            v-if="result.referrals?.length"
            class="pt-1 space-y-1"
          >
            <span class="text-muted">Registrar server:</span>
            <p
              v-for="url in result.referrals"
              :key="url"
              class="text-default font-mono break-all"
            >
              {{ url }}
            </p>
            <p class="text-muted">
              The registry keeps a thin record. The tool read the registrar server for the missing contact data.
            </p>
          </div>
          <p class="text-muted pt-1">
            This result is one answer from one server at that time. The tool keeps no copy of it.
          </p>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About RDAP">
        <div class="space-y-4 text-muted">
          <p>
            RDAP is the replacement for WHOIS. It gives the registration data of a domain or an IP address as JSON over HTTPS, so the answer has a fixed structure.
          </p>
          <p>
            The result shows the registrar, the creation date, the expiry date, the name servers, and the status codes. A status such as clientTransferProhibited means that the domain has a transfer lock.
          </p>
          <p>
            Personal contact data is usually hidden by privacy rules. A field with the mark "Hidden for privacy" holds data that the registry keeps back. A field with the mark "Not in the registry record" holds no data at all.
          </p>
          <p>
            The result shows the RDAP server that answered and the time of the query. The tool keeps no copy of the answer, so each lookup reads the server again. A thin registry, such as .com, keeps only a small record. For a thin answer the tool reads the registrar server for the missing contact data. It follows a maximum of two registrar links.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'TLS Certificate Inspector', to: '/hub/network/tls-inspector' },
            { label: 'Email Health Inspector', to: '/hub/network/email-health' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
