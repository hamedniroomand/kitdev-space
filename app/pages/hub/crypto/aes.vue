<script setup lang="ts">
import { decryptAesGcm, encryptAesGcm } from '#shared/utils/crypto/aes'

useToolSeo('aes')

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
    }
    else {
      output.value = await decryptAesGcm(input.value, password.value)
    }
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Operation failed.'
    output.value = ''
  }
  finally {
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
  onClear: handleClear,
})
</script>

<template>
  <ToolPage>
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
      <UFormField label="Secret Password (PBKDF2 Key Derivation)" class="max-w-lg">
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
      </UFormField>

      <!-- Action Button -->
      <ToolActions>
        <UButton
          size="md"
          color="primary"
          variant="solid"
          :icon="mode === 'encrypt' ? 'i-lucide-lock' : 'i-lucide-unlock'"
          :label="mode === 'encrypt' ? 'Encrypt Text (AES-GCM)' : 'Decrypt Ciphertext'"
          :loading="loading"
          @click="handleRun"
        />
      </ToolActions>

      <!-- Error Alert -->
      <ToolError
        v-if="errorMsg"
        :message="errorMsg"
      />

      <!-- Dual Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyToolEditor
          v-model="input"
          hydrate-on-idle
          :label="mode === 'encrypt' ? 'Plaintext Input' : 'Base64 Ciphertext Input'"
          lang="text"
          :rows="14"
          :placeholder="mode === 'encrypt' ? 'Enter text to encrypt...' : 'Paste Base64 ciphertext to decrypt...'"
        />

        <LazyToolEditor
          hydrate-on-idle
          :model-value="output"
          :label="mode === 'encrypt' ? 'Encrypted Ciphertext (Base64)' : 'Decrypted Plaintext'"
          lang="text"
          :rows="14"
          readonly
          placeholder="Result appears here after operation..."
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About AES encryption">
        <div class="space-y-4 text-muted">
          <p>
            This tool encrypts and decrypts text with AES-256-GCM. GCM gives secrecy and also integrity, so a change to the encrypted data makes the decryption fail instead of giving wrong text.
          </p>
          <p>
            Your password becomes a key through PBKDF2, which repeats a hash many times. This makes a guess attack slow. A new random salt and a new random nonce are used for each operation, so the same text gives different output each time.
          </p>
          <p>
            The output holds one envelope. The envelope has four parts, in this order:
          </p>
          <pre class="overflow-x-auto rounded-md border border-default bg-elevated/40 p-3 font-mono text-xs text-highlighted">version (1 byte) | salt (16 bytes) | iv (12 bytes) | ciphertext and tag</pre>
          <p>
            Version 1 is the only version. It fixes PBKDF2 with SHA-256 and 100000 iterations, and AES-256-GCM with a 16-byte tag. A change to these parameters needs a new version number.
          </p>
          <p>
            An earlier release wrote no version byte. A random salt byte can hold the value 1, so the tool cannot read the layout from the first byte. The tool tries the version 1 layout first. GCM checks its tag, so a wrong layout always fails. The tool then tries the old layout. An old output therefore still decrypts.
          </p>
          <p>
            The strength comes from the password. A short password gives weak encryption, whatever the algorithm. Use the ID & Secret Generator to make a strong passphrase.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
