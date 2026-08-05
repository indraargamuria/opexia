import * as XLSX from 'xlsx'

export const EXPORT_HEADERS = [
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
] as const

export function exportStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'invoiced':
      return 'Invoiced'
    case 'rejected':
      return 'Rejected'
    case 'running':
      return 'Running'
    default:
      return 'Pending'
  }
}

export interface ExportEntryInput {
  date: Date
  worker: string
  client: string
  project: string
  description: string | null | undefined
  tags: string[]
  durationMinutes: number | null
  rate: number | null | undefined
  amount: number
  status: string
}

export function toExportRow(input: ExportEntryInput): (string | number)[] {
  const durationHours = Math.round(((input.durationMinutes ?? 0) / 60) * 100) / 100
  return [
    input.date.toISOString().slice(0, 10),
    input.worker,
    input.client,
    input.project,
    input.description ?? '',
    input.tags.join('; '),
    durationHours,
    input.rate ?? 0,
    input.amount,
    exportStatusLabel(input.status),
  ]
}

export function buildExportWorkbook(rows: (string | number)[][]): XLSX.WorkBook {
  const data = [[...EXPORT_HEADERS] as string[], ...rows]
  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 24 }, { wch: 40 }, { wch: 24 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
  ]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Time Entries')
  return book
}

export function writeXlsxBuffer(rows: (string | number)[][]): Uint8Array {
  const book = buildExportWorkbook(rows)
  return XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as Uint8Array
}

export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvLine(row: (string | number)[]): string {
  return row.map((cell) => csvEscape(String(cell))).join(',')
}

export function buildExportCsv(rows: (string | number)[][]): string {
  const lines = [[...EXPORT_HEADERS] as string[], ...rows].map(csvLine)
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

export function createCsvStream(rows: (string | number)[][]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const lines = [[...EXPORT_HEADERS] as string[], ...rows].map(csvLine)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('\uFEFF'))
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\r\n`))
      }
      controller.close()
    },
  })
}
