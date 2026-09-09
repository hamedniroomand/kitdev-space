<script setup lang="ts">
import type { ChmodPermissions } from '#shared/utils/dev/chmod'
import {
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  quoteShellPath,
  symbolicToPermissions,
} from '#shared/utils/dev/chmod'

useToolSeo('chmod')

const permissions = ref<ChmodPermissions>(octalToPermissions('755'))
const octalInput = ref('755')
const symbolicInput = ref(permissionsToSymbolic(permissions.value))
const fileName = ref('file.txt')
const octalError = ref<string | null>(null)
const symbolicError = ref<string | null>(null)

const { copy, label, color, icon } = useCopyFeedback()

const octalOutput = computed(() => permissionsToOctal(permissions.value))
useLiveTool(octalOutput)
const chmodCommand = computed(
  () => `chmod ${octalOutput.value} ${quoteShellPath(fileName.value.trim() || 'file.txt')}`,
)

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/** Each handler writes the other field only, so it never replaces the input of the user. */
function onOctalEdit() {
  try {
    permissions.value = octalToPermissions(octalInput.value)
    symbolicInput.value = permissionsToSymbolic(permissions.value)
    octalError.value = null
    symbolicError.value = null
  }
  catch (err) {
    octalError.value = message(err, 'The octal value is not valid.')
  }
}

function onSymbolicEdit() {
  try {
    permissions.value = symbolicToPermissions(symbolicInput.value)
    octalInput.value = permissionsToOctal(permissions.value)
    octalError.value = null
    symbolicError.value = null
  }
  catch (err) {
    symbolicError.value = message(err, 'The symbolic value is not valid.')
  }
}

function onPermChange() {
  octalError.value = null
  symbolicError.value = null
  octalInput.value = permissionsToOctal(permissions.value)
  symbolicInput.value = permissionsToSymbolic(permissions.value)
}

function applyPreset(octal: string) {
  permissions.value = octalToPermissions(octal)
  onPermChange()
}

function handleCopy() {
  copy(chmodCommand.value, 'command', 'result')
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Top outputs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField
          label="Octal Value"
          :error="octalError ?? undefined"
        >
          <UInput
            v-model="octalInput"
            placeholder="755"
            size="lg"
            class="font-mono text-center text-lg"
            @update:model-value="onOctalEdit"
          />
        </UFormField>

        <UFormField
          label="Symbolic Notation"
          :error="symbolicError ?? undefined"
          help="Paste a permission string from ls -l."
        >
          <UInput
            v-model="symbolicInput"
            placeholder="rwxr-xr-x"
            size="lg"
            class="font-mono text-center text-lg"
            @update:model-value="onSymbolicEdit"
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
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="4755 (SetUID Binary)"
          @click="applyPreset('4755')"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          label="1777 (Sticky Temp Dir)"
          @click="applyPreset('1777')"
        />
      </div>

      <!-- Interactive Checkbox Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 border border-default rounded-xl p-4 bg-elevated/40">
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

        <!-- Special bits -->
        <div class="space-y-3 p-3 bg-default rounded-lg border border-default">
          <h4 class="font-medium text-sm text-highlighted flex items-center gap-2">
            <UIcon
              name="i-lucide-lock"
              class="size-4 text-primary"
            />
            Special Bits
          </h4>
          <div class="space-y-2">
            <UCheckbox
              v-model="permissions.special.setuid"
              label="SetUID (s = 4)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.special.setgid"
              label="SetGID (s = 2)"
              @update:model-value="onPermChange"
            />
            <UCheckbox
              v-model="permissions.special.sticky"
              label="Sticky (t = 1)"
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
          :label="label('command')"
          :color="color('command')"
          :icon="icon('command')"
          variant="subtle"
          @click="handleCopy"
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About file permissions">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts between the octal form of a Unix permission, such as 755, and the symbolic form, such as rwxr-xr-x. Change either form and the other updates.
          </p>
          <p>
            Each digit covers one group: the owner, the group, and everybody else. The digit is the sum of read (4), write (2), and execute (1). So 7 is read, write, and execute, and 5 is read and execute.
          </p>
          <p>
            Use 644 for a normal file and 755 for a directory or a script. Never use 777, because it lets any user on the machine change the file. An SSH private key needs 600, or the client refuses to use it.
          </p>
          <h3 class="text-highlighted font-medium">
            Execute permission on a file and on a directory
          </h3>
          <p>
            The execute bit has a different function on a file and on a directory. On a file, the execute bit lets the kernel run the file as a program. On a directory, the same bit gives search permission. The command <code>chmod +x</code> on a directory therefore adds search permission. It does not make the directory runnable.
          </p>
          <p>
            Search permission lets a process use a name inside the directory. The kernel resolves a path one directory at a time. It must have search permission on each directory in the path. The command <code>cat /home/user/notes.txt</code> needs search permission on <code>/</code>, on <code>/home</code>, and on <code>/home/user</code>. Without it, the kernel refuses the request, even when the file itself is readable.
          </p>
          <p>
            Read permission on a directory is a different right. It lets a process list the names in the directory. A directory with mode 444 (r--r--r--) lets a user read the list of names, but the user cannot open a file in it. A directory with mode 111 (--x--x--x) lets a user open a file by its exact name, but the user cannot read the list of names. A directory therefore needs 755 and not 644.
          </p>
          <h3 class="text-highlighted font-medium">
            Special bits
          </h3>
          <p>
            SetUID (4) runs a program with the identity of the file owner. SetGID (2) runs a program with the identity of the file group, and on a directory it gives each new file the group of the directory. The sticky bit (1) on a shared directory, such as <code>/tmp</code> with mode 1777, lets only the owner of a file delete that file.
          </p>
          <p>
            A special bit changes the execute character of the symbolic form. A lowercase character (<code>s</code> or <code>t</code>) shows that execute permission is also on. An uppercase character (<code>S</code> or <code>T</code>) shows that execute permission is off.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Number Base Converter', to: '/hub/data/number-base' },
            { label: 'Glob Tester', to: '/hub/dev/glob-tester' },
            { label: 'Tar Explorer', to: '/hub/dev/tar' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
