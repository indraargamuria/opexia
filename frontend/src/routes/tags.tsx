import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tags')({
  component: Tags,
})

interface Tag {
  id: string
  name: string
  color: string
  erpCode: string | null
  usageCount: number
  category: string
}

const mockTags: Tag[] = [
  { id: '1', name: 'billable', color: '#17A5DC', erpCode: 'CC-BILL', usageCount: 847, category: 'Billing' },
  { id: '2', name: 'non-billable', color: '#6B7280', erpCode: 'CC-NBIL', usageCount: 124, category: 'Billing' },
  { id: '3', name: 'overtime', color: '#DC2626', erpCode: 'CC-OT', usageCount: 38, category: 'Billing' },
  { id: '4', name: 'travel', color: '#D97706', erpCode: 'CC-TRVL', usageCount: 52, category: 'Type' },
  { id: '5', name: 'meeting', color: '#8B5CF6', erpCode: null, usageCount: 189, category: 'Type' },
  { id: '6', name: 'deep-work', color: '#059669', erpCode: null, usageCount: 312, category: 'Type' },
  { id: '7', name: 'review', color: '#F59E0B', erpCode: null, usageCount: 156, category: 'Type' },
  { id: '8', name: 'documentation', color: '#3B82F6', erpCode: null, usageCount: 94, category: 'Type' },
]

function ColorDot({ color }: { color: string }) {
  return <span className="h-3 w-3 rounded-full border border-border shrink-0" style={{ backgroundColor: color }} />
}

function Tags() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Tags</h1>
        <button className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
          New Tag
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Tags</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{mockTags.length}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Most Used</p>
            <p className="text-2xl font-semibold text-brand mt-1">billable</p>
            <p className="text-xs text-muted mt-1">847 entries</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">ERP Mapped</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">3</p>
            <p className="text-xs text-muted mt-1">of {mockTags.length} tags</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Categories</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">2</p>
            <p className="text-xs text-muted mt-1">Billing, Type</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-light-bg border-b border-border">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Tag</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Category</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">ERP Code</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Usage</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockTags.map((tag) => (
              <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <ColorDot color={tag.color} />
                    <span className="font-medium text-dark-text">{tag.name}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs font-medium">
                    {tag.category}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  {tag.erpCode ? (
                    <span className="font-mono text-xs text-muted">{tag.erpCode}</span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-sm text-dark-text">{tag.usageCount.toLocaleString()}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <button className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-highlight text-muted-foreground transition-colors duration-75" title="Edit">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                    </button>
                    <button className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-highlight text-muted-foreground transition-colors duration-75" title="Delete">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
