import type { QueryResult, SqlValue, TableInfo, WorkerResponse } from '~/types/sqlite'
import type { TableQueryState, TableSort } from '~/utils/sqlite/query-builder'
import { rowsToCsv, rowsToJson } from '~/utils/sqlite/export'
import { buildTableQuery, initialTableQuery, isTextColumn, tableSnippets } from '~/utils/sqlite/query-builder'

const HISTORY_LIMIT = 20

export function useSqliteStudio() {
  const { downloadBlob, downloadText } = useDownload()
  const { reportInput } = useToolInput()
  const isReady = ref(false)
  const isExecuting = ref(false)
  const error = ref<string | null>(null)
  const tables = ref<TableInfo[]>([])
  const activeTable = ref<string | null>(null)
  const activeQuery = ref<string>('SELECT * FROM products LIMIT 100;')
  const queryResult = shallowRef<QueryResult | null>(null)
  const databaseName = ref<string>('database.sqlite')
  const databaseSizeBytes = ref<number>(0)

  /** The state of the query bar for the active table. */
  const tableQuery = ref<TableQueryState | null>(null)
  /** The row count of the active table after the search and the filters. */
  const tableTotal = ref<number | null>(null)
  /** True when the editor holds a query that the query bar did not build. */
  const isCustomQuery = ref(false)
  const selectedRowid = ref<number | null>(null)
  const schemaSql = ref<string | null>(null)
  const schemaOpen = ref(false)
  /** The queries that the user ran, newest first. Kept for the browser tab only. */
  const history = useSessionStorage<string[]>('kitdev:sqlite:history', [])

  let worker: Worker | null = null
  let generatedSql = ''

  const activeTableInfo = computed(() => tables.value.find(table => table.name === activeTable.value) ?? null)
  const textColumns = computed(() => activeTableInfo.value?.columns.filter(isTextColumn).map(column => column.name) ?? [])
  const snippets = computed(() => (activeTableInfo.value ? tableSnippets(activeTableInfo.value.name, activeTableInfo.value.columns) : []))

  function post(message: Parameters<Worker['postMessage']>[0]) {
    if (!worker) {
      return
    }
    isExecuting.value = true
    error.value = null
    worker.postMessage(message)
  }

  function initWorker() {
    if (worker || !import.meta.client) {
      return
    }

    worker = new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      isExecuting.value = false

      switch (response.type) {
        case 'DB_READY':
          isReady.value = true
          tables.value = response.tables
          databaseSizeBytes.value = response.sizeBytes
          error.value = null
          if (response.tables.length > 0) {
            selectTable(response.tables[0]!.name)
          }
          break

        case 'QUERY_RESULT':
          queryResult.value = response.result
          tableTotal.value = response.total ?? null
          if (response.tables) {
            tables.value = response.tables
            if (activeTable.value && !response.tables.some(t => t.name === activeTable.value)) {
              activeTable.value = response.tables[0]?.name ?? null
            }
          }
          error.value = null
          break

        case 'UPDATE_SUCCESS':
          refreshRows()
          break

        case 'MUTATION_SUCCESS': {
          const table = tables.value.find(item => item.name === response.table)
          if (table) {
            table.rowCount = response.rowCount
          }
          selectedRowid.value = null
          refreshRows()
          break
        }

        case 'SCHEMA_RESULT':
          schemaSql.value = response.sql || '-- The database holds no CREATE statement for this table.'
          schemaOpen.value = true
          break

        case 'EXPORT_RESULT': {
          const blob = new Blob([response.bytes.slice().buffer], { type: 'application/x-sqlite3' })
          downloadBlob(databaseName.value || 'database.sqlite', blob)
          break
        }

        case 'ERROR':
          error.value = response.message
          break
      }
    }
  }

  async function loadDatabaseFile(file: File) {
    initWorker()
    databaseName.value = file.name
    isExecuting.value = true
    error.value = null

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      worker?.postMessage({ type: 'INIT_DB', bytes })
    }
    catch {
      error.value = 'Failed to read file.'
      isExecuting.value = false
    }
  }

  function createBlankDatabase() {
    initWorker()
    databaseName.value = 'blank.sqlite'
    post({ type: 'INIT_DB' })
  }

  function loadSampleDatabase() {
    reportInput('sample')
    initWorker()
    databaseName.value = 'ecommerce-sample.sqlite'
    post({ type: 'LOAD_SAMPLE' })
  }

  function pushHistory(sql: string) {
    const clean = sql.trim()
    if (!clean) {
      return
    }
    history.value = [clean, ...history.value.filter(item => item !== clean)].slice(0, HISTORY_LIMIT)
  }

  /** Runs the SQL in the editor. A query that the bar did not build turns the filters off. */
  function executeQuery(sql: string) {
    if (!sql.trim()) {
      return
    }
    activeQuery.value = sql
    isCustomQuery.value = sql.trim() !== generatedSql.trim()
    selectedRowid.value = null
    pushHistory(sql)
    if (isCustomQuery.value) {
      tableTotal.value = null
      post({ type: 'EXECUTE_QUERY', sql })
    }
    else {
      runTableQuery()
    }
  }

  /** Builds the page query from the query bar and runs it with its count. */
  function runTableQuery() {
    const state = tableQuery.value
    const info = activeTableInfo.value
    if (!state || !info) {
      return
    }
    const { sql, countSql } = buildTableQuery(state, { hasRowId: info.hasRowId, textColumns: textColumns.value })
    generatedSql = sql
    activeQuery.value = sql
    isCustomQuery.value = false
    post({ type: 'EXECUTE_QUERY', sql, countSql })
  }

  function refreshRows() {
    if (isCustomQuery.value) {
      post({ type: 'EXECUTE_QUERY', sql: activeQuery.value })
    }
    else {
      runTableQuery()
    }
  }

  function selectTable(tableName: string) {
    activeTable.value = tableName
    tableQuery.value = initialTableQuery(tableName, tableQuery.value?.limit ?? 100)
    selectedRowid.value = null
    runTableQuery()
  }

  /** Changes the query bar. A change other than the offset starts again from the first page. */
  function updateTableQuery(patch: Partial<TableQueryState>) {
    if (!tableQuery.value) {
      return
    }
    const offsetOnly = Object.keys(patch).every(key => key === 'offset')
    tableQuery.value = { ...tableQuery.value, ...patch, ...(offsetOnly ? {} : { offset: 0 }) }
    selectedRowid.value = null
    runTableQuery()
  }

  function toggleSort(column: string) {
    const current: TableSort | null = tableQuery.value?.sort ?? null
    const direction = current?.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    updateTableQuery({ sort: { column, direction } })
  }

  function backToTable() {
    if (activeTable.value) {
      selectTable(activeTable.value)
    }
  }

  function updateCell(table: string, rowid: number, column: string, value: SqlValue) {
    post({ type: 'UPDATE_CELL', table, rowid, column, value })
  }

  function insertRow() {
    if (activeTable.value) {
      post({ type: 'INSERT_ROW', table: activeTable.value })
    }
  }

  function duplicateRow() {
    if (activeTable.value && selectedRowid.value !== null) {
      post({ type: 'DUPLICATE_ROW', table: activeTable.value, rowid: selectedRowid.value })
    }
  }

  function deleteRow() {
    if (activeTable.value && selectedRowid.value !== null) {
      post({ type: 'DELETE_ROW', table: activeTable.value, rowid: selectedRowid.value })
    }
  }

  function showSchema() {
    if (activeTable.value) {
      post({ type: 'TABLE_SCHEMA', table: activeTable.value })
    }
  }

  function selectRow(rowid: number | null) {
    selectedRowid.value = selectedRowid.value === rowid ? null : rowid
  }

  function downloadDatabase() {
    if (worker) {
      worker.postMessage({ type: 'EXPORT_DB' })
    }
  }

  function exportCsv() {
    if (!queryResult.value) {
      return
    }
    const csv = rowsToCsv(queryResult.value.columns, queryResult.value.rows)
    downloadText(`${activeTable.value || 'query'}.csv`, csv, 'text/csv')
  }

  function exportJson() {
    if (!queryResult.value) {
      return
    }
    const json = rowsToJson(queryResult.value.columns, queryResult.value.rows)
    downloadText(`${activeTable.value || 'query'}.json`, json, 'application/json')
  }

  function closeDatabase() {
    worker?.terminate()
    worker = null
    isReady.value = false
    tables.value = []
    activeTable.value = null
    tableQuery.value = null
    tableTotal.value = null
    isCustomQuery.value = false
    selectedRowid.value = null
    schemaSql.value = null
    queryResult.value = null
    error.value = null
  }

  return {
    isReady,
    isExecuting,
    error,
    tables,
    activeTable,
    activeTableInfo,
    activeQuery,
    queryResult,
    databaseName,
    databaseSizeBytes,
    tableQuery,
    tableTotal,
    textColumns,
    isCustomQuery,
    selectedRowid,
    schemaSql,
    schemaOpen,
    history,
    snippets,
    loadDatabaseFile,
    createBlankDatabase,
    loadSampleDatabase,
    executeQuery,
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
  }
}
