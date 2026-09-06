<script setup lang="ts">
import { parseCidr } from '#shared/utils/network/cidr'

const input = ref('192.168.1.0/24')
const { copy } = useCopyFeedback()

const presets = [
  { label: 'Home LAN (/24)', value: '192.168.1.0/24' },
  { label: 'VPC Subnet (/20)', value: '10.0.0.0/20' },
  { label: 'Class B (/16)', value: '172.16.0.0/16' },
  { label: 'Point-to-Point (/31)', value: '10.255.0.0/31' },
  { label: 'Host Route (/32)', value: '1.1.1.1/32' }
]

const calculation = computed(() => {
  if (!input.value.trim()) return { data: null, error: null }
  try {
    const data = parseCidr(input.value)
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid CIDR notation.'
    }
  }
})

function handlePreset(val: string) {
  input.value = val
}

useSeoMeta({
  title: 'CIDR Subnet Calculator — KitDev Space',
  description: 'Calculate IPv4 subnet masks, network addresses, broadcast IPs, and usable host counts.'
})
</script>

<template>
  <ToolPage
    title="CIDR Subnet Calculator"
    description="Calculate subnet parameters, network ranges, broadcast addresses, and host counts from CIDR notation."
  >
    <div class="space-y-6">
      <!-- Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.value"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.value)"
          />
        </div>
      </div>

      <!-- Input -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-default">
          IP Address & CIDR Prefix
        </label>
        <div class="max-w-md">
          <UInput
            v-model="input"
            placeholder="e.g. 192.168.1.0/24"
            class="font-mono text-base"
          />
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="calculation.error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Invalid CIDR Input"
        :description="calculation.error"
      />

      <!-- Calculation Results -->
      <div
        v-if="calculation.data"
        class="space-y-6"
      >
        <!-- Top Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Usable Hosts
            </div>
            <div class="text-2xl font-bold font-mono mt-1 text-primary">
              {{ calculation.data.usableHosts.toLocaleString() }}
            </div>
          </div>
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Total Addresses
            </div>
            <div class="text-2xl font-bold font-mono mt-1">
              {{ calculation.data.totalHosts.toLocaleString() }}
            </div>
          </div>
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              IP Class
            </div>
            <div class="text-2xl font-bold font-mono mt-1">
              Class {{ calculation.data.ipClass }}
            </div>
          </div>
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Scope
            </div>
            <div
              class="text-2xl font-bold font-mono mt-1"
              :class="calculation.data.isPrivate ? 'text-warning' : 'text-success'"
            >
              {{ calculation.data.isPrivate ? 'Private (RFC 1918)' : calculation.data.isLoopback ? 'Loopback' : 'Public' }}
            </div>
          </div>
        </div>

        <!-- Details Table -->
        <div class="border border-default rounded-xl overflow-hidden">
          <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
            Subnet Properties
          </div>
          <table class="w-full text-left text-sm border-collapse">
            <tbody class="divide-y divide-default">
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted w-1/3">
                  Network Address
                </td>
                <td class="p-3 font-mono font-bold text-default">
                  {{ calculation.data.networkAddress }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.networkAddress)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Broadcast Address
                </td>
                <td class="p-3 font-mono text-default">
                  {{ calculation.data.broadcastAddress }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.broadcastAddress)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Subnet Mask (Netmask)
                </td>
                <td class="p-3 font-mono text-default">
                  {{ calculation.data.netmask }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.netmask)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Wildcard Mask
                </td>
                <td class="p-3 font-mono text-default">
                  {{ calculation.data.wildcard }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.wildcard)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  First Usable Host
                </td>
                <td class="p-3 font-mono text-success font-semibold">
                  {{ calculation.data.firstUsableIp }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.firstUsableIp)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Last Usable Host
                </td>
                <td class="p-3 font-mono text-success font-semibold">
                  {{ calculation.data.lastUsableIp }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(calculation.data.lastUsableIp)"
                  />
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  IP in Binary
                </td>
                <td
                  class="p-3 font-mono text-xs text-muted"
                  colspan="2"
                >
                  {{ calculation.data.ipBinary }}
                </td>
              </tr>
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Mask in Binary
                </td>
                <td
                  class="p-3 font-mono text-xs text-muted"
                  colspan="2"
                >
                  {{ calculation.data.maskBinary }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
