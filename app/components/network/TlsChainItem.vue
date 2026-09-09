<script setup lang="ts">
import type { TlsChainCertificate } from '#shared/utils/network/tls-report'
import { computed } from 'vue'
import { chainRole, chainRoleLabel, describeKey } from '#shared/utils/network/tls-report'

const props = defineProps<{
  cert: TlsChainCertificate
  index: number
}>()

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const role = computed(() => chainRole(props.cert, props.index))
const name = computed(() => props.cert.subject.commonName || props.cert.subject.organization || 'Unnamed certificate')
const issuerName = computed(() => props.cert.issuer.commonName || props.cert.issuer.organization || 'Unknown issuer')
const pemName = computed(() => `certificate-${props.index + 1}.pem`)

function handleCopyPem() {
  if (props.cert.pem) {
    copy(props.cert.pem, pemName.value, 'result')
  }
}

function handleDownloadPem() {
  if (props.cert.pem) {
    downloadText(pemName.value, props.cert.pem, 'application/x-pem-file')
  }
}
</script>

<template>
  <div class="p-3 rounded-lg border border-default bg-default space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
      <div class="min-w-0 space-y-0.5">
        <div class="flex items-center gap-2">
          <UBadge
            size="xs"
            :color="role === 'leaf' ? 'primary' : 'neutral'"
            variant="solid"
          >
            {{ chainRoleLabel(role) }}
          </UBadge>
          <span class="text-xs font-semibold text-default font-mono break-all">
            {{ name }}
          </span>
        </div>
        <div class="text-[11px] text-muted break-all">
          Issued by: {{ issuerName }}
        </div>
      </div>

      <div
        v-if="cert.pem"
        class="flex items-center gap-1.5 shrink-0"
      >
        <UButton
          size="xs"
          variant="subtle"
          :label="copyLabel(pemName, 'Copy PEM')"
          :color="copyColor(pemName)"
          :icon="copyIcon(pemName)"
          :aria-label="`Copy PEM of certificate ${index + 1}`"
          @click="handleCopyPem"
        />
        <UButton
          size="xs"
          variant="subtle"
          color="neutral"
          label="Download PEM"
          icon="i-lucide-download"
          :aria-label="`Download PEM of certificate ${index + 1}`"
          @click="handleDownloadPem"
        />
      </div>
    </div>

    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          Public key:
        </dt>
        <dd class="text-default font-mono break-all">
          {{ describeKey(cert) }}
        </dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          Signature algorithm:
        </dt>
        <dd class="text-default font-mono break-all">
          {{ cert.signatureAlgorithm || '—' }}
        </dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          Expires:
        </dt>
        <dd class="text-default font-mono">
          {{ new Date(cert.validTo).toISOString().split('T')[0] }}
        </dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          Extended key usage:
        </dt>
        <dd class="text-default break-words">
          {{ cert.extendedKeyUsage?.join(', ') || '—' }}
        </dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          OCSP responder:
        </dt>
        <dd class="text-default font-mono break-all">
          {{ cert.ocspUrls?.join(' ') || '—' }}
        </dd>
      </div>
      <div class="flex gap-2">
        <dt class="text-muted shrink-0">
          CRL distribution:
        </dt>
        <dd class="text-default font-mono break-all">
          {{ cert.crlUrls?.join(' ') || '—' }}
        </dd>
      </div>
    </dl>
  </div>
</template>
