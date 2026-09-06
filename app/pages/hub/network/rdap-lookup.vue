<script setup lang="ts">
import { ref } from 'vue'
import type { RdapResult } from '~~/server/utils/network/rdap'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const query = ref('github.com')

const { status, error, result, run, reset } = useTool<RdapResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('rdap-lookup')

async function lookup() {
  if (!query.value.trim()) return

  await run(async () => {
    try {
      const data = await $fetch<{ result: RdapResult }>('/api/network/rdap', {
        method: 'POST',
        body: {
          query: query.value.trim()
        }
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The RDAP lookup failed.',
        { cause }
      )
    }
  })
}

function handleCopy() {
  if (!result.value?.raw) return
  copy(JSON.stringify(result.value.raw, null, 2))
}

function handleReset() {
  query.value = ''
  reset()
}
</script>

<template>
  <ToolPage
    title="RDAP / WHOIS Lookup"
    description="Query domain name and IP address registration data through standard RDAP HTTP endpoints."
  >
    <div class="space-y-6">
      <!-- Search Input Section -->
      <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-muted">Domain Name or IP Address</label>
          <div class="flex gap-2">
            <UInput
              v-model="query"
              placeholder="e.g. example.com or 1.1.1.1"
              icon="i-lucide-globe"
              class="w-full flex-1"
              @keydown.enter="lookup"
            />
            <UButton
              label="Lookup"
              icon="i-lucide-search"
              color="primary"
              size="sm"
              :loading="status === 'processing'"
              @click="lookup"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">Try:</span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="github.com"
              @click="query = 'github.com'; lookup()"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="google.com"
              @click="query = 'google.com'; lookup()"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="1.1.1.1"
              @click="query = '1.1.1.1'; lookup()"
            />
          </div>

          <UButton
            label="Clear"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-eraser"
            :disabled="!query && !result"
            @click="handleReset"
          />
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Lookup Error"
        :description="error"
      />

      <!-- Results View -->
      <div
        v-if="result"
        class="space-y-6"
      >
        <!-- Unregistered / Available Notice -->
        <div
          v-if="!result.found"
          class="p-6 rounded-xl border border-info/40 bg-info/5 text-center space-y-2"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-8 h-8 text-info mx-auto"
          />
          <div class="text-base font-semibold text-default">
            {{ result.query }} is Available
          </div>
          <div class="text-xs text-muted">
            No active RDAP registration records exist for this query.
          </div>
        </div>

        <!-- Registered Domain / IP Report -->
        <template v-else>
          <!-- Top Metric Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Registration Status
              </div>
              <div class="flex items-center gap-1.5 pt-1">
                <UBadge
                  size="md"
                  color="success"
                  variant="subtle"
                  class="font-semibold"
                >
                  Registered
                </UBadge>
                <UBadge
                  v-if="result.dnssec"
                  size="sm"
                  color="primary"
                  variant="outline"
                >
                  DNSSEC
                </UBadge>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Time Until Expiration
              </div>
              <div class="text-xl font-bold font-mono text-default pt-1">
                {{ result.daysUntilExpiration !== undefined ? `${result.daysUntilExpiration} days` : '—' }}
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Created On
              </div>
              <div class="text-sm font-semibold font-mono text-default pt-1">
                {{ result.registrationDate ? result.registrationDate.split('T')[0] : '—' }}
              </div>
            </div>

            <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-1">
              <div class="text-xs text-muted font-medium">
                Expires On
              </div>
              <div class="text-sm font-semibold font-mono text-default pt-1">
                {{ result.expirationDate ? result.expirationDate.split('T')[0] : '—' }}
              </div>
            </div>
          </div>

          <!-- Registrar & Status Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Registrar Card -->
            <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
              <h3 class="text-sm font-semibold text-default flex items-center gap-2">
                <UIcon
                  name="i-lucide-building-2"
                  class="w-4 h-4 text-primary"
                />
                Registrar Information
              </h3>

              <div class="space-y-2 text-xs">
                <div class="grid grid-cols-3 gap-1 py-1 border-b border-default">
                  <span class="text-muted">Name:</span>
                  <span class="col-span-2 text-default font-medium">{{ result.registrar?.name || '—' }}</span>
                </div>
                <div class="grid grid-cols-3 gap-1 py-1 border-b border-default">
                  <span class="text-muted">IANA ID:</span>
                  <span class="col-span-2 text-default font-mono">{{ result.registrar?.ianaId || '—' }}</span>
                </div>
                <div class="grid grid-cols-3 gap-1 py-1 border-b border-default">
                  <span class="text-muted">Abuse Email:</span>
                  <span class="col-span-2 text-default font-mono">{{ result.registrar?.abuseEmail || '—' }}</span>
                </div>
                <div class="grid grid-cols-3 gap-1 py-1">
                  <span class="text-muted">Abuse Phone:</span>
                  <span class="col-span-2 text-default font-mono">{{ result.registrar?.abusePhone || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Domain Status Codes & Dates -->
            <div class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3">
              <h3 class="text-sm font-semibold text-default flex items-center gap-2">
                <UIcon
                  name="i-lucide-activity"
                  class="w-4 h-4 text-primary"
                />
                Domain Status Flags
              </h3>

              <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                <UBadge
                  v-for="st in result.status"
                  :key="st"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  class="font-mono text-[11px]"
                >
                  {{ st }}
                </UBadge>
              </div>

              <div
                v-if="result.updatedDate"
                class="pt-2 text-xs text-muted"
              >
                Last updated: <span class="font-mono text-default">{{ result.updatedDate.split('T')[0] }}</span>
              </div>
            </div>
          </div>

          <!-- Nameservers -->
          <div
            v-if="result.nameservers.length > 0"
            class="p-4 rounded-xl border border-default bg-elevated/10 space-y-3"
          >
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-server"
                class="w-4 h-4 text-primary"
              />
              Authoritative Nameservers ({{ result.nameservers.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="ns in result.nameservers"
                :key="ns"
                size="xs"
                color="neutral"
                variant="outline"
                class="font-mono text-xs px-2.5 py-1"
              >
                {{ ns }}
              </UBadge>
            </div>
          </div>

          <!-- Raw RDAP JSON Section -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-default flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-file-json"
                  class="w-3.5 h-3.5 text-primary"
                />
                Raw RDAP Response
              </label>
              <UButton
                size="xs"
                variant="subtle"
                :label="copyLabel()"
                :color="copyColor()"
                :icon="copyIcon()"
                @click="handleCopy"
              />
            </div>
            <ToolEditor
              :model-value="JSON.stringify(result.raw, null, 2)"
              label="RDAP JSON"
              lang="json"
              :rows="14"
              readonly
            />
          </div>
        </template>
      </div>
    </div>
  </ToolPage>
</template>
