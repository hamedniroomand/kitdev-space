import initSqlJs, { type Database } from 'sql.js'
import type { ColumnInfo, TableInfo, WorkerMessage, WorkerResponse } from '~/types/sqlite'
import { buildUpdateQuery } from '~/types/sqlite'
import { getSampleSqlScript } from '~/utils/sqlite/sample-data'

let db: Database | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

async function getSqlEngine() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm'
    })
  }
  return SQL
}

function introspectSchema(database: Database): TableInfo[] {
  const tablesResult = database.exec(
    'SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name;'
  )

  if (!tablesResult || tablesResult.length === 0 || !tablesResult[0]?.values) {
    return []
  }

  const tableNames = tablesResult[0].values.map(row => String(row[0]))
  const tables: TableInfo[] = []

  for (const name of tableNames) {
    let rowCount = 0
    try {
      const countRes = database.exec(`SELECT COUNT(*) FROM "${name}";`)
      if (countRes.length > 0 && countRes[0]?.values?.[0]?.[0] !== undefined) {
        rowCount = Number(countRes[0].values[0][0])
      }
    } catch {
      rowCount = 0
    }

    const columns: ColumnInfo[] = []
    try {
      const infoRes = database.exec(`PRAGMA table_info("${name}");`)
      if (infoRes.length > 0 && infoRes[0]?.values) {
        for (const row of infoRes[0].values) {
          columns.push({
            cid: Number(row[0]),
            name: String(row[1]),
            type: String(row[2]),
            notnull: Number(row[3]),
            dflt_value: row[4],
            pk: Number(row[5])
          })
        }
      }
    } catch {
      // Keep empty columns array on pragma error
    }

    let hasRowId = true
    try {
      database.exec(`SELECT rowid FROM "${name}" LIMIT 1;`)
    } catch {
      hasRowId = false
    }

    tables.push({ name, rowCount, columns, hasRowId })
  }

  return tables
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    const engine = await getSqlEngine()

    switch (message.type) {
      case 'INIT_DB': {
        if (db) {
          db.close()
        }
        db = message.bytes ? new engine.Database(message.bytes) : new engine.Database()
        const tables = introspectSchema(db)
        const sizeBytes = message.bytes ? message.bytes.byteLength : 0
        const response: WorkerResponse = { type: 'DB_READY', tables, sizeBytes }
        self.postMessage(response)
        break
      }

      case 'LOAD_SAMPLE': {
        if (db) {
          db.close()
        }
        db = new engine.Database()
        db.run(getSampleSqlScript())
        const tables = introspectSchema(db)
        const exported = db.export()
        const response: WorkerResponse = { type: 'DB_READY', tables, sizeBytes: exported.byteLength }
        self.postMessage(response)
        break
      }

      case 'EXECUTE_QUERY': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }

        const start = performance.now()
        const results = db.exec(message.sql)
        const durationMs = Math.round(performance.now() - start)

        if (results.length === 0) {
          const response: WorkerResponse = {
            type: 'QUERY_RESULT',
            result: { columns: [], rows: [], rowCount: 0, durationMs }
          }
          self.postMessage(response)
          break
        }

        const first = results[0]
        const columns = first?.columns ?? []
        const allRows = first?.values ?? []
        const totalRows = allRows.length
        const slicedRows = allRows.slice(0, 1000)

        const response: WorkerResponse = {
          type: 'QUERY_RESULT',
          result: { columns, rows: slicedRows, rowCount: totalRows, durationMs }
        }
        self.postMessage(response)
        break
      }

      case 'UPDATE_CELL': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }

        const query = buildUpdateQuery(message.table, message.column)
        db.run(query, { ':val': message.value, ':rowid': message.rowid })

        const response: WorkerResponse = {
          type: 'UPDATE_SUCCESS',
          table: message.table,
          rowid: message.rowid,
          column: message.column,
          value: message.value
        }
        self.postMessage(response)
        break
      }

      case 'EXPORT_DB': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        const bytes = db.export()
        const response: WorkerResponse = { type: 'EXPORT_RESULT', bytes }
        self.postMessage(response, [bytes.buffer])
        break
      }
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Database error occurred.'
    const response: WorkerResponse = { type: 'ERROR', message: messageText }
    self.postMessage(response)
  }
}
