<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { parseUserAgent } from '../../../../shared/utils/network/user-agent'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const input = ref('')
const { copy } = useCopyFeedback()

onMounted(() => {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    input.value = navigator.userAgent
  }
})

const presets = [
  {
    label: 'My Browser',
    value: () => (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  },
  {
    label: 'Chrome on macOS',
    value: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  },
  {
    label: 'Safari on iPhone',
    value: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  },
  {
    label: 'Firefox on Windows',
    value: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
  },
  {
    label: 'Googlebot',
    value: () => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  }
]

const parsed = computed(() => parseUserAgent(input.value))

function handlePreset(getter: () => string) {
  input.value = getter()
}

function handleClear() {
  input.value = ''
}

useSeoMeta({
  title: 'User Agent Parser — KitDev Space',
  description: 'Parse user agent strings into browser, operating system, rendering engine, and device details.'
})
</script>

<template>
  <ToolPage
    title="User Agent Parser"
    description="Analyze User Agent strings to identify browser type, operating system, rendering engine, and device."
  >
    <div class="space-y-6">
      <!-- Toolbar with presets -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.label"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.value)"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Input -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-default">
          User Agent String
        </label>
        <UTextarea
          v-model="input"
          :rows="3"
          placeholder="Paste user agent string here..."
          class="font-mono text-sm w-full"
        />
      </div>

      <!-- Analysis Results -->
      <div
        v-if="input.trim()"
        class="space-y-6"
      >
        <!-- Overview Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Browser
            </div>
            <div class="text-xl font-bold mt-1 text-primary">
              {{ parsed.browser.name }}
            </div>
            <div
              v-if="parsed.browser.version"
              class="text-xs text-muted font-mono mt-0.5"
            >
              v{{ parsed.browser.version }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Operating System
            </div>
            <div class="text-xl font-bold mt-1">
              {{ parsed.os.name }}
            </div>
            <div
              v-if="parsed.os.version"
              class="text-xs text-muted font-mono mt-0.5"
            >
              {{ parsed.os.version }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Device Type
            </div>
            <div class="text-xl font-bold mt-1 capitalize">
              {{ parsed.device.type }}
            </div>
            <div
              v-if="parsed.device.model"
              class="text-xs text-muted font-mono mt-0.5"
            >
              {{ parsed.device.model }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Client Type
            </div>
            <div
              class="text-xl font-bold mt-1"
              :class="parsed.isBot ? 'text-warning' : 'text-success'"
            >
              {{ parsed.isBot ? 'Bot / Crawler' : 'User Browser' }}
            </div>
          </div>
        </div>

        <!-- Details Table -->
        <div class="border border-default rounded-xl overflow-hidden">
          <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
            Parsed Components
          </div>
          <table class="w-full text-left text-sm border-collapse">
            <tbody class="divide-y divide-default">
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted w-1/3">
                  Browser Name
                </td>
                <td class="p-3 font-semibold text-default">
                  {{ parsed.browser.name }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.browser.name)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Browser Version
                </td>
                <td class="p-3 font-mono text-default">
                  {{ parsed.browser.version || 'Unknown' }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    :disabled="!parsed.browser.version"
                    @click="copy(parsed.browser.version)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Operating System
                </td>
                <td class="p-3 font-semibold text-default">
                  {{ parsed.os.name }} {{ parsed.os.version }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(`${parsed.os.name} ${parsed.os.version}`.trim())"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Rendering Engine
                </td>
                <td class="p-3 font-mono text-default">
                  {{ parsed.engine.name }} {{ parsed.engine.version }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.engine.name)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Device Category
                </td>
                <td class="p-3 font-mono text-default capitalize">
                  {{ parsed.device.type }} {{ parsed.device.model ? `(${parsed.device.model})` : '' }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(parsed.device.type)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
