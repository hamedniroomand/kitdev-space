<script setup lang="ts">
import type { HmacAlgorithm, HmacEncoding, HmacKeyFormat } from '#shared/utils/crypto/hmac'
import { decodeHmacKey, generateHmac, generateRandomSecret } from '#shared/utils/crypto/hmac'

useToolSeo('hmac')

const message = ref('The quick brown fox jumps over the lazy dog')
const secret = ref('secret-key-12345')
const algorithm = ref<HmacAlgorithm>('SHA-256')
const keyFormat = ref<HmacKeyFormat>('text')
const encoding = ref<HmacEncoding>('hex')
const uppercase = ref(false)
const signature = ref('')
const errorMessage = ref<string | null>(null)

const { copy, label, color, icon } = useCopyFeedback()

const algorithms: HmacAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1']
const keyFormats: { label: string, value: HmacKeyFormat }[] = [
  { label: 'Text (UTF-8)', value: 'text' },
  { label: 'Hex', value: 'hex' },
  { label: 'Base64', value: 'base64' },
]
const encodings: { label: string, value: HmacEncoding }[] = [
  { label: 'Hexadecimal', value: 'hex' },
  { label: 'Base64', value: 'base64' },
]

async function computeSignature() {
  if (!message.value || !secret.value) {
    signature.value = ''
    errorMessage.value = null
    return
  }

  try {
    const keyBytes = decodeHmacKey(secret.value, keyFormat.value)
    let sig = await generateHmac(message.value, keyBytes, algorithm.value, encoding.value)
    if (encoding.value === 'hex' && uppercase.value) {
      sig = sig.toUpperCase()
    }
    signature.value = sig
    errorMessage.value = null
  }
  catch (err) {
    signature.value = ''
    errorMessage.value = err instanceof Error ? err.message : 'Failed to compute HMAC signature.'
  }
}

watch([message, secret, algorithm, keyFormat, encoding, uppercase], () => {
  computeSignature()
}, { immediate: true })

function handleGenerateKey() {
  keyFormat.value = 'hex'
  secret.value = generateRandomSecret(32)
}

function handleCopy() {
  if (signature.value) {
    copy(signature.value)
  }
}

function handleClear() {
  message.value = ''
  secret.value = ''
  signature.value = ''
  errorMessage.value = null
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Settings Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Algorithm -->
          <div
            role="group"
            aria-label="Algorithm"
            class="flex items-center gap-1"
          >
            <span class="text-xs text-muted font-medium">Algorithm:</span>
            <UButton
              v-for="algo in algorithms"
              :key="algo"
              size="xs"
              :variant="algorithm === algo ? 'solid' : 'ghost'"
              :color="algorithm === algo ? 'primary' : 'neutral'"
              :label="algo"
              @click="algorithm = algo"
            />
          </div>

          <!-- Key format -->
          <div
            role="group"
            aria-label="Key format"
            class="flex items-center gap-1 border-s border-default ps-3"
          >
            <span class="text-xs text-muted font-medium">Key format:</span>
            <UButton
              v-for="format in keyFormats"
              :key="format.value"
              size="xs"
              :variant="keyFormat === format.value ? 'solid' : 'ghost'"
              :color="keyFormat === format.value ? 'primary' : 'neutral'"
              :label="format.label"
              @click="keyFormat = format.value"
            />
          </div>

          <!-- Output encoding -->
          <div
            role="group"
            aria-label="Output encoding"
            class="flex items-center gap-1 border-s border-default ps-3"
          >
            <span class="text-xs text-muted font-medium">Encoding:</span>
            <UButton
              v-for="enc in encodings"
              :key="enc.value"
              size="xs"
              :variant="encoding === enc.value ? 'solid' : 'ghost'"
              :color="encoding === enc.value ? 'primary' : 'neutral'"
              :label="enc.label"
              @click="encoding = enc.value"
            />
          </div>

          <div
            v-if="encoding === 'hex'"
            class="flex items-center gap-2 border-s border-default ps-3"
          >
            <UCheckbox
              v-model="uppercase"
              label="Uppercase"
              size="sm"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!message && !secret"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Secret Key Input -->
      <UFormField label="Secret Key">
        <template #hint>
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            icon="i-lucide-key-round"
            label="Generate Random Key"
            @click="handleGenerateKey"
          />
        </template>
        <UInput
          v-model="secret"
          :placeholder="keyFormat === 'text' ? 'Enter secret key text...' : `Enter the key in ${keyFormat === 'hex' ? 'hex' : 'Base64'}...`"
          class="font-mono text-sm w-full"
        />
      </UFormField>

      <!-- Message Input -->
      <UFormField label="Message to Sign">
        <UTextarea
          v-model="message"
          :rows="5"
          placeholder="Enter text message to authenticate..."
          class="font-mono text-sm w-full"
        />
      </UFormField>

      <!-- Signature Output -->
      <UFormField :label="`Signature (${algorithm})`">
        <template #hint>
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!signature"
            @click="handleCopy"
          />
        </template>
        <output
          aria-label="HMAC signature"
          class="p-3.5 border border-default rounded-lg bg-default font-mono text-sm break-all select-all min-h-12 flex items-center"
        >
          <span
            v-if="signature"
            class="text-primary font-semibold"
          >{{ signature }}</span>
          <span
            v-else
            class="text-muted italic"
          >Enter a secret key and a message to compute HMAC...</span>
        </output>
      </UFormField>

      <ToolError
        v-if="errorMessage"
        :message="errorMessage"
      />
    </div>

    <template #docs>
      <ToolDocs title="About HMAC">
        <div class="space-y-4 text-muted">
          <p>
            An HMAC proves that a message comes from a sender who holds the secret key, and that nobody changed the message. It combines the message and the key with a hash.
          </p>
          <p>
            A webhook uses an HMAC. The sender puts the signature in a header. Your server computes the same HMAC over the raw body and compares the two values. Compare them with a constant-time function, never with a plain equals.
          </p>
          <p>
            A key is bytes, not text. Select the key format that matches your key. "Text (UTF-8)" reads the key as UTF-8 text. "Hex" and "Base64" decode the key to the same bytes that the sender uses. The tool reports an error when the key holds a character that the selected format does not allow.
          </p>
          <p>
            An HMAC is not encryption. It does not hide the message. Anybody can read the message; only a holder of the key can make a valid signature.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
            { label: 'AES Encrypt & Decrypt', to: '/hub/crypto/aes' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
