<script setup lang="ts">
import { parseCidr } from '#shared/utils/network/cidr'

useToolSeo('cidr')

const input = ref('192.168.1.0/24')
const { copy } = useCopyFeedback()

const presets = [
  { label: 'Home LAN (/24)', value: '192.168.1.0/24' },
  { label: 'VPC Subnet (/20)', value: '10.0.0.0/20' },
  { label: 'Class B (/16)', value: '172.16.0.0/16' },
  { label: 'Point-to-Point (/31)', value: '10.255.0.0/31' },
  { label: 'Host Route (/32)', value: '1.1.1.1/32' },
]

const calculation = computed(() => {
  if (!input.value.trim())
    return { data: null, error: null }
  try {
    const data = parseCidr(input.value)
    return { data, error: null }
  }
  catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid CIDR notation.',
    }
  }
})
useLiveTool(calculation)

function handlePreset(val: string) {
  input.value = val
}
</script>

<template>
  <ToolPage>
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
      <UFormField label="IP Address & CIDR Prefix" class="max-w-md">
        <UInput
          v-model="input"
          placeholder="e.g. 192.168.1.0/24"
          class="font-mono text-base"
        />
      </UFormField>

      <!-- Error Alert -->
      <ToolError
        v-if="calculation.error"
        :message="calculation.error"
      />

      <!-- Calculation Results -->
      <div
        v-if="calculation.data"
        class="space-y-6"
      >
        <!-- Top Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Usable Hosts"
            :value="calculation.data.usableHosts"
            color="primary"
          />
          <StatCard
            label="Total Addresses"
            :value="calculation.data.totalHosts"
          />
          <StatCard
            label="IP Class"
            :value="`Class ${calculation.data.ipClass}`"
          />
          <StatCard
            label="Scope"
            :value="calculation.data.isPrivate ? 'Private (RFC 1918)' : calculation.data.isLinkLocal ? 'Link-Local' : calculation.data.isLoopback ? 'Loopback' : 'Public'"
            :color="calculation.data.isPrivate || calculation.data.isLinkLocal ? 'warning' : 'success'"
          />
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

    <template #docs>
      <ToolDocs title="About CIDR and subnets">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads a CIDR block such as 10.0.0.0/24 and gives the netmask, the network address, the broadcast address, the first and last usable address, and the host count.
          </p>
          <p>
            The prefix length states how many bits name the network. A smaller number gives a larger block. A /24 holds 256 addresses and 254 usable hosts, because the network address and the broadcast address are reserved.
          </p>
          <p>
            Use it to plan a VPC, to write a firewall rule, or to check that two subnets do not overlap.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'IP Address Info', to: '/hub/network/ip-info' },
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
