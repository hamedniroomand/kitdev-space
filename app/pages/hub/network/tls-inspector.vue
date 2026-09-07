<script setup lang="ts">
import type { TlsInspectionResult } from '#server/utils/network/tls'

const host = ref('google.com')
const port = ref(443)

const { status, error, result, run, reset } = useTool<TlsInspectionResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('tls-inspector')
const { reportInput } = useToolInput()

function statusBadgeColor(st: 'valid' | 'expiring_soon' | 'expired') {
  switch (st) {
    case 'valid':
      return 'success'
    case 'expiring_soon':
      return 'warning'
    case 'expired':
      return 'error'
  }
}

async function inspect() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: TlsInspectionResult }>('/api/network/tls', {
      method: 'POST',
      body: {
        host: host.value,
        port: port.value,
      },
    })
    return data.result
  }, 'The TLS connection failed.')
}

function handleCopy() {
  if (!result.value)
    return
  copy(JSON.stringify(result.value, null, 2))
}

function handleReset() {
  host.value = ''
  port.value = 443
  reset()
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Input Controls -->
      <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="sm:col-span-3 space-y-1">
            <label class="text-xs font-medium text-muted">Hostname or Domain</label>
            <UInput
              v-model="host"
              placeholder="e.g. example.com"
              icon="i-lucide-globe"
              class="w-full"
              @keydown.enter="inspect"
            />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted">Port</label>
            <UInput
              v-model.number="port"
              type="number"
              placeholder="443"
              class="w-full"
              @keydown.enter="inspect"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="google.com"
              @click="host = 'google.com'; port = 443"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="cloudflare.com"
              @click="host = 'cloudflare.com'; port = 443"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="github.com"
              @click="host = 'github.com'; port = 443"
            />
          </div>

          <div class="flex items-center gap-2">
            <UButton
              label="Clear"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-eraser"
              :disabled="!host && !result"
              @click="handleReset"
            />
            <UButton
              label="Inspect Certificate"
              icon="i-lucide-shield-check"
              color="primary"
              size="sm"
              :loading="status === 'processing'"
              @click="inspect"
            />
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Inspection Error"
        :description="error"
      />

      <!-- Results View -->
      <div
        v-if="result"
        class="space-y-6"
      >
        <!-- Top Status Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Certificate Status
            </div>
            <div class="flex items-center gap-2 pt-1">
              <UBadge
                size="md"
                :color="statusBadgeColor(result.status)"
                variant="subtle"
                class="capitalize font-semibold"
              >
                {{ result.status === 'expiring_soon' ? 'Expiring Soon' : result.status }}
              </UBadge>
              <UBadge
                v-if="result.isSelfSigned"
                size="sm"
                color="warning"
                variant="outline"
              >
                Self-Signed
              </UBadge>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Time Remaining
            </div>
            <div class="text-xl font-bold font-mono text-default pt-1">
              {{ result.daysRemaining }} days
            </div>
          </div>

          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Host Match
            </div>
            <div class="flex items-center gap-1.5 pt-1">
              <UIcon
                :name="result.matchesHost ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                :class="result.matchesHost ? 'text-success' : 'text-error'"
                class="w-5 h-5"
              />
              <span class="text-sm font-medium text-default">
                {{ result.matchesHost ? 'Matches Hostname' : 'Name Mismatch' }}
              </span>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Negotiated Protocol
            </div>
            <div class="text-sm font-semibold font-mono text-default pt-1">
              {{ result.protocol }}
            </div>
            <div class="text-[11px] text-muted font-mono truncate">
              {{ result.cipher.name }}
            </div>
          </div>
        </div>

        <!-- Certificate Details Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Subject & Issuer Details -->
          <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-4">
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-file-badge"
                class="w-4 h-4 text-primary"
              />
              Subject & Issuer
            </h3>

            <div class="space-y-3 text-xs">
              <div class="p-3 rounded-lg border border-default bg-default space-y-1.5">
                <div class="font-medium text-default">
                  Subject (Issued To)
                </div>
                <div class="grid grid-cols-3 gap-1 text-muted">
                  <span>Common Name:</span>
                  <span class="col-span-2 text-default font-mono">{{ result.subject.commonName || '—' }}</span>
                  <span>Organization:</span>
                  <span class="col-span-2 text-default">{{ result.subject.organization || '—' }}</span>
                  <span>Location:</span>
                  <span class="col-span-2 text-default">{{ [result.subject.locality, result.subject.state, result.subject.country].filter(Boolean).join(', ') || '—' }}</span>
                </div>
              </div>

              <div class="p-3 rounded-lg border border-default bg-default space-y-1.5">
                <div class="font-medium text-default">
                  Issuer (Issued By)
                </div>
                <div class="grid grid-cols-3 gap-1 text-muted">
                  <span>Common Name:</span>
                  <span class="col-span-2 text-default font-mono">{{ result.issuer.commonName || '—' }}</span>
                  <span>Organization:</span>
                  <span class="col-span-2 text-default">{{ result.issuer.organization || '—' }}</span>
                  <span>Country:</span>
                  <span class="col-span-2 text-default">{{ result.issuer.country || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Validity Dates & Fingerprints -->
          <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-4">
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-calendar"
                class="w-4 h-4 text-primary"
              />
              Validity & Identifiers
            </h3>

            <div class="space-y-3 text-xs">
              <div class="p-3 rounded-lg border border-default bg-default space-y-1.5">
                <div class="font-medium text-default">
                  Validity Period
                </div>
                <div class="grid grid-cols-3 gap-1 text-muted font-mono">
                  <span>Valid From:</span>
                  <span class="col-span-2 text-default">{{ new Date(result.validFrom).toUTCString() }}</span>
                  <span>Valid Until:</span>
                  <span class="col-span-2 text-default">{{ new Date(result.validTo).toUTCString() }}</span>
                </div>
              </div>

              <div class="p-3 rounded-lg border border-default bg-default space-y-1.5">
                <div class="font-medium text-default">
                  Fingerprints & Serial
                </div>
                <div class="grid grid-cols-3 gap-1 text-muted font-mono text-[11px]">
                  <span>Serial:</span>
                  <span class="col-span-2 text-default break-all">{{ result.serialNumber }}</span>
                  <span>SHA-256:</span>
                  <span class="col-span-2 text-default break-all">{{ result.fingerprint256 }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Subject Alternative Names -->
        <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-list"
                class="w-4 h-4 text-primary"
              />
              Subject Alternative Names (SANs) ({{ result.sans.length }})
            </h3>
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
            <UBadge
              v-for="san in result.sans"
              :key="san"
              size="xs"
              color="neutral"
              variant="subtle"
              class="font-mono"
            >
              {{ san }}
            </UBadge>
          </div>
        </div>

        <!-- Certificate Chain Hierarchy -->
        <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
          <h3 class="text-sm font-semibold text-default flex items-center gap-2">
            <UIcon
              name="i-lucide-git-commit-horizontal"
              class="w-4 h-4 text-primary"
            />
            Certificate Chain ({{ result.chain.length }} Certificates)
          </h3>

          <div class="space-y-2">
            <div
              v-for="(item, idx) in result.chain"
              :key="idx"
              class="p-3 rounded-lg border border-default bg-default flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <UBadge
                    size="xs"
                    :color="idx === 0 ? 'primary' : 'neutral'"
                    variant="solid"
                  >
                    {{ idx === 0 ? 'Leaf (Server)' : (idx === result.chain.length - 1 ? 'Root CA' : 'Intermediate CA') }}
                  </UBadge>
                  <span class="text-xs font-semibold text-default font-mono">
                    {{ item.subject.commonName || item.subject.organization || 'Unnamed Certificate' }}
                  </span>
                </div>
                <div class="text-[11px] text-muted">
                  Issuer: {{ item.issuer.commonName || item.issuer.organization || 'Self' }}
                </div>
              </div>

              <div class="text-[11px] text-muted font-mono">
                Expires: {{ new Date(item.validTo).toISOString().split('T')[0] }}
              </div>
            </div>
          </div>
        </div>

        <!-- Export Action -->
        <div class="flex justify-end gap-2">
          <UButton
            size="xs"
            variant="subtle"
            :label="copyLabel()"
            :color="copyColor()"
            :icon="copyIcon()"
            @click="handleCopy"
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About TLS certificates">
        <div class="space-y-4 text-muted">
          <p>
            This tool connects to a host and reads its TLS certificate. It shows the subject, the issuer, the validity dates, the alternative names, and the single cipher suite negotiated during the connection.
          </p>
          <p>
            The tool performs one TLS handshake and returns the negotiated cipher. It does not run a complete cipher scan or audit every protocol and cipher supported by the server.
          </p>
          <p>
            The most common failure is an expired certificate. The second is a missing name: the certificate must list the exact host name in its subject alternative names, so a certificate for example.com does not cover www.example.com.
          </p>
          <p>
            Check the chain as well. A server must send the intermediate certificates. A browser often hides a missing intermediate, and a command line client or a mobile app then fails.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'RDAP / WHOIS Lookup', to: '/hub/network/rdap-lookup' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
