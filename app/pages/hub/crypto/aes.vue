<script setup lang="ts">
import { ref } from 'vue'
import { decryptAesGcm, encryptAesGcm } from '~~/shared/utils/crypto/aes'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'
import { useToolShortcuts } from '../../../composables/useToolShortcuts'

type AesMode = 'encrypt' | 'decrypt'

const mode = ref<AesMode>('encrypt')
const input = ref('Top secret developer notes and keys.')
const password = ref('StrongMasterKey#2026')
const showPassword = ref(false)

const output = ref('')
const errorMsg = ref<string | null>(null)
const loading = ref(false)

const { copy, label, color, icon } = useCopyFeedback()

async function handleRun() {
  if (!input.value.trim() || !password.value) {
    errorMsg.value = 'Enter both input text and a password.'
    return
  }

  loading.value = true
  errorMsg.value = null

  try {
    if (mode.value === 'encrypt') {
      output.value = await encryptAesGcm(input.value, password.value)
    } else {
      output.value = await decryptAesGcm(input.value, password.value)
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Operation failed.'
    output.value = ''
  } finally {
    loading.value = false
  }
}

function handleModeChange(newMode: AesMode) {
  mode.value = newMode
  errorMsg.value = null
  // If output exists, swap input with output for quick round-trip testing
  if (output.value) {
    input.value = output.value
    output.value = ''
  }
}

function handleCopy() {
  if (output.value) {
    copy(output.value)
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  errorMsg.value = null
}

useToolShortcuts({
  onRun: handleRun,
  onCopy: handleCopy,
  onClear: handleClear
})

useSeoMeta({
  title: 'AES Encrypt & Decrypt — KitDev Space',
  description: 'Encrypt and decrypt text with AES-256-GCM and PBKDF2 password derivation in the browser.'
})
</script>

<template>
  <ToolPage
    title="AES Encrypt & Decrypt"
    description="Encrypt and decrypt text with AES-256-GCM and PBKDF2 password derivation directly in your browser."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="mode === 'encrypt' ? 'solid' : 'ghost'"
              color="neutral"
              icon="i-lucide-lock"
              label="Encrypt"
              @click="handleModeChange('encrypt')"
            />
            <UButton
              size="xs"
              :variant="mode === 'decrypt' ? 'solid' : 'ghost'"
              color="neutral"
              icon="i-lucide-unlock"
              label="Decrypt"
              @click="handleModeChange('decrypt')"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!output"
            @click="handleCopy"
          />
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input && !output"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Password Input -->
      <div class="space-y-2 max-w-lg">
        <label class="block text-sm font-medium text-default">
          Secret Password (PBKDF2 Key Derivation)
        </label>
        <div class="flex items-center gap-2">
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter password to encrypt or decrypt..."
            class="font-mono text-sm w-full"
          />
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          />
        </div>
      </div>

      <!-- Action Button -->
      <div>
        <UButton
          size="md"
          color="primary"
          variant="solid"
          :icon="mode === 'encrypt' ? 'i-lucide-lock' : 'i-lucide-unlock'"
          :label="mode === 'encrypt' ? 'Encrypt Text (AES-GCM)' : 'Decrypt Ciphertext'"
          :loading="loading"
          @click="handleRun"
        />
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="errorMsg"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Error"
        :description="errorMsg"
      />

      <!-- Dual Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolEditor
          v-model="input"
          :label="mode === 'encrypt' ? 'Plaintext Input' : 'Base64 Ciphertext Input'"
          lang="text"
          :rows="14"
          :placeholder="mode === 'encrypt' ? 'Enter text to encrypt...' : 'Paste Base64 ciphertext to decrypt...'"
        />

        <ToolEditor
          :model-value="output"
          :label="mode === 'encrypt' ? 'Encrypted Ciphertext (Base64)' : 'Decrypted Plaintext'"
          lang="text"
          :rows="14"
          readonly
          placeholder="Result appears here after operation..."
        />
      </div>
    </div>
  </ToolPage>
</template>
