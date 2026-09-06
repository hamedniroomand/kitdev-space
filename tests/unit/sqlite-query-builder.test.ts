import { describe, expect, it } from 'vitest'
import type { ColumnInfo } from '~/types/sqlite'
import {
  buildTableQuery,
  filterLabel,
  initialTableQuery,
  isTextColumn,
  quoteIdentifier,
  sqlLiteral,
  tableSnippets
} from '~/utils/sqlite/query-builder'

function column(name: string, type: string, pk = 0): ColumnInfo {
  return { cid: 0, name, type, notnull: 0, dflt_value: null, pk }
}

describe('query builder', () => {
  it('quotes identifiers and literals safely', () => {
    expect(quoteIdentifier('my "table"')).toBe('"my ""table"""')
    expect(sqlLiteral('30')).toBe('30')
    expect(sqlLiteral('-1.5')).toBe('-1.5')
    expect(sqlLiteral('O\'Brien')).toBe('\'O\'\'Brien\'')
    expect(sqlLiteral('')).toBe('\'\'')
  })

  it('knows which columns hold text', () => {
    expect(isTextColumn(column('name', 'TEXT'))).toBe(true)
    expect(isTextColumn(column('code', 'varchar(20)'))).toBe(true)
    expect(isTextColumn(column('note', ''))).toBe(true)
    expect(isTextColumn(column('price', 'REAL'))).toBe(false)
  })

  it('selects the rowid under an alias with a limit and an offset', () => {
    const { sql, countSql } = buildTableQuery(initialTableQuery('products'), { hasRowId: true, textColumns: ['name'] })
    expect(sql).toBe('SELECT rowid AS "_rowid_", *\nFROM "products"\nLIMIT 100 OFFSET 0;')
    expect(countSql).toBe('SELECT COUNT(*) FROM "products";')
  })

  it('skips the rowid for a WITHOUT ROWID table', () => {
    const { sql } = buildTableQuery(initialTableQuery('t'), { hasRowId: false, textColumns: [] })
    expect(sql.startsWith('SELECT *\nFROM "t"')).toBe(true)
  })

  it('searches every text column and escapes LIKE wildcards', () => {
    const state = { ...initialTableQuery('products'), search: '50%_off' }
    const { sql, countSql } = buildTableQuery(state, { hasRowId: true, textColumns: ['name', 'sku'] })
    expect(sql).toContain('WHERE ("name" LIKE \'%50\\%\\_off%\' ESCAPE \'\\\' OR "sku" LIKE \'%50\\%\\_off%\' ESCAPE \'\\\')')
    expect(countSql).toContain('WHERE ("name" LIKE')
  })

  it('joins filters with AND, sorts, and pages', () => {
    const state = {
      ...initialTableQuery('products'),
      filters: [
        { column: 'price', operator: 'gt' as const, value: '30' },
        { column: 'name', operator: 'contains' as const, value: 'lamp' },
        { column: 'category_id', operator: 'null' as const, value: '' }
      ],
      sort: { column: 'price', direction: 'desc' as const },
      limit: 50,
      offset: 100
    }
    const { sql } = buildTableQuery(state, { hasRowId: true, textColumns: ['name'] })
    expect(sql).toBe([
      'SELECT rowid AS "_rowid_", *',
      'FROM "products"',
      'WHERE "price" > 30 AND "name" LIKE \'%lamp%\' ESCAPE \'\\\' AND "category_id" IS NULL',
      'ORDER BY "price" DESC',
      'LIMIT 50 OFFSET 100;'
    ].join('\n'))
  })

  it('labels a filter for its chip', () => {
    expect(filterLabel({ column: 'price', operator: 'gt', value: '30' })).toBe('price > "30"')
    expect(filterLabel({ column: 'email', operator: 'null', value: '' })).toBe('email is null')
  })

  it('builds snippets from the first text column', () => {
    const snippets = tableSnippets('products', [column('id', 'INTEGER', 1), column('name', 'TEXT'), column('price', 'REAL')])
    expect(snippets.map(s => s.label)).toEqual(['Count the rows', 'Distinct values of name', 'Count by name'])
    expect(snippets[2]!.sql).toContain('GROUP BY "name"')
  })
})
