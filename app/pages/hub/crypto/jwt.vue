<script setup lang="ts">
import {
  decodeJwt,
  verifyJwtHs256,
  type JwtDecodeResult,
  type JwtVerifyStatus
} from '#shared/utils/crypto/jwt'

const token = ref('')
const secret = ref('')
const decoded = ref<JwtDecodeResult | null>(null)
const verifyStatus = ref<JwtVerifyStatus | null>(null)
const { status, error, run, reset } = useTool()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('jwt')

const verifyLabel = computed(() => {
  switch (verifyStatus.value) {
    case 'valid':
      return 'Signature is valid for HS256.'
    case 'invalid':
      return 'Signature is not valid.'
    case 'unsupported':
      return 'Only HS256 signature checks are supported.'
    case 'missing-secret':
      return 'Enter a secret to verify the signature.'
    default:
      return null
  }
})

const verifyColor = computed(() => {
  if (verifyStatus.value === 'valid') {
    return 'success'
  }
  if (verifyStatus.value === 'invalid') {
    return 'error'
  }
  return 'warning'
})

async function handleDecode() {
  verifyStatus.value = null
  await run(async () => {
    decoded.value = decodeJwt(token.value)
    if (secret.value.trim()) {
      verifyStatus.value = await verifyJwtHs256(token.value, secret.value)
    } else if (decoded.value.algorithm === 'HS256') {
      verifyStatus.value = 'missing-secret'
    } else if (decoded.value.algorithm) {
      verifyStatus.value = 'unsupported'
    }
    return decoded.value.payloadJson
  })
}

async function handleCopy(text: string, key: 'header' | 'payload') {
  if (!text) {
    return
  }
  await copy(text, key)
}

function handleClear() {
  token.value = ''
  secret.value = ''
  decoded.value = null
  verifyStatus.value = null
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      handleDecode()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="JWT Debugger"
        description="Decode JWT header and payload. Verify HS256 signatures in the browser."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Do not paste production secrets into shared machines."
    />

    <ToolEditor
      v-model="token"
      label="JWT"
      placeholder="Paste a JWT here"
    />

    <UFormField label="Secret (optional, HS256)">
      <UInput
        v-model="secret"
        type="password"
        placeholder="HMAC secret"
        class="w-full"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Decode"
        icon="i-lucide-scan-search"
        :loading="status === 'processing'"
        @click="handleDecode"
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
      v-if="decoded"
      class="space-y-4"
    >
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-if="decoded.algorithm"
          color="neutral"
          variant="subtle"
        >
          alg: {{ decoded.algorithm }}
        </UBadge>
        <UBadge
          v-if="decoded.expired === true"
          color="error"
          variant="subtle"
        >
          Expired
        </UBadge>
        <UBadge
          v-else-if="decoded.expired === false"
          color="success"
          variant="subtle"
        >
          Not expired
        </UBadge>
        <UBadge
          v-if="decoded.notBeforeValid === false"
          color="warning"
          variant="subtle"
        >
          Not valid yet (nbf)
        </UBadge>
      </div>

      <UAlert
        v-if="verifyLabel"
        :color="verifyColor"
        variant="subtle"
        :title="verifyLabel"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex justify-end">
            <UButton
              size="sm"
              variant="ghost"
              :label="copyLabel('header', 'Copy header')"
              :icon="copyIcon('header')"
              :color="copyColor('header')"
              @click="handleCopy(decoded.headerJson, 'header')"
            />
          </div>
          <ToolEditor
            :model-value="decoded.headerJson"
            label="Header"
            readonly
            lang="json"
          />
        </div>
        <div class="space-y-2">
          <div class="flex justify-end">
            <UButton
              size="sm"
              variant="ghost"
              :label="copyLabel('payload', 'Copy payload')"
              :icon="copyIcon('payload')"
              :color="copyColor('payload')"
              @click="handleCopy(decoded.payloadJson, 'payload')"
            />
          </div>
          <ToolEditor
            :model-value="decoded.payloadJson"
            label="Payload"
            readonly
            lang="json"
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About JWT debugging">
        <div class="space-y-4 text-muted">
          <p>
            The tool parses Base64URL header and payload data and formats them as JSON.
          </p>
          <p>
            Expiration uses the <code>exp</code> claim. Signature checks use Web Crypto for HS256 only.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Base64 Encoder', to: '/hub/crypto/base64' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
