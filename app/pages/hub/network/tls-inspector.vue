<script setup lang="ts">
import type { TlsReport } from '#shared/utils/network/tls-report'
import { certificateChecks, chainIssues, overallVerdict } from '#shared/utils/network/tls-report'

const host = ref('google.com')
const options = reactive({ port: 443 })

const { status, error, result, run, reset } = useTool<TlsReport>()

useToolSeo('tls-inspector')
const { reportInput } = useToolInput()
useToolQuery({ input: host, options })

const checks = computed(() => (result.value ? certificateChecks(result.value) : []))
const issues = computed(() => (result.value ? chainIssues(result.value) : []))
const verdict = computed(() => (result.value ? overallVerdict(result.value) : null))

async function inspect() {
  reportInput('url')
  await run(async () => {
    const data = await $fetch<{ result: TlsReport }>('/api/network/tls', {
      method: 'POST',
      body: {
        host: host.value,
        port: options.port,
      },
    })
    return data.result
  }, 'The TLS connection failed.')
}

function handleReset() {
  host.value = ''
  options.port = 443
  reset()
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Input Controls -->
      <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <UFormField
            label="Hostname, domain, or IP address"
            help="Put an IPv6 address in brackets, such as [2001:db8::1]:443."
            class="sm:col-span-3"
          >
            <UInput
              v-model="host"
              placeholder="e.g. example.com"
              icon="i-lucide-globe"
              class="w-full"
              @keydown.enter="inspect"
            />
          </UFormField>
          <UFormField label="Port">
            <UInput
              v-model.number="options.port"
              type="number"
              placeholder="443"
              class="w-full"
              @keydown.enter="inspect"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="google.com"
              @click="host = 'google.com'; options.port = 443"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="cloudflare.com"
              @click="host = 'cloudflare.com'; options.port = 443"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="github.com"
              @click="host = 'github.com'; options.port = 443"
            />
          </div>

          <ToolActions class="gap-2">
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
          </ToolActions>
        </div>
      </div>

      <!-- Error banner -->
      <ToolError
        v-if="error"
        :message="error"
      />

      <!-- Results View -->
      <div
        v-if="result"
        class="space-y-6"
      >
        <!-- Connection Summary -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Certificate Verdict
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <UBadge
                v-if="verdict"
                size="md"
                :color="verdict.state === 'pass' ? 'success' : (verdict.state === 'warn' ? 'warning' : 'error')"
                variant="subtle"
                class="font-semibold"
              >
                {{ verdict.label }}
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
            <div class="text-[11px] text-muted">
              The verdict fails when any check below fails.
            </div>
          </div>

          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Negotiated Protocol
            </div>
            <div class="text-sm font-semibold font-mono text-default pt-1">
              {{ result.protocol }}
            </div>
            <div class="text-[11px] text-muted">
              {{ result.host }}:{{ result.port }}
            </div>
          </div>

          <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
            <div class="text-xs text-muted font-medium">
              Negotiated Cipher
            </div>
            <div class="text-sm font-semibold font-mono text-default pt-1 break-all">
              {{ result.cipher.name }}
            </div>
            <div class="text-[11px] text-muted">
              One handshake gives one cipher.
            </div>
          </div>
        </div>

        <!-- Independent Checks -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TlsCheckCard
            v-for="check in checks"
            :key="check.id"
            :check="check"
          >
            <div
              v-if="check.id === 'hostname'"
              class="space-y-1.5"
            >
              <div class="text-[11px] text-muted font-medium">
                Subject Alternative Names ({{ result.sans.length }})
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
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
                <span
                  v-if="!result.sans.length"
                  class="text-[11px] text-muted"
                >
                  The certificate lists no alternative name.
                </span>
              </div>
            </div>

            <div
              v-else-if="check.id === 'validity'"
              class="grid grid-cols-3 gap-1 text-[11px] font-mono text-muted"
            >
              <span>From:</span>
              <span class="col-span-2 text-default">{{ new Date(result.validFrom).toUTCString() }}</span>
              <span>Until:</span>
              <span class="col-span-2 text-default">{{ new Date(result.validTo).toUTCString() }}</span>
            </div>
          </TlsCheckCard>
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

          <UAlert
            v-for="issue in issues"
            :key="issue.id"
            color="warning"
            variant="subtle"
            icon="i-lucide-unlink"
            :title="issue.title"
            :description="issue.detail"
          />

          <div class="space-y-2">
            <TlsChainItem
              v-for="(item, idx) in result.chain"
              :key="item.fingerprint256 || idx"
              :cert="item"
              :index="idx"
            />
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

          <!-- Fingerprints -->
          <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-4">
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-fingerprint"
                class="w-4 h-4 text-primary"
              />
              Identifiers
            </h3>

            <div class="space-y-3 text-xs">
              <div class="p-3 rounded-lg border border-default bg-default space-y-1.5">
                <div class="font-medium text-default">
                  Fingerprints & Serial
                </div>
                <div class="grid grid-cols-3 gap-1 text-muted font-mono text-[11px]">
                  <span>Serial:</span>
                  <span class="col-span-2 text-default break-all">{{ result.serialNumber }}</span>
                  <span>SHA-256:</span>
                  <span class="col-span-2 text-default break-all">{{ result.fingerprint256 }}</span>
                  <span>SHA-1:</span>
                  <span class="col-span-2 text-default break-all">{{ result.fingerprint || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Actions -->
        <div class="flex justify-end">
          <!-- The page owns the query options, so the share URL already holds the port. -->
          <ToolResultActions
            :result="result"
            :input="host"
            filename="tls-report.json"
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About TLS certificates">
        <div class="space-y-4 text-muted">
          <p>
            This tool connects to a host and reads its TLS certificate. It shows the subject, the issuer, the validity dates, the alternative names, the certificate chain, and the negotiated cipher.
          </p>
          <p>
            The tool makes one TLS handshake and reports the negotiated cipher. It does not enumerate all ciphers that the server supports.
          </p>
          <p>
            The tool shows three independent checks: the trust chain, the hostname match, and the validity dates. A certificate can have good dates and still fail, because the hostname does not match. Each check keeps its own status.
          </p>
          <p>
            The chain shows the leaf certificate first, then each intermediate certificate, then the root certificate. The tool flags a missing intermediate certificate and a self-signed certificate. A browser can hide a missing intermediate certificate, but a command line client or a mobile app then fails.
          </p>
          <p>
            Each certificate in the chain shows its public key type and size, its signature algorithm, its extended key usage, its OCSP responder URL, and its CRL distribution URL. Use the PEM actions to copy or to download one certificate.
          </p>
          <p>
            To inspect an IPv6 address, put the address in brackets, such as <code>[2001:db8::1]:443</code>.
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
