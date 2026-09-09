<script setup lang="ts">
import { sqliteCompletion } from '~/utils/sqlite/completion'

useToolSeo('sqlite-studio')

const {
  isReady,
  isExecuting,
  error,
  tables,
  objects,
  activeTable,
  activeTableInfo,
  activeQuery,
  queryResult,
  databaseName,
  databaseSizeBytes,
  tableQuery,
  tableTotal,
  isCustomQuery,
  selectedRowid,
  schemaSql,
  schemaOpen,
  csvImport,
  statementResults,
  pendingEdits,
  history,
  snippets,
  loadDatabaseFile,
  createBlankDatabase,
  loadSampleDatabase,
  executeQuery,
  cancelQuery,
  prepareCsvImport,
  cancelCsvImport,
  confirmCsvImport,
  selectTable,
  updateTableQuery,
  toggleSort,
  backToTable,
  updateCell,
  insertRow,
  duplicateRow,
  deleteRow,
  showSchema,
  selectRow,
  downloadDatabase,
  exportCsv,
  exportJson,
  closeDatabase,
} = useSqliteStudio()

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const activeStatement = ref(0)

const sqlExtensions = [sqliteCompletion(() => tables.value)]

function handleDroppedFile(file: File) {
  if (/\.(?:csv|tsv)$/i.test(file.name)) {
    prepareCsvImport(file)
    return
  }
  loadDatabaseFile(file)
}

const columnTypes = computed(() => {
  const info = activeTableInfo.value
  if (!info) {
    return undefined
  }
  return Object.fromEntries(info.columns.map(column => [column.name, column.type]))
})

// A multi-statement run shows the result of the selected statement; a single
// statement keeps the primary result.
const shownResult = computed(() => {
  const list = statementResults.value
  if (!list || list.length === 0) {
    return queryResult.value
  }
  return list[activeStatement.value] ?? queryResult.value
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div
      v-if="!isReady"
      class="flex-1 overflow-y-auto"
    >
      <UContainer class="max-w-5xl py-12">
        <ToolHeader />
        <SqliteWelcome
          :loading="isExecuting"
          @load-file="handleDroppedFile"
          @create-blank="createBlankDatabase"
          @load-sample="loadSampleDatabase"
        />

        <div class="mt-16 border-t border-default pt-10">
          <ToolDocs title="About SQLite Studio">
            <div class="space-y-4 text-muted">
              <p>
                This tool opens a SQLite database in your browser. You can read the tables, run a SQL
                query, change a cell, and export the result as CSV or JSON.
              </p>
              <p>
                The database engine runs on WebAssembly in the browser tab. The file is never
                uploaded, so you can open a production copy or a database that holds personal data.
              </p>
              <p>
                Open a file, or start with a blank database or the sample. Select a table to see its
                rows. Search the text columns, add a filter, sort a column, and page through the rows.
                Each control writes the SQL that it runs into the editor, so you can read it, change
                it, and run it. Select a row to duplicate it or delete it. Double-click a cell to edit
                it. Then download the database to keep your changes, because the browser does not save
                the file for you.
              </p>
              <p>
                <strong>Unsaved changes:</strong>
                The toolbar counts each change that you have not downloaded. The tool asks for
                confirmation before it closes a database that holds a change, because closing loses
                it.
              </p>
              <p>
                <strong>Two kinds of export:</strong>
                Export results gives the rows of the current result as CSV or JSON. Export database
                gives the whole <code>.sqlite</code> file. A result export is not a backup.
              </p>
              <p>
                <strong>Many statements:</strong>
                Run more than one statement at a time, and the tool gives a tab for each one. An
                <code>INSERT</code>, an <code>UPDATE</code>, and a <code>DELETE</code> show the count
                of the rows that changed.
              </p>
              <p>
                <strong>Stop a query:</strong>
                Select Stop to end a query that runs too long. SQLite cannot interrupt a busy call,
                so the tool restarts the database engine and loads the last saved state. A change
                that you did not download is lost.
              </p>
              <p>
                <strong>Import a CSV file:</strong>
                Drop a <code>.csv</code> file to open a preview. Set the type of each column, then
                import. The tool writes a typed <code>CREATE TABLE</code> and inserts every row
                inside one transaction, so a failure writes nothing. A value with a leading zero,
                such as a postal code, stays text.
              </p>
              <p>
                <strong>Autocompletion:</strong>
                The editor completes a table name and a column name from the schema of the open
                database, next to the SQLite keywords. The sidebar lists the tables, the views, the
                indexes, and the triggers.
              </p>
              <p>
                <strong>Limits:</strong>
                The database stays in memory, so the browser keeps nothing after you close the tab.
                A result shows the first 1000 rows; add a <code>LIMIT</code> or a filter to see the
                rest. A BLOB cell shows its size and the first bytes as hex, never the whole value.
                The tool reads no remote database and sends no file to a server.
              </p>
            </div>
            <RelatedTools
              class="mt-8"
              :items="[
                { label: 'Table Viewer', to: '/hub/data/table-viewer' },
                { label: 'SQL Formatter', to: '/hub/data/sql-formatter' },
                { label: 'CSV ↔ JSON', to: '/hub/data/converters/csv-json' },
              ]"
            />
          </ToolDocs>
        </div>
      </UContainer>
    </div>

    <template v-else>
      <SqliteToolbar
        :database-name="databaseName"
        :size-bytes="databaseSizeBytes"
        :table-count="tables.length"
        :pending-edits="pendingEdits"
        @download-db="downloadDatabase"
        @export-csv="exportCsv"
        @export-json="exportJson"
        @close="closeDatabase"
      />

      <div class="flex-1 flex overflow-hidden">
        <SqliteSidebar
          :tables="tables"
          :objects="objects"
          :active-table="activeTable"
          @select-table="selectTable"
        />

        <main class="flex-1 flex flex-col overflow-hidden">
          <SqliteEditor
            v-model="activeQuery"
            :executing="isExecuting"
            :error="error"
            :duration-ms="shownResult?.durationMs"
            :row-count="shownResult?.rowCount"
            :rows-affected="shownResult?.rowsAffected"
            :history="history"
            :snippets="snippets"
            :extensions="sqlExtensions"
            @run="executeQuery"
            @cancel="cancelQuery"
          />
          <SqliteStatementTabs
            v-if="statementResults && statementResults.length > 1"
            v-model="activeStatement"
            :results="statementResults"
          />
          <SqliteQueryBar
            v-if="activeTableInfo && tableQuery"
            :table="activeTableInfo"
            :state="tableQuery"
            :total="tableTotal"
            :shown-rows="queryResult?.rows.length ?? 0"
            :custom="isCustomQuery"
            :selected-rowid="selectedRowid"
            :busy="isExecuting"
            @update="updateTableQuery"
            @add-row="insertRow"
            @duplicate-row="duplicateRow"
            @delete-row="deleteRow"
            @show-schema="showSchema"
            @back-to-table="backToTable"
          />
          <SqliteGrid
            :result="shownResult"
            :active-table="activeTable"
            :offset="isCustomQuery ? 0 : tableQuery?.offset"
            :sort="isCustomQuery ? null : tableQuery?.sort"
            :sortable="!isCustomQuery"
            :selected-rowid="selectedRowid"
            :column-types="columnTypes"
            @update-cell="updateCell($event.table, $event.rowid, $event.column, $event.value)"
            @sort="toggleSort"
            @select-row="selectRow"
          />
        </main>
      </div>

      <USlideover
        v-model:open="schemaOpen"
        :title="`Schema of ${activeTable}`"
        description="The CREATE statements that the database holds for this table and its indexes."
      >
        <template #body>
          <pre class="overflow-x-auto whitespace-pre-wrap rounded-md border border-default bg-elevated/40 p-3 font-mono text-xs text-highlighted">{{ schemaSql }}</pre>
        </template>
        <template #footer>
          <UButton
            :label="copyLabel('default', 'Copy the schema')"
            :color="copyColor()"
            variant="subtle"
            :icon="copyIcon()"
            @click="copy(schemaSql ?? '')"
          />
        </template>
      </USlideover>
    </template>

    <SqliteCsvImport
      v-if="csvImport"
      :key="csvImport.fileName"
      :file-name="csvImport.fileName"
      :table="csvImport.table"
      :columns="csvImport.columns"
      :rows="csvImport.rows"
      @cancel="cancelCsvImport"
      @confirm="confirmCsvImport"
    />
  </div>
</template>
