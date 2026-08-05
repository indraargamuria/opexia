import { describe, it, expect } from 'vitest'
import XLSX from 'xlsx'
import {
  EXPORT_HEADERS,
  toExportRow,
  exportStatusLabel,
  csvEscape,
  buildExportCsv,
  writeXlsxBuffer,
} from '../src/lib/exportRows.ts'

describe('EXPORT_HEADERS', () => {
  it('matches the PRD 3.3.2 ERP-ready schema', () => {
    expect([...EXPORT_HEADERS]).toEqual([
      'Date',
      'Worker',
      'Client',
      'Project',
      'Task Description',
      'Tags',
      'Duration (h)',
      'Rate',
      'Amount',
      'Status',
    ])
  })
})

describe('toExportRow', () => {
  it('maps entry fields to the ERP columns', () => {
    const row = toExportRow({
      date: new Date(2026, 6, 15, 9),
      worker: 'Bob',
      client: 'Acme Corp',
      project: 'Alpha',
      description: 'Fix auth flow',
      tags: ['Development', 'Billing'],
      durationMinutes: 90,
      rate: 100,
      amount: 150,
      status: 'approved',
    })
    expect(row).toEqual([
      '2026-07-15',
      'Bob',
      'Acme Corp',
      'Alpha',
      'Fix auth flow',
      'Development; Billing',
      1.5,
      100,
      150,
      'Approved',
    ])
  })

  it('handles missing description and tags', () => {
    const row = toExportRow({
      date: new Date(2026, 6, 15, 9),
      worker: 'Bob',
      client: 'Acme',
      project: 'Alpha',
      description: null,
      tags: [],
      durationMinutes: null,
      rate: null,
      amount: 0,
      status: 'pending',
    })
    expect(row[4]).toBe('')
    expect(row[5]).toBe('')
    expect(row[6]).toBe(0)
    expect(row[7]).toBe(0)
    expect(row[9]).toBe('Pending')
  })
})

describe('exportStatusLabel', () => {
  it('maps statuses to friendly labels', () => {
    expect(exportStatusLabel('approved')).toBe('Approved')
    expect(exportStatusLabel('pending')).toBe('Pending')
    expect(exportStatusLabel('invoiced')).toBe('Invoiced')
    expect(exportStatusLabel('rejected')).toBe('Rejected')
    expect(exportStatusLabel('running')).toBe('Running')
  })
})

describe('csvEscape', () => {
  it('leaves simple values unquoted', () => {
    expect(csvEscape('Alpha')).toBe('Alpha')
    expect(csvEscape('1.5')).toBe('1.5')
  })

  it('quotes values containing commas, quotes, or newlines (RFC 4180)', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildExportCsv', () => {
  it('emits BOM, CRLF line endings, and header first', () => {
    const csv = buildExportCsv([toExportRow({
      date: new Date(2026, 6, 15, 9),
      worker: 'Bob',
      client: 'Acme Corp',
      project: 'Alpha',
      description: null,
      tags: [],
      durationMinutes: 60,
      rate: 100,
      amount: 100,
      status: 'approved',
    })])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('\r\n')
    expect(csv.replace('\uFEFF', '').split('\r\n')[0]).toBe(EXPORT_HEADERS.join(','))
  })
})

describe('writeXlsxBuffer', () => {
  it('produces a parseable workbook with the expected sheet and columns', () => {
    const buffer = writeXlsxBuffer([toExportRow({
      date: new Date(2026, 6, 15, 9),
      worker: 'Bob',
      client: 'Acme Corp',
      project: 'Alpha',
      description: 'Fix auth flow',
      tags: ['Development'],
      durationMinutes: 90,
      rate: 100,
      amount: 150,
      status: 'approved',
    })])
    const wb = XLSX.read(buffer)
    expect(wb.SheetNames).toEqual(['Time Entries'])
    const sheet = wb.Sheets['Time Entries']
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })
    expect(rows[0]).toEqual([...EXPORT_HEADERS])
    expect(rows[1]).toEqual([
      '2026-07-15',
      'Bob',
      'Acme Corp',
      'Alpha',
      'Fix auth flow',
      'Development',
      1.5,
      100,
      150,
      'Approved',
    ])
  })
})
