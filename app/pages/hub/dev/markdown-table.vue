<script setup lang="ts">
import type { ColumnAlign, ParsedTable } from '#shared/utils/dev/markdown-table'
import { StorageSerializers, useStorage } from '@vueuse/core'
import { formatMarkdownTable, parseDelimitedCells, parseTableInput } from '#shared/utils/dev/markdown-table'

useToolSeo('markdown-table')

const DRAFT_KEY = 'kitdev:markdown-table:draft'
const ALIGNMENTS: { value: ColumnAlign, icon: string }[] = [
  { value: 'left', icon: 'i-lucide-align-left' },
  { value: 'center', icon: 'i-lucide-align-center' },
  { value: 'right', icon: 'i-lucide-align-right' },
]

const headers = ref<string[]>(['Feature', 'Status', 'Notes'])
const alignments = ref<ColumnAlign[]>(['left', 'center', 'left'])
const rows = ref<string[][]>([
  ['Dark Mode', 'Done', 'Built with Tailwind'],
  ['Search', 'Active', 'Command palette Cmd+K'],
  ['Offline', 'Planned', 'Service Worker'],
])

const importText = ref('')
const importError = ref<string | null>(null)

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()
const { reportInput } = useToolInput()

const markdownOutput = computed(() => formatMarkdownTable({
  headers: headers.value,
  alignments: alignments.value,
  rows: rows.value,
}))
useLiveTool(markdownOutput)

const tableState = computed<ParsedTable>(() => ({
  headers: [...headers.value],
  alignments: [...alignments.value],
  rows: rows.value.map(row => [...row]),
}))

/** The name of a column for a screen reader. The index keeps each name unique. */
function columnLabel(index: number): string {
  const name = headers.value[index]?.trim()
  return name ? `column ${index + 1} (${name})` : `column ${index + 1}`
}

function moveItem<T>(list: T[], from: number, to: number) {
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item as T)
}

function addColumn() {
  headers.value.push(`Column ${headers.value.length + 1}`)
  alignments.value.push('left')
  rows.value.forEach(row => row.push(''))
}

function removeColumn(index: number) {
  if (headers.value.length <= 1)
    return
  headers.value.splice(index, 1)
  alignments.value.splice(index, 1)
  rows.value.forEach(row => row.splice(index, 1))
}

function moveColumn(index: number, step: number) {
  const target = index + step
  if (target < 0 || target >= headers.value.length)
    return
  moveItem(headers.value, index, target)
  moveItem(alignments.value, index, target)
  rows.value.forEach(row => moveItem(row, index, target))
}

function addRow() {
  rows.value.push(Array.from<string>({ length: headers.value.length }).fill(''))
}

function removeRow(index: number) {
  if (rows.value.length <= 1)
    return
  rows.value.splice(index, 1)
}

function moveRow(index: number, step: number) {
  const target = index + step
  if (target < 0 || target >= rows.value.length)
    return
  moveItem(rows.value, index, target)
}

function applyTable(table: ParsedTable) {
  headers.value = [...table.headers]
  alignments.value = table.headers.map((_, i) => table.alignments[i] ?? 'left')
  rows.value = table.rows.map(row => [...row])
}

function handleImport() {
  if (!importText.value.trim())
    return
  try {
    applyTable(parseTableInput(importText.value))
    importError.value = null
  }
  catch (cause) {
    importError.value = cause instanceof Error ? cause.message : 'The import failed.'
  }
}

/** Fill the grid from spreadsheet clipboard text. The grid grows to hold it. */
function handleCellPaste(event: ClipboardEvent, rowIndex: number, colIndex: number) {
  const text = event.clipboardData?.getData('text/plain') ?? ''
  if (!/[\t\n\r]/.test(text.trim()))
    return

  let cells: string[][]
  try {
    cells = parseDelimitedCells(text)
  }
  catch {
    return
  }

  event.preventDefault()
  const width = colIndex + Math.max(...cells.map(line => line.length))

  while (headers.value.length < width) {
    addColumn()
  }
  cells.forEach((line, offset) => {
    while (rows.value.length <= rowIndex + offset) {
      addRow()
    }
    const target = rows.value[rowIndex + offset]!
    line.forEach((value, index) => {
      target[colIndex + index] = value
    })
  })
  reportInput('paste')
}

function handleDownload() {
  downloadText('table.md', markdownOutput.value, 'text/markdown')
}

const saveDraft = useToolOption<boolean>('save-draft', false)
const draft = useStorage<ParsedTable | null>(DRAFT_KEY, null, undefined, {
  serializer: StorageSerializers.object,
})
const hasDraft = computed(() => Boolean(draft.value))

onMounted(() => {
  const stored = draft.value
  // Local storage is editable by hand, so check the shape before you use it.
  if (saveDraft.value && Array.isArray(stored?.headers) && Array.isArray(stored.rows)) {
    applyTable(stored)
  }
})

watchDebounced(tableState, (state) => {
  if (saveDraft.value) {
    draft.value = state
  }
}, { debounce: 400 })

watch(saveDraft, (enabled) => {
  draft.value = enabled ? tableState.value : null
})

function handleClearDraft() {
  draft.value = null
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <ToolActions>
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            label="Add Column"
            @click="addColumn"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            label="Add Row"
            @click="addRow"
          />
        </ToolActions>

        <ToolActions>
          <USwitch
            v-model="saveDraft"
            label="Save draft"
          />
          <UButton
            v-if="saveDraft || hasDraft"
            label="Clear Draft"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            :disabled="!hasDraft"
            @click="handleClearDraft"
          />
          <UButton
            :label="copyLabel('markdown')"
            :color="copyColor('markdown')"
            :icon="copyIcon('markdown')"
            size="xs"
            variant="subtle"
            aria-label="Copy the Markdown table"
            @click="copy(markdownOutput, 'markdown')"
          />
          <UButton
            label="Download .md"
            color="neutral"
            variant="subtle"
            size="xs"
            icon="i-lucide-download"
            aria-label="Download the Markdown table"
            @click="handleDownload"
          />
        </ToolActions>
      </div>

      <div class="overflow-x-auto border border-default rounded-xl bg-default">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-elevated/80 border-b border-default">
              <th class="w-10 px-2 py-2 text-center text-muted font-mono">
                #
              </th>
              <th
                v-for="(_, cIndex) in headers"
                :key="cIndex"
                class="p-2 min-w-[180px] border-r border-default last:border-r-0"
              >
                <div class="space-y-1.5">
                  <UInput
                    v-model="headers[cIndex]"
                    placeholder="Header name"
                    size="xs"
                    class="w-full font-semibold"
                    :aria-label="`Name of ${columnLabel(cIndex)}`"
                  />
                  <div class="flex items-center justify-between gap-1">
                    <div class="flex items-center gap-0.5 bg-default rounded p-0.5 border border-default">
                      <UButton
                        v-for="align in ALIGNMENTS"
                        :key="align.value"
                        size="xs"
                        :variant="alignments[cIndex] === align.value ? 'solid' : 'ghost'"
                        color="neutral"
                        :icon="align.icon"
                        class="p-1 h-auto"
                        :aria-label="`Align ${columnLabel(cIndex)} ${align.value}`"
                        @click="alignments[cIndex] = align.value"
                      />
                    </div>
                    <div class="flex items-center gap-0.5">
                      <UButton
                        icon="i-lucide-chevron-left"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        class="p-1 h-auto"
                        :disabled="cIndex === 0"
                        :aria-label="`Move ${columnLabel(cIndex)} left`"
                        @click="moveColumn(cIndex, -1)"
                      />
                      <UButton
                        icon="i-lucide-chevron-right"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        class="p-1 h-auto"
                        :disabled="cIndex === headers.length - 1"
                        :aria-label="`Move ${columnLabel(cIndex)} right`"
                        @click="moveColumn(cIndex, 1)"
                      />
                      <UButton
                        icon="i-lucide-x"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        class="p-1 h-auto"
                        :disabled="headers.length <= 1"
                        :aria-label="`Delete ${columnLabel(cIndex)}`"
                        @click="removeColumn(cIndex)"
                      />
                    </div>
                  </div>
                </div>
              </th>
              <th class="w-24" />
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(row, rIndex) in rows"
              :key="rIndex"
              class="hover:bg-elevated/30"
            >
              <td class="px-2 py-1.5 text-center text-muted select-none font-mono align-top">
                {{ rIndex + 1 }}
              </td>
              <td
                v-for="(_, cIndex) in headers"
                :key="cIndex"
                class="p-1.5 border-r border-default last:border-r-0 align-top"
                @paste="handleCellPaste($event, rIndex, cIndex)"
              >
                <UTextarea
                  v-model="row[cIndex]"
                  placeholder="Cell value"
                  size="xs"
                  :rows="1"
                  autoresize
                  class="w-full"
                  :aria-label="`Row ${rIndex + 1} ${columnLabel(cIndex)} value`"
                />
              </td>
              <td class="px-2 py-1.5 align-top">
                <div class="flex items-center gap-0.5">
                  <UButton
                    icon="i-lucide-chevron-up"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="p-1 h-auto"
                    :disabled="rIndex === 0"
                    :aria-label="`Move row ${rIndex + 1} up`"
                    @click="moveRow(rIndex, -1)"
                  />
                  <UButton
                    icon="i-lucide-chevron-down"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="p-1 h-auto"
                    :disabled="rIndex === rows.length - 1"
                    :aria-label="`Move row ${rIndex + 1} down`"
                    @click="moveRow(rIndex, 1)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="p-1 h-auto"
                    :disabled="rows.length <= 1"
                    :aria-label="`Delete row ${rIndex + 1}`"
                    @click="removeRow(rIndex)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3">
        <LazyToolEditor
          v-model="importText"
          hydrate-on-idle
          label="Markdown or spreadsheet input"
          placeholder="Paste a Markdown table, CSV text, or tab-separated text."
          :rows="6"
          lang="markdown"
        />
        <ToolError
          v-if="importError"
          :message="importError"
        />
        <ToolActions>
          <UButton
            label="Import"
            color="neutral"
            variant="subtle"
            size="xs"
            icon="i-lucide-table"
            :disabled="!importText.trim()"
            aria-label="Import the pasted table into the grid"
            @click="handleImport"
          />
        </ToolActions>
      </div>

      <LazyToolEditor
        :model-value="markdownOutput"
        hydrate-on-idle
        label="Markdown Output"
        readonly
        lang="markdown"
      />
    </div>

    <template #docs>
      <ToolDocs title="About Markdown tables">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a Markdown table from cells that you fill in. It writes the pipes and the separator row, and it aligns the columns so the source stays readable.
          </p>
          <p>
            Markdown table syntax is easy to break by hand. One missing pipe, or a separator row with the wrong column count, and the whole table renders as plain text.
          </p>
          <p>
            Set the alignment for each column with the colon marks in the separator row. Use right alignment for a number column, so the digits line up.
          </p>
          <p>
            Paste rows from a spreadsheet into any cell. The tool reads tab-separated and comma-separated text, and it keeps a quoted field that holds a comma or a line break. The Import action also reads a full Markdown table back into the grid.
          </p>
          <p>
            A line break inside a cell becomes a <code>&lt;br&gt;</code> tag, because a raw line break ends the row. A pipe inside a cell becomes <code>\|</code> for the same reason.
          </p>
          <p>
            The Save draft switch is off. Turn it on to keep the table in this browser between visits. The Clear Draft action deletes the stored table.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Markdown Studio', to: '/hub/data/markdown-studio' },
            { label: 'CSV ↔ JSON', to: '/hub/data/converters/csv-json' },
            { label: 'Table Viewer', to: '/hub/data/table-viewer' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
