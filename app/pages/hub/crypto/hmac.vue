<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  generateHmac,
  generateRandomSecret,
  type HmacAlgorithm,
  type HmacEncoding
} from '~~/shared/utils/crypto/hmac'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const message = ref('The quick brown fox jumps over the lazy dog')
const secret = ref('secret-key-12345')
const algorithm = ref<HmacAlgorithm>('SHA-256')
const encoding = ref<HmacEncoding>('hex')
const uppercase = ref(false)
const signature = ref('')

const { copy, label, color, icon } = useCopyFeedback()

const algorithms: HmacAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1']
const encodings: { label: string, value: HmacEncoding }[] = [
  { label: 'Hexadecimal', value: 'hex' },
  { label: 'Base64', value: 'base64' }
]

async function computeSignature() {
  if (!message.value || !secret.value) {
    signature.value = ''
    return
  }

  try {
    let sig = await generateHmac(message.value, secret.value, algorithm.value, encoding.value)
    if (encoding.value === 'hex' && uppercase.value) {
      sig = sig.toUpperCase()
    }
    signature.value = sig
  } catch {
    signature.value = ''
  }
}

watch([message, secret, algorithm, encoding, uppercase], () => {
  computeSignature()
}, { immediate: true })

function handleGenerateKey() {
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
}

useSeoMeta({
  title: 'HMAC Generator — KitDev Space',
  description: 'Generate Hash-based Message Authentication Codes (HMAC) with SHA-256, SHA-384, SHA-512, or SHA-1.'
})
</script>

<template>
  <ToolPage
    title="HMAC Generator"
    description="Sign messages using a secret key and Hash-based Message Authentication Code algorithms."
  >
    <div class="space-y-6">
      <!-- Settings Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Algorithm -->
          <div class="flex items-center gap-1">
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

          <!-- Encoding -->
          <div class="flex items-center gap-1 border-s border-default ps-3">
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
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-default">
            Secret Key
          </label>
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            icon="i-lucide-key-round"
            label="Generate Random Key"
            @click="handleGenerateKey"
          />
        </div>
        <UInput
          v-model="secret"
          placeholder="Enter secret key string..."
          class="font-mono text-sm w-full"
        />
      </div>

      <!-- Message Input -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-default">
          Message to Sign
        </label>
        <UTextarea
          v-model="message"
          :rows="5"
          placeholder="Enter text message to authenticate..."
          class="font-mono text-sm w-full"
        />
      </div>

      <!-- Signature Output -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-default">
            HMAC Signature ({{ algorithm }})
          </label>
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!signature"
            @click="handleCopy"
          />
        </div>
        <div class="p-3.5 border border-default rounded-lg bg-default font-mono text-sm break-all select-all min-h-12 flex items-center">
          <span
            v-if="signature"
            class="text-primary font-semibold"
          >{{ signature }}</span>
          <span
            v-else
            class="text-muted italic"
          >Enter a secret key and a message to compute HMAC...</span>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
