<script setup lang="ts">
import {
  type ChmodPermissions,
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic
} from '#shared/utils/dev/chmod'

useToolSeo('chmod')

const permissions = ref<ChmodPermissions>(octalToPermissions('755'))
const octalInput = ref('755')
const fileName = ref('file.txt')

const { copy, label, color, icon } = useCopyFeedback()

const symbolicOutput = computed(() => permissionsToSymbolic(permissions.value))
const octalOutput = computed(() => permissionsToOctal(permissions.value))
const chmodCommand = computed(() => `chmod ${octalOutput.value} ${fileName.value.trim() || 'file.txt'}`)

watch(octalInput, (val) => {
  try {
    permissions.value = octalToPermissions(val)
  } catch {
    // Ignore partial edits
  }
})

function onPermChange() {
  octalInput.value = permissionsToOctal(permissions.value)
}

function applyPreset(octal: string) {
  octalInput.value = octal
  permissions.value = octalToPermissions(octal)
}

function handleCopy() {
  copy(chmodCommand.value)
}

useSeoMeta({
  title: 'Chmod Calculator — KitDev Space',
  description: 'Convert between octal and symbolic Linux file permissions.'
})
</script>

<template>
  <ToolPage
    title="Chmod Calculator"
    description="Convert between octal numbers and symbolic file permissions."
  >
    <div class="space-y-6">
      <!-- Top outputs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField label="Octal Value">
          <UInput
            v-model="octalInput"
            placeholder="755"
            size="lg"
            class="font-mono text-center text-lg"
          />
        </UFormField>

        <UFormField label="Symbolic Notation">
          <UInput
            :model-value="symbolicOutput"
            readonly
            size="lg"
            class="font-mono text-center text-lg"
          />
        </UFormField>

        <UFormField label="Sample File Name">
          <UInput
            v-model="fileName"
            placeholder="file.txt"
            size="lg"
            class="font-mono"
          />
        </UFormField>
      </div>

      <!-- Presets -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted font-medium mr-1">Presets:</span>
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="644 (Standard File)"
          @click="applyPreset('644')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="755 (Directory / Script)"
          @click="applyPreset('755')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="600 (Private Key)"
          @click="applyPreset('600')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="700 (Private Dir)"
          @click="applyPreset('700')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="777 (Full Access)"
          @click="applyPreset('777')"
        />
      </div>

      <!-- Interactive Checkbox Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border border-default rounded-xl p-4 bg-elevated/40">
        <!-- Owner -->
        <div class="space-y-3 p-3 bg-default rounded-lg border border-default">
          <h4 class="font-medium text-sm text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-user"
              class="size-4 text-primary"
            />
            Owner (User)
          </h4>
          <div class="space-y-2">
            <UCheckbox
              v-model="permissions.owner.read"
              label="Read (r = 4)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.owner.write"
              label="Write (w = 2)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.owner.execute"
              label="Execute (x = 1)"
              @update:model-value="onPermChange"
            />
          </div>
        </div>

        <!-- Group -->
        <div class="space-y-3 p-3 bg-default rounded-lg border border-default">
          <h4 class="font-medium text-sm text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-users"
              class="size-4 text-primary"
            />
            Group
          </h4>
          <div class="space-y-2">
            <UCheckbox
              v-model="permissions.group.read"
              label="Read (r = 4)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.group.write"
              label="Write (w = 2)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.group.execute"
              label="Execute (x = 1)"
              @update:model-value="onPermChange"
            />
          </div>
        </div>

        <!-- Others -->
        <div class="space-y-3 p-3 bg-default rounded-lg border border-default">
          <h4 class="font-medium text-sm text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-globe"
              class="size-4 text-primary"
            />
            Others (Public)
          </h4>
          <div class="space-y-2">
            <UCheckbox
              v-model="permissions.others.read"
              label="Read (r = 4)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.others.write"
              label="Write (w = 2)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.others.execute"
              label="Execute (x = 1)"
              @update:model-value="onPermChange"
            />
          </div>
        </div>
      </div>

      <!-- Generated Command -->
      <div class="p-4 rounded-xl border border-default bg-elevated/60 flex items-center justify-between gap-4">
        <div>
          <span class="text-xs text-muted font-medium block">Command</span>
          <code class="text-sm font-mono text-highlighted select-all">{{ chmodCommand }}</code>
        </div>
        <UButton
          :label="label()"
          :color="color()"
          :icon="icon()"
          variant="subtle"
          @click="handleCopy"
        />
      </div>
    </div>
  </ToolPage>
</template>
