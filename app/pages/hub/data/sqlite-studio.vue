<script setup lang="ts">
useToolSeo('sqlite-studio')

const {
  isReady,
  isExecuting,
  error,
  tables,
  activeTable,
  activeQuery,
  queryResult,
  databaseName,
  databaseSizeBytes,
  loadDatabaseFile,
  createBlankDatabase,
  loadSampleDatabase,
  executeQuery,
  selectTable,
  updateCell,
  downloadDatabase,
  exportCsv,
  exportJson,
  closeDatabase
} = useSqliteStudio()
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
          @load-file="loadDatabaseFile"
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
                rows. Write a query and run it. Then download the database to keep your changes,
                because the browser does not save the file for you.
              </p>
            </div>
            <RelatedTools
              class="mt-8"
              :items="[
                { label: 'Table Viewer', to: '/hub/data/table-viewer' },
                { label: 'SQL Formatter', to: '/hub/data/sql-formatter' },
                { label: 'CSV ↔ JSON', to: '/hub/data/converters/csv-json' }
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
        @download-db="downloadDatabase"
        @export-csv="exportCsv"
        @export-json="exportJson"
        @close="closeDatabase"
      />

      <div class="flex-1 flex overflow-hidden">
        <SqliteSidebar
          :tables="tables"
          :active-table="activeTable"
          @select-table="selectTable"
        />

        <main class="flex-1 flex flex-col overflow-hidden">
          <SqliteEditor
            v-model="activeQuery"
            :executing="isExecuting"
            :error="error"
            :duration-ms="queryResult?.durationMs"
            :row-count="queryResult?.rowCount"
            @run="executeQuery"
          />

          <SqliteGrid
            :result="queryResult"
            :active-table="activeTable"
            :can-edit="true"
            @update-cell="updateCell($event.table, $event.rowid, $event.column, $event.value)"
          />
        </main>
      </div>
    </template>
  </div>
</template>
