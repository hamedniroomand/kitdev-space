import { describe, expect, it } from 'vitest'
import {
  formatMarkdownTable,
  parseDelimitedTable,
  parseMarkdownTable,
  parseTableInput,
} from '#shared/utils/dev/markdown-table'

describe('formatMarkdownTable', () => {
  it('formats a 2x2 markdown table with alignment', () => {
    const table = formatMarkdownTable({
      headers: ['Name', 'Price'],
      alignments: ['left', 'right'],
      rows: [
        ['Apple', '$1.00'],
        ['Banana', '$0.50'],
      ],
    })

    expect(table).toContain('| Name   | Price |')
    expect(table).toContain('| :----- | ----: |')
    expect(table).toContain('| Apple  | $1.00 |')
    expect(table).toContain('| Banana | $0.50 |')
  })

  it('handles empty rows gracefully', () => {
    const table = formatMarkdownTable({
      headers: ['Col A', 'Col B'],
      rows: [],
    })
    expect(table).toContain('| Col A | Col B |')
  })

  it('escapes pipes in cells and pads correctly according to visual width', () => {
    const table = formatMarkdownTable({
      headers: ['Type', 'Formula'],
      rows: [
        ['Bitwise', 'a | b'],
        ['Escaped', 'a \\| b'],
      ],
    })
    expect(table).toContain('| Bitwise | a \\| b  |')
    expect(table).toContain('| Escaped | a \\| b  |')
  })

  it('exports a newline inside a cell as a <br> tag', () => {
    const table = formatMarkdownTable({
      headers: ['Step', 'Detail'],
      rows: [['Install', 'run bun install\nthen bun dev']],
    })

    expect(table).toContain('| Install | run bun install<br>then bun dev |')
    expect(table.split('\n')).toHaveLength(3)
  })
})

describe('parseMarkdownTable', () => {
  it('parses a table with leading and trailing pipes', () => {
    const parsed = parseMarkdownTable([
      '| Name | Price |',
      '| --- | --- |',
      '| Apple | $1.00 |',
    ].join('\n'))

    expect(parsed.headers).toEqual(['Name', 'Price'])
    expect(parsed.rows).toEqual([['Apple', '$1.00']])
  })

  it('parses a table without leading and trailing pipes', () => {
    const parsed = parseMarkdownTable([
      'Name | Price',
      '--- | ---',
      'Apple | $1.00',
    ].join('\n'))

    expect(parsed.headers).toEqual(['Name', 'Price'])
    expect(parsed.rows).toEqual([['Apple', '$1.00']])
  })

  it('reads every alignment marker', () => {
    const parsed = parseMarkdownTable([
      '| A | B | C | D |',
      '| :--- | :---: | ---: | --- |',
      '| 1 | 2 | 3 | 4 |',
    ].join('\n'))

    expect(parsed.alignments).toEqual(['left', 'center', 'right', 'left'])
  })

  it('pads a row with fewer cells than the header', () => {
    const parsed = parseMarkdownTable([
      '| A | B | C |',
      '| --- | --- | --- |',
      '| 1 | 2 |',
    ].join('\n'))

    expect(parsed.rows).toEqual([['1', '2', '']])
  })

  it('drops the extra cells of a row with more cells than the header', () => {
    const parsed = parseMarkdownTable([
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 | 3 | 4 |',
    ].join('\n'))

    expect(parsed.rows).toEqual([['1', '2']])
  })

  it('turns an escaped pipe inside a cell back into a pipe', () => {
    const parsed = parseMarkdownTable([
      '| Type | Formula |',
      '| --- | --- |',
      '| Bitwise | a \\| b |',
    ].join('\n'))

    expect(parsed.rows).toEqual([['Bitwise', 'a | b']])
  })

  it('turns <br>, <br/>, and <br /> back into a newline', () => {
    const parsed = parseMarkdownTable([
      '| Tag | Text |',
      '| --- | --- |',
      '| plain | one<br>two |',
      '| closed | one<br/>two |',
      '| spaced | one<br />two |',
    ].join('\n'))

    expect(parsed.rows).toEqual([
      ['plain', 'one\ntwo'],
      ['closed', 'one\ntwo'],
      ['spaced', 'one\ntwo'],
    ])
  })

  it('throws a clear error for input that is not a table', () => {
    expect(() => parseMarkdownTable('this is not a table at all')).toThrowError(/No Markdown table found/)
    expect(() => parseMarkdownTable('')).toThrowError(/No Markdown table found/)
    expect(() => parseMarkdownTable('| A | B |\nsecond line is wrong')).toThrowError(/not a separator row/)
  })

  it('round trips a table through parse and format', () => {
    const input = [
      'Name | Price',
      '--- | ---:',
      'Apple | $1.00',
    ].join('\n')

    const normalized = [
      '| Name  | Price |',
      '| :---- | ----: |',
      '| Apple | $1.00 |',
    ].join('\n')

    expect(formatMarkdownTable(parseMarkdownTable(input))).toBe(normalized)
    expect(formatMarkdownTable(parseMarkdownTable(normalized))).toBe(normalized)
  })

  it('round trips a cell with a line break and a pipe', () => {
    const normalized = [
      '| Step    | Detail     |',
      '| :------ | :--------- |',
      '| Install | one<br>two |',
      '| Filter  | a \\| b     |',
    ].join('\n')

    expect(formatMarkdownTable(parseMarkdownTable(normalized))).toBe(normalized)
  })
})

describe('parseDelimitedTable', () => {
  it('parses tab-delimited spreadsheet text', () => {
    const parsed = parseDelimitedTable('City\tPop\nParis\t2161000\nTokyo\t13960000')

    expect(parsed.headers).toEqual(['City', 'Pop'])
    expect(parsed.rows).toEqual([['Paris', '2161000'], ['Tokyo', '13960000']])
  })

  it('parses a quoted field that holds a comma or a newline', () => {
    const parsed = parseDelimitedTable('name,note\n"Ada, Lovelace","first\nsecond"')

    expect(parsed.headers).toEqual(['name', 'note'])
    expect(parsed.rows).toEqual([['Ada, Lovelace', 'first\nsecond']])
  })
})

describe('parseTableInput', () => {
  it('picks the markdown parser for a markdown table', () => {
    expect(parseTableInput('| A | B |\n| --- | --- |\n| 1 | 2 |').rows).toEqual([['1', '2']])
  })

  it('picks the delimited parser for spreadsheet text', () => {
    expect(parseTableInput('A,B\n1,2').rows).toEqual([['1', '2']])
  })
})
